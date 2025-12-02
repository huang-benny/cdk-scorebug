import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';
import outputs from '@/amplify_outputs.json';

type RGB = { r: number; g: number; b: number };

function getScoreColor(score: number): RGB {
    const ranges = [
        { min: 75, start: { r: 132, g: 204, b: 22 }, end: { r: 0, g: 255, b: 0 } },
        { min: 50, start: { r: 239, g: 68, b: 68 }, end: { r: 132, g: 204, b: 22 } },
        { min: 0, start: { r: 185, g: 28, b: 28 }, end: { r: 239, g: 68, b: 68 } },
    ];

    const range = ranges.find(r => score >= r.min) || ranges[2];
    const rangeSize = range.min === 75 ? 25 : range.min === 50 ? 25 : 50;
    const t = (score - range.min) / rangeSize;

    return {
        r: Math.round(range.start.r + (range.end.r - range.start.r) * t),
        g: Math.round(range.start.g + (range.end.g - range.start.g) * t),
        b: Math.round(range.start.b + (range.end.b - range.start.b) * t),
    };
}

function createCircle(x: number, y: number, score: number, radius = 20): string {
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);
    const colorStr = `rgb(${color.r},${color.g},${color.b})`;
    const colorDark = `rgb(${Math.round(color.r * 0.8)},${Math.round(color.g * 0.85)},${Math.round(color.b * 0.8)})`;
    const gradientId = `grad-${x}-${y}`;

    return `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colorStr};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colorDark};stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="#2a2a2a" stroke-width="3"/>
    <circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="url(#${gradientId})" stroke-width="3"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${x} ${y})" stroke-linecap="round"/>
    <text x="${x}" y="${y + 5}" text-anchor="middle" fill="#e0e0e0" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${score}</text>`;
}

async function getUnauthenticatedCredentials() {
    const cognitoClient = new CognitoIdentityClient({
        region: outputs.auth.aws_region,
    });

    const { IdentityId } = await cognitoClient.send(new GetIdCommand({
        IdentityPoolId: outputs.auth.identity_pool_id,
    }));

    const { Credentials } = await cognitoClient.send(new GetCredentialsForIdentityCommand({
        IdentityId,
    }));

    if (!Credentials?.AccessKeyId || !Credentials?.SecretKey) {
        throw new Error('Failed to get unauthenticated credentials');
    }

    return {
        accessKeyId: Credentials.AccessKeyId,
        secretAccessKey: Credentials.SecretKey,
        sessionToken: Credentials.SessionToken,
    };
}

async function invokeAnalyzePackage(packageName: string) {
    const credentials = await getUnauthenticatedCredentials();
    const lambdaClient = new LambdaClient({
        region: outputs.auth.aws_region,
        credentials,
    });

    const functionArn = outputs.custom?.analyzePackageFunctionArn;
    if (!functionArn) {
        throw new Error('Lambda function ARN not found');
    }

    const response = await lambdaClient.send(new InvokeCommand({
        FunctionName: functionArn,
        Payload: JSON.stringify({ packageName: packageName.trim() }),
    }));

    if (response.FunctionError) {
        const errorPayload = JSON.parse(new TextDecoder().decode(response.Payload));
        throw new Error(`Lambda error: ${JSON.stringify(errorPayload)}`);
    }

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    if (payload.statusCode !== 200) {
        throw new Error(payload.body || 'Unknown error');
    }

    return JSON.parse(payload.body);
}

function createBadgeSvg(packageName: string, totalScore: number, pillarScores: Record<string, number>): string {
    const TOTAL_RADIUS = 36;
    const PILLAR_RADIUS = 20;
    const SPACING = 60;
    const pillars = Object.entries(pillarScores);
    const width = 100 + (pillars.length * SPACING) + 40;
    const height = 135;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background: #1a1a1a; border-radius: 8px;">`;
    
    svg += `<text x="${width / 2}" y="20" text-anchor="middle" fill="#e0e0e0" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${packageName}</text>`;
    svg += createCircle(60, 65, totalScore, TOTAL_RADIUS);
    svg += `<text x="60" y="115" text-anchor="middle" fill="#888" font-family="Arial, sans-serif" font-size="10">TOTAL</text>`;

    let xPos = 160;
    for (const [pillar, score] of pillars) {
        svg += createCircle(xPos, 65, score, PILLAR_RADIUS);
        svg += `<text x="${xPos}" y="115" text-anchor="middle" fill="#888" font-family="Arial, sans-serif" font-size="9">${pillar.toUpperCase()}</text>`;
        xPos += SPACING;
    }

    return svg + '</svg>';
}

function createErrorSvg(message: string): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" style="background: #1a1a1a; border-radius: 8px;">
        <text x="200" y="40" text-anchor="middle" fill="#ff4444" font-family="Arial, sans-serif" font-size="16">Error loading package score</text>
        <text x="200" y="65" text-anchor="middle" fill="#888" font-family="Arial, sans-serif" font-size="10">${message.substring(0, 60)}</text>
      </svg>`.trim();
}

export async function GET(request: NextRequest) {
    const packageName = request.nextUrl.searchParams.get('package');

    if (!packageName) {
        return new NextResponse('Missing package parameter', { status: 400 });
    }

    try {
        const result = await invokeAnalyzePackage(packageName);
        const svgContent = createBadgeSvg(packageName, result.analysis.totalScore, result.analysis.pillarScores);

        return new NextResponse(svgContent, {
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Badge API error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorSvg = createErrorSvg(errorMessage);

        return new NextResponse(errorSvg, {
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=300',
            },
        });
    }
}
