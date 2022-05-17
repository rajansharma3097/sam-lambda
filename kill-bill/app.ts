import { SQSEvent } from 'aws-lambda';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { AccountMember } from './models/account-member';
import { AccountMembership } from './models/account-membership';
import { KillBillRequest } from './models/kill-bill-request';
import SQS, { SendMessageRequest } from 'aws-sdk/clients/sqs';
import { KillBillAccount } from './models/killbill-account';

// Configure the region and version
const sqs = new SQS({ region: 'us-east-1' });
const queueUrl = 'https://sqs.us-east-1.amazonaws.com/773231913983/sqs-lambda-queue';

export const lambdaHandler = async (event: SQSEvent): Promise<void> => {
    try {
        console.log(event);
        const accountMembership: AccountMembership = JSON.parse(event.Records[0].body);

        const member: AccountMember | undefined = accountMembership.members.find((member) => member.authority === true);

        if (member) {
            await requestKillBill(member);
        }
    } catch (err) {
        console.log('first catch', err);
    }
};

async function requestKillBill(memberDetail: AccountMember) {
    const endpoint = 'http://44.202.247.230:8080/1.0/kb/accounts';
    const credentials = Buffer.from('admin:password').toString('base64');
    const basicAuth = 'Basic ' + credentials;

    const headers = {
        'Content-Type': 'application/json',
        'X-Killbill-ApiKey': 'ASF',
        'X-Killbill-ApiSecret': 'ASF1234',
        Accept: 'application/json',
        'X-Killbill-CreatedBy': 'ASF',
        Authorization: basicAuth,
    };

    const killBillRequestObject: KillBillRequest = {
        isMigrated: true,
        currency: 'USD',
        name: memberDetail.firstName,
        externalKey: memberDetail.accountNumber,
    };

    // console.log(killBillRequestObject, headers, endpoint);
    await axios
        .post(endpoint, killBillRequestObject, {
            headers: headers,
        })
        .then(async (response: AxiosResponse) => {
            if (response.status === 201) {
                // console.log('kill bill response', response);
                // console.log(response.headers.location);
                const accountData: AxiosResponse<KillBillAccount> = await axios.get(response.headers.location, {
                    headers: headers,
                });
                // console.log('accountData', accountData);
                if (accountData.status === 200) {
                    await pushAccountInfoToOutboundQueue(accountData.data);
                }
            }
        })
        .catch(async (reason: AxiosError<{ message: string }>) => {
            console.log(reason);
            console.log('main catch', reason.response?.data.message);
        });
}

async function pushAccountInfoToOutboundQueue(accountData: KillBillAccount | object) {
    const sqsKillBillOutData: SendMessageRequest = {
        MessageBody: JSON.stringify(accountData),
        QueueUrl: queueUrl,
    };
    console.log(sqsKillBillOutData);
    const sendSqsMessage = await sqs.sendMessage(sqsKillBillOutData).promise();
    console.log('SQS Response:', sendSqsMessage);
}
