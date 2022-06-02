import { SQSEvent } from 'aws-lambda';
import { AccountMember } from '../models/account-member';
import SQS, { SendMessageRequest } from 'aws-sdk/clients/sqs';
import { getKillBillCredentials } from '../helpers/secretsmanager';
import { KBSecrets } from '../models/kb-secrets';
import KillBillClient from '../helpers/killbillclient';
import { Account, Subscription } from 'killbill';
import axios, { AxiosError, AxiosResponse } from 'axios';

// Configure the region and version
const sqs = new SQS({ region: 'us-east-1' });
const queueUrl = process.env.OUTBOUND_QUEUE || 'https://sqs.us-east-1.amazonaws.com/773231913983/sqs-lambda-queue';

export const lambdaHandler = async (event: SQSEvent): Promise<void> => {
    try {
        console.log(event);
        const accountMember: AccountMember = JSON.parse(event.Records[0].body);

        // const member: AccountMember | undefined = accountMembership.members.find((member) => member.authority === true);

        if (accountMember) {
            await requestKillBill(accountMember);
        }
    } catch (err) {
        console.log('first catch', err);
    }
};

async function requestKillBill(memberDetail: AccountMember) {
    const killBillCredentials: KBSecrets = await getKillBillCredentials();
    console.log(killBillCredentials);

    const killbillObject = new KillBillClient(killBillCredentials);
    console.log(killbillObject);
    let isAccountExist = false,
        isAccountCreated = false,
        isSubscriptionExist = false;
    let accountDetail, subscriptionDetail;
    try {
        // check if account exists
        accountDetail = await killbillObject.getAccountByKey(memberDetail.accountNumber);
        isAccountExist = true;

        // check if subscription exists
        subscriptionDetail = await killbillObject.getSubscriptionByKey(memberDetail.accountNumber);
        isSubscriptionExist = true;

        // Push Data to Outbound Queue
        await pushAccountInfoToOutboundQueue(accountDetail.data, subscriptionDetail.data);
    } catch (err: any) {
        console.log('Account error', err.response);
    }
    console.log('Account Detail', accountDetail);
    console.log('Account Status', isAccountExist);
    console.log('subscription Status', isSubscriptionExist);
    console.log('subscription Detail', subscriptionDetail);

    // If account doesn't exist create a new account
    if (!isAccountExist) {
        const accountRequest: Account = { externalKey: memberDetail.accountNumber };
        const member = memberDetail.members.find((member) => member.authority === true);
        if (member) {
            accountRequest.name = `${member.firstName} ${member.lastName}`;
        }
        try {
            const createdAccountDetail = await killbillObject.createAccount(accountRequest);
            console.log(createdAccountDetail);
            isAccountCreated = true;
            isAccountExist = true;
            accountDetail = await killbillObject.getAccountByKey(memberDetail.accountNumber);

            // Create KB Subscription
            // const subscriptionDetail = await createKBSubscription(killbillObject, memberDetail, accountDetail.data);

            // isSubscriptionExist = true;
            // console.log(subscriptionDetail);

            // Push Data to Outbound Queue
            // await pushAccountInfoToOutboundQueue(accountDetail.data, subscriptionDetail.data);
        } catch (err) {
            let message = 'Internal server error';
            if (err instanceof AxiosError) {
                message = err.response?.data.message || 'Internal server error';
            } else if (err instanceof Error) {
                message = err.message;
            }
            // Push data to error queue
            console.log('Subscription Creation Error', message);
        }
    }

    // If Account exists/created, but subscription is not created
    if (isAccountExist && accountDetail && !isSubscriptionExist) {
        try {
            // Create KB Subscription
            const subscriptionDetail = await createKBSubscription(killbillObject, memberDetail, accountDetail.data);

            isSubscriptionExist = true;
            console.log(subscriptionDetail);

            // Push Data to Outbound Queue
            await pushAccountInfoToOutboundQueue(accountDetail.data, subscriptionDetail.data);
        } catch (err) {
            console.log(err);
            let message = 'Internal server error';
            if (err instanceof AxiosError) {
                message = err.response?.data.message || 'Internal server error';
            } else if (err instanceof Error) {
                message = err.message;
            }
            // Push data to error queue
            console.log('Subscription Creation Error', message);
        }
    }

    return false;

    // console.log(killBillRequestObject, headers, endpoint);
    // await axios
    //     .post(endpoint, killBillRequestObject, {
    //         headers: headers,
    //     })
    //     .then(async (response: AxiosResponse) => {
    //         if (response.status === 201) {
    //             // console.log('kill bill response', response);
    //             // console.log(response.headers.location);
    //             const accountData: AxiosResponse<KillBillAccount> = await axios.get(response.headers.location, {
    //                 headers: headers,
    //             });
    //             // console.log('accountData', accountData);
    //             if (accountData.status === 200) {
    //                 await pushAccountInfoToOutboundQueue(accountData.data);
    //             }
    //         }
    //     })
    //     .catch(async (reason: AxiosError<{ message: string }>) => {
    //         console.log(reason);
    //         console.log('main catch', reason.response?.data.message);
    //     });
}

async function createKBSubscription(killbillObject: KillBillClient, memberDetail: AccountMember, kbAccount: Account) {
    // Hit Catalog API to get Plan Object
    const catalogResponse = await callCatalogApi(memberDetail, kbAccount);
    if (!catalogResponse) {
        throw new Error('Unable to get plan from Catalog API.');
    }
    console.log(catalogResponse);
    // Create Subscription for this Account
    const subsRequest = {
        accountId: kbAccount.accountId,
        externalKey: memberDetail.accountNumber,
        planName: catalogResponse.products[0].plans[0].name,
    };
    return await killbillObject.createSubscription(subsRequest);
}

/**
 * Call Catalog API to get plan name
 */
async function callCatalogApi(memberDetail: AccountMember, kbAccount: Account) {
    console.log('Endpoint', process.env.API_ENDPOINT);
    // implement later
    // const catalogEndpoint =
    //     process.env.API_ENDPOINT || 'https://7f7jv8azlh.execute-api.us-east-1.amazonaws.com/Prod/catalog';
    const catalogEndpoint = 'https://7f7jv8azlh.execute-api.us-east-1.amazonaws.com/Prod/catalog';
    return await axios
        .post(catalogEndpoint, {
            accountId: kbAccount.accountId,
            asfObject: memberDetail,
        })
        .then((response: AxiosResponse) => {
            console.log(response);
            if (response.status === 200) {
                return response.data;
            }
        })
        .catch(async (reason: AxiosError<{ message: string }>) => {
            console.log('callCatalogApi catch', reason);
            return false;
        });
}

/**
 * Send KB Account and Subscription Data to Outbound Queue
 * @param kbAccount
 * @param subsData
 */
async function pushAccountInfoToOutboundQueue(kbAccount: Account, subsData: Subscription) {
    const outboundData = {
        accountInfo: kbAccount,
        subscriptionData: subsData,
    };
    const sqsKillBillOutData: SendMessageRequest = {
        MessageBody: JSON.stringify(outboundData),
        QueueUrl: queueUrl,
    };
    console.log(sqsKillBillOutData);
    const sendSqsMessage = await sqs.sendMessage(sqsKillBillOutData).promise();
    console.log('SQS Response:', sendSqsMessage);
}
