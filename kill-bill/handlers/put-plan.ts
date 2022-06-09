import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import CustomDynamoClient from '../helpers/dynamodb';
import { extractCatalogObject, setPresetRenewalPlan } from '../helpers/util';

const catalogTable = process.env.CATALOGTABLE || 'KBCatalog';

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    let response: APIGatewayProxyResult;
    try {
        if (event.httpMethod !== 'PUT') {
            throw new Error(`This endpoint only accepts POST method, you tried: ${event.httpMethod} method.`);
        }

        if (!event.queryStringParameters?.accountId) {
            throw new Error('Please provide accountId parameter!');
        }
        const accountId = event.queryStringParameters?.accountId;
        const body = event.body ? JSON.parse(event.body) : {};

        const client = new CustomDynamoClient(catalogTable);
        const existedItem = await client.read(accountId);

        if (!existedItem) {
            return {
                statusCode: 405,
                body: JSON.stringify({ message: `No plan exists associated with this accountId: ${accountId}` }),
            };
        }

        const catalogObject = extractCatalogObject(accountId, body);

        // check if renewal payment term is set
        if (body.offerPresetRenewalPaymentTerm != null && body.offerPresetRenewalPaymentTerm != 0) {
            setPresetRenewalPlan(catalogObject, body);
        }

        const catalogPostObject = { k: accountId, v: JSON.stringify(catalogObject) };

        const isAdded = await client.write(catalogPostObject);

        if (!isAdded) {
            throw new Error('Unable to add plan in catalog database!!');
        }
        const item = await client.read(accountId);
        response = {
            statusCode: 200,
            body: JSON.stringify(item),
        };
    } catch (err) {
        console.log(err);
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
