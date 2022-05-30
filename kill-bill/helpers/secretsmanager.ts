import ASM from 'aws-sdk/clients/secretsmanager';

const env = process.env.STAGE;
const region = process.env.REGION;

//Configure AWS Secrets Manager
const asm = new ASM({ region: region });
const secretId = `${env}/BillingService/KillBillCredentials`;

export const getKillBillCredentials = async () => {
    const secretsPromise = await asm
        .getSecretValue({
            SecretId: secretId,
        })
        .promise();
    if (secretsPromise.SecretString != null) {
        console.log(secretsPromise.SecretString);
        return JSON.parse(secretsPromise.SecretString);
    }

    return false;
};
