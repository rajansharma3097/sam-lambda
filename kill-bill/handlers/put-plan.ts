import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Catalog, CatalogCurrenciesEnum, DurationUnitEnum, PlanBillingPeriodEnum, PriceCurrencyEnum } from 'killbill';
import CustomDynamoClient from '../helpers/dynamodb';
import { AccountMember } from '../models/account-member';

const catalogTable = process.env.CATALOGTABLE || 'kb-catalog';

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    let response: APIGatewayProxyResult;
    try {
        if (event.httpMethod !== 'POST') {
            throw new Error(`This endpoint only accepts POST method, you tried: ${event.httpMethod} method.`);
        }

        const body = event.body ? JSON.parse(event.body) : {};
        if (!body.accountId) {
            throw new Error('accountId is required!');
        }

        const catalogObject = extractCatalogObject(body.asfObject);
        const catalogPostObject = { accountId: body.accountId, ...catalogObject };

        const client = new CustomDynamoClient(catalogTable);
        const item = await client.write(catalogPostObject);

        if (!item) {
            throw new Error('Unable to add plan in catalog database!!');
        }
        response = {
            statusCode: 200,
            body: JSON.stringify(item),
        };
    } catch (err) {
        let message = 'some error happened';
        if (err instanceof Error) {
            message = err.message;
        }
        response = {
            statusCode: 500,
            body: JSON.stringify({
                message: message,
            }),
        };
    }

    return response;
};

function extractCatalogObject(asfObject: AccountMember) {
    return {
        name: asfObject.accountNumber,
        effectiveDate: new Date().toISOString(),
        currencies: [CatalogCurrenciesEnum.USD],
        products: [
            {
                type: 'BASE',
                name: `PRODUCT-${asfObject.accountId}`,
                prettyName: `Product for Account ID: ${asfObject.accountId}`,
                plans: [
                    {
                        name: `PLAN-${asfObject.accountId}`,
                        prettyName: `Plan for Account ID: ${asfObject.accountId}`,
                        billingPeriod: PlanBillingPeriodEnum.MONTHLY,
                        phases: [
                            {
                                type: asfObject.offerFees.offerContractDates.openEnded ? 'EVERGREEN' : 'FIXEDTERM',
                                prices: [
                                    {
                                        currency: PriceCurrencyEnum.USD,
                                        value: asfObject.offerFees.recurringFees.perPaymentTotal,
                                    },
                                ],
                                fixedPrices: [],
                                duration: {
                                    unit: asfObject.offerFees.offerContractDates.openEnded
                                        ? DurationUnitEnum.UNLIMITED
                                        : DurationUnitEnum.MONTHS,
                                    number: -1,
                                },
                                usages: [],
                            },
                        ],
                    },
                ],
            },
        ],
        priceLists: [
            {
                name: 'DEFAULT',
                plans: [`PLAN-${asfObject.accountId}`],
            },
        ],
    } as Catalog;
}
