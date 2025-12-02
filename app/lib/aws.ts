import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { fetchAuthSession } from 'aws-amplify/auth';
import outputs from '@/amplify_outputs.json';

export interface AnalysisData {
    packageName: string;
    version: string;
    totalScore: number;
    pillarScores: Record<string, number>;
    signalScores?: Record<string, Record<string, number>>;
    signalWeights?: Record<string, Record<string, number>>;
}

export async function analyzePackage(packageName: string): Promise<AnalysisData> {
    const session = await fetchAuthSession();

    if (!session.credentials) {
        throw new Error('Not authenticated');
    }

    const lambdaClient = new LambdaClient({
        region: outputs.auth.aws_region,
        credentials: session.credentials,
    });

    const functionArn = outputs.custom?.analyzePackageFunctionArn;
    if (!functionArn) {
        throw new Error('Lambda function ARN not found in outputs');
    }

    const response = await lambdaClient.send(new InvokeCommand({
        FunctionName: functionArn,
        Payload: JSON.stringify({ packageName: packageName.trim() }),
    }));

    if (response.FunctionError) {
        throw new Error('Lambda function error: ' + response.FunctionError);
    }

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.statusCode !== 200) {
        const errorData = JSON.parse(payload.body);
        throw new Error(errorData.message || 'Failed to analyze package');
    }

    const result = JSON.parse(payload.body);
    return result.analysis;
}
