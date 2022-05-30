import { SQSEvent } from 'aws-lambda';
import { AccountMember } from '../models/account-member';
import { AccountMembership } from '../models/account-membership';
import SQS, { SendMessageRequest } from 'aws-sdk/clients/sqs';
import { KillBillAccount } from '../models/killbill-account';
import { getKillBillCredentials } from '../helpers/secretsmanager';
import { KBSecrets } from '../models/kb-secrets';
import KillBillClient from '../helpers/killbillclient';
import { Account } from 'killbill';
import { AxiosError } from 'axios';

// Configure the region and version
const sqs = new SQS({ region: 'us-east-1' });
const queueUrl = process.env.OUTBOUND_QUEUE || 'https://sqs.us-east-1.amazonaws.com/773231913983/sqs-lambda-queue';

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
        await pushAccountInfoToOutboundQueue(accountDetail.data);
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
        try {
            const createdAccountDetail = await killbillObject.createAccount(accountRequest);
            console.log(createdAccountDetail);
            isAccountCreated = true;
            isAccountExist = true;
            accountDetail = await killbillObject.getAccountByKey(memberDetail.accountNumber);

            // Hit Catalog API to get Plan Object
            const catalogResponse = await callCatalogApi(memberDetail);
            // Create Subscription for this Account
            const subsRequest = {
                accountId: accountDetail.data.accountId,
                externalKey: memberDetail.accountNumber,
                planName: 'PLAN-2766',
                // productName: '',
                // billingPeriod: SubscriptionBillingPeriodEnum.DAILY,
                // priceList: ''
            };
            subscriptionDetail = await killbillObject.createSubscription(subsRequest);
            isSubscriptionExist = true;
            // Push Data to Outbound Queue
            await pushAccountInfoToOutboundQueue(accountDetail.data);
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            console.log('Account Creation Error', error.response);
        }
    }

    // If Account exists/created, but subscription is not created
    if (isAccountExist && accountDetail && !isSubscriptionExist) {
        try {
            // Hit Catalog API to get Plan Object
            const catalogResponse = await callCatalogApi(memberDetail);
            // Create Subscription for this Account
            const subsRequest = {
                accountId: accountDetail?.data.accountId,
                externalKey: memberDetail.accountNumber,
                planName: 'PLAN-2766',
                // productName: '',
                // billingPeriod: SubscriptionBillingPeriodEnum.DAILY,
                // priceList: ''
            };
            subscriptionDetail = await killbillObject.createSubscription(subsRequest);
            isSubscriptionExist = true;
            console.log(subscriptionDetail);
            // Push Data to Outbound Queue
            // await pushAccountInfoToOutboundQueue(accountDetail.data);
        } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            console.log('Subscription Creation Error', error.response);
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

async function pushAccountInfoToOutboundQueue(accountData: KillBillAccount | object) {
    const sqsKillBillOutData: SendMessageRequest = {
        MessageBody: JSON.stringify(accountData),
        QueueUrl: queueUrl,
    };
    console.log(sqsKillBillOutData);
    const sendSqsMessage = await sqs.sendMessage(sqsKillBillOutData).promise();
    console.log('SQS Response:', sendSqsMessage);
}

/**
 * Call Catalog API to get plan name
 */
async function callCatalogApi(memberDetail: AccountMember) {
    // implement later
}
