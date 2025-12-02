import type { Handler } from 'aws-lambda';
import { ConstructAnalyzer } from '@cdklabs/cdk-construct-analyzer';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

const TOKEN_CONFIG = [
    { envVar: 'GITHUB_TOKEN', secretEnvVar: 'GITHUB_TOKEN_SECRET_NAME' },
    { envVar: 'NPM_TOKEN', secretEnvVar: 'NPM_TOKEN_SECRET_NAME' },
];

const secretCache = new Map<string, string>();

async function getSecret(secretName: string): Promise<string> {
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
    return response.SecretString || '';
}

async function setupTokens(): Promise<void> {
    for (const { envVar, secretEnvVar } of TOKEN_CONFIG) {
        const secretName = process.env[secretEnvVar];
        
        if (!secretName) {
            console.log(`Skipping ${envVar}: ${secretEnvVar} not configured`);
            continue;
        }
        
        if (!secretCache.has(secretName)) {
            console.log(`Fetching secret for ${envVar}`);
            const secretValue = await getSecret(secretName);
            secretCache.set(secretName, secretValue);
        }
        
        process.env[envVar] = secretCache.get(secretName);
        console.log(`Set ${envVar} from secret`);
    }
}

export const handler: Handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    if (event.requestContext?.http?.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: ''
        };
    }

    const packageName = event.body ? JSON.parse(event.body).packageName : event.packageName;

    if (!packageName) {
        console.log('No package name provided');
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                error: 'No package name provided. Please send a "packageName" field.'
            })
        };
    }

    try {
        console.log('Analyzing package:', packageName);
        
        await setupTokens();
        
        const analyzer = new ConstructAnalyzer();
        const result = await analyzer.analyzePackage(decodeURIComponent(packageName));
        
        console.log('Analysis complete for:', packageName);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                packageName,
                analysis: result
            })
        };
    } catch (error) {
        console.error('Error analyzing package:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                error: 'Failed to analyze package',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
