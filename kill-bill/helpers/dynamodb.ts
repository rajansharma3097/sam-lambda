// Create a DocumentClient that represents the query to add an item
import DynamoDB, { Key } from 'aws-sdk/clients/dynamodb';

// Declare some custom client just to illustrate how TS will include only used files into lambda distribution
export default class CustomDynamoClient {
    table: string;
    docClient: DynamoDB.DocumentClient;

    constructor(table: string) {
        this.docClient = new DynamoDB.DocumentClient();
        this.table = table;
    }

    async read(id: string) {
        const params = {
            TableName: this.table,
            Key: { k: id },
        };
        const data = await this.docClient.get(params).promise();
        return data.Item;
    }

    async write(Item: object) {
        const params = {
            TableName: this.table,
            Item,
        };

        return await this.docClient.put(params).promise();
    }

    // async update(Key: Key, Item: object) {
    //     const params = {
    //         TableName: this.table,
    //         Key,
    //         AttributeUpdates: Item,
    //     };

    //     return await this.docClient.update(params).promise();
    // }
}
