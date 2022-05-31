import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import CustomDynamoClient from '../helpers/dynamodb';

const catalogTable = process.env.CATALOGTABLE || 'kb-catalog';

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    let response: APIGatewayProxyResult;
    try {
        if (event.httpMethod !== 'POST') {
            throw new Error(`This endpoint only accepts POST method, you tried: ${event.httpMethod} method.`);
        }
        // if (!event.queryStringParameters?.tennant) {
        //     throw new Error('Please provide tennant parameter!');
        // }

        // if (!event.queryStringParameters?.accountId) {
        //     throw new Error('Please provide accountId parameter!');
        // }

        const body = event.body ? JSON.parse(event.body) : {};
        if (!body.accountId) {
            throw new Error('accountId is required!');
        }

        const accountId = body.accountId;
        const client = new CustomDynamoClient(catalogTable);
        const item = await client.read(accountId);
        // Pending Code
        if (!item) {
            throw new Error('Unable to fetch any plan from catalog!!');
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
