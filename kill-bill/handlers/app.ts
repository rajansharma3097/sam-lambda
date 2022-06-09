import { SQSEvent } from 'aws-lambda';
import { AccountMember } from '../models/account-member';
import SQS, { SendMessageRequest } from 'aws-sdk/clients/sqs';
import { getKillBillCredentials } from '../helpers/secretsmanager';
import { KBSecrets } from '../models/kb-secrets';
import KillBillClient from '../helpers/killbillclient';
import { Account, Catalog, Subscription } from 'killbill';
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
        subscriptionDetail = await killbillObject.getSubscriptionByKey(
            `DUES-${memberDetail.accountNumber}-${memberDetail.offerFees.offerContractDates.renewalDate}`,
        );
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
}

async function createKBSubscription(killbillObject: KillBillClient, memberDetail: AccountMember, kbAccount: Account) {
    // Hit Catalog API to get Plan Object
    let catalogResponse = await callCatalogApi(memberDetail, kbAccount);
    if (!catalogResponse) {
        throw new Error('Unable to get plan from Catalog API.');
    }
    catalogResponse = JSON.parse(catalogResponse.v);
    console.log(catalogResponse);
    // Create Subscription for this Account
    const subsRequest = {
        accountId: kbAccount.accountId,
        externalKey: `DUES-${memberDetail.accountNumber}-${memberDetail.offerFees.offerContractDates.renewalDate}`,
        planName: catalogResponse.products[0].plans[0].name,
        startDate: memberDetail.offerFees.offerContractDates.startDate,
        billingStartDate: memberDetail.offerFees.offerContractDates.firstPaymentDueDate,
    };

    const subsResponse = await killbillObject.createSubscription(subsRequest);

    if (memberDetail.offerPresetRenewalPaymentTerm != null && catalogResponse.products[0].plans[1] != undefined) {
        await createRenewalSubscription(catalogResponse, killbillObject, memberDetail, kbAccount);
    }

    return subsResponse;
}

async function createRenewalSubscription(
    catalogResponse: Catalog,
    killbillObject: KillBillClient,
    memberDetail: AccountMember,
    kbAccount: Account,
) {
    if (
        catalogResponse == undefined ||
        catalogResponse.products == undefined ||
        catalogResponse.products[0].plans == undefined
    ) {
        return false;
    }

    const externalKeyDate = calculateEndDateOfRenewalPlan(memberDetail);

    // Create Subscription for Renewal Plan
    const renewalSubsRequest = {
        accountId: kbAccount.accountId,
        externalKey: `DUES-${memberDetail.accountNumber}-${externalKeyDate}`,
        planName: catalogResponse.products[0].plans[1].name,
        startDate: memberDetail.offerFees.offerContractDates.renewalDate,
        billingStartDate: memberDetail.offerFees.offerContractDates.renewalDate,
    };

    await killbillObject.createSubscription(renewalSubsRequest);
}

function calculateEndDateOfRenewalPlan(memberDetail: AccountMember) {
    // for open-ended
    if (memberDetail.offerPresetRenewalPaymentTerm.numberOfPayments == 0) {
        return '2039-12-31';
    } else {
        // for term plan
        const renewalDate = new Date(memberDetail.offerFees.offerContractDates.renewalDate);
        return addMonths(memberDetail.offerPresetRenewalPaymentTerm.renewalLength, renewalDate);
    }
}

function addMonths(numOfMonths: number, renewalDate = new Date()) {
    const dateCopy = new Date(renewalDate.getTime());
    dateCopy.setMonth(dateCopy.getMonth() + numOfMonths);
    const date = dateCopy.toLocaleDateString('en-us', { day: 'numeric' });
    const month = dateCopy.toLocaleDateString('en-us', { month: 'numeric' });
    const year = dateCopy.toLocaleDateString('en-us', { year: 'numeric' });
    return `${year}-${month}-${date}`;
}

/**
 * Call Catalog API to get plan name
 */
async function callCatalogApi(memberDetail: AccountMember, kbAccount: Account) {
    const catalogEndpoint =
        process.env.API_ENDPOINT || 'https://7f7jv8azlh.execute-api.us-east-1.amazonaws.com/Prod/catalog';
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
