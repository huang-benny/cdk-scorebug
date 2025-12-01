import { NextRequest, NextResponse } from 'next/server';

function getScoreColor(score: number): { r: number; g: number; b: number } {
    if (score >= 75) {
        const t = (score - 75) / 25;
        return {
            r: Math.round(132 - 132 * t),
            g: Math.round(204 + 51 * t),
            b: Math.round(22 - 22 * t),
        };
    } else if (score >= 50) {
        const t = (score - 50) / 25;
        return {
            r: Math.round(239 - 107 * t),
            g: Math.round(68 + 136 * t),
            b: Math.round(68 - 46 * t),
        };
    } else {
        const t = score / 50;
        return {
            r: Math.round(185 + 54 * t),
            g: Math.round(28 + 40 * t),
            b: Math.round(28 + 40 * t),
        };
    }
}

function createCircle(x: number, y: number, score: number, radius: number = 20): string {
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);
    const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`;
    const colorDark = `rgb(${Math.round(color.r * 0.8)}, ${Math.round(color.g * 0.85)}, ${Math.round(color.b * 0.8)})`;
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
    <text x="${x}" y="${y + 5}" text-anchor="middle" fill="#e0e0e0" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${score}</text>
  `;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const packageName = searchParams.get('package');

    if (!packageName) {
        return new NextResponse('Missing package parameter', { status: 400 });
    }

    try {
        // Directly invoke Lambda with unauthenticated credentials (same as main page)
        const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
        const { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } = await import('@aws-sdk/client-cognito-identity');
        const outputs = await import('@/amplify_outputs.json');

        // Get unauthenticated credentials from Cognito Identity Pool
        const cognitoClient = new CognitoIdentityClient({
            region: outputs.default.auth.aws_region,
        });

        const getIdResponse = await cognitoClient.send(new GetIdCommand({
            IdentityPoolId: outputs.default.auth.identity_pool_id,
        }));

        const credsResponse = await cognitoClient.send(new GetCredentialsForIdentityCommand({
            IdentityId: getIdResponse.IdentityId,
        }));

        if (!credsResponse.Credentials) {
            throw new Error('Failed to get unauthenticated credentials');
        }

        const lambdaClient = new LambdaClient({
            region: outputs.default.auth.aws_region,
            credentials: {
                accessKeyId: credsResponse.Credentials.AccessKeyId!,
                secretAccessKey: credsResponse.Credentials.SecretKey!,
                sessionToken: credsResponse.Credentials.SessionToken,
            },
        });

        const functionArn = outputs.default.custom?.analyzePackageFunctionArn;

        if (!functionArn) {
            throw new Error('Lambda function ARN not found in outputs');
        }

        const command = new InvokeCommand({
            FunctionName: functionArn,
            Payload: JSON.stringify({ packageName: packageName.trim() }),
        });

        const response = await lambdaClient.send(command);

        if (response.FunctionError) {
            const errorPayload = JSON.parse(new TextDecoder().decode(response.Payload));
            console.error('Lambda function error:', errorPayload);
            throw new Error(`Lambda function error: ${JSON.stringify(errorPayload)}`);
        }

        const payload = JSON.parse(new TextDecoder().decode(response.Payload));

        if (payload.statusCode !== 200) {
            console.error('Failed to analyze package:', payload);
            throw new Error(`Failed to analyze package: ${payload.body || 'Unknown error'}`);
        }

        const result = JSON.parse(payload.body);
        const totalScore = result.analysis.totalScore;
        const pillarScores = result.analysis.pillarScores;
        const pillars = Object.entries(pillarScores);

        // Calculate dimensions
        const totalCircleRadius = 36;
        const pillarCircleRadius = 20;
        const spacing = 60;
        const totalWidth = 100 + (pillars.length * spacing) + 40;
        const height = 135;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" style="background: #1a1a1a; border-radius: 8px;">`;

        // Title
        svgContent += `<text x="${totalWidth / 2}" y="20" text-anchor="middle" fill="#e0e0e0" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${packageName}</text>`;

        // Total score (larger circle)
        svgContent += createCircle(60, 65, totalScore, totalCircleRadius);
        svgContent += `<text x="60" y="115" text-anchor="middle" fill="#888" font-family="Arial, sans-serif" font-size="10">TOTAL</text>`;

        // Pillar scores
        let xPos = 160;
        pillars.forEach(([pillar, score]) => {
            svgContent += createCircle(xPos, 65, score as number, pillarCircleRadius);
            svgContent += `<text x="${xPos}" y="115" text-anchor="middle" fill="#888" font-family="Arial, sans-serif" font-size="9">${pillar.toUpperCase()}</text>`;
            xPos += spacing;
        });

        svgContent += '</svg>';

        return new NextResponse(svgContent, {
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Badge API error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        const errorSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" style="background: #1a1a1a; border-radius: 8px;">
        <text x="200" y="40" text-anchor="middle" fill="#ff4444" font-family="Arial, sans-serif" font-size="16">Error loading package score</text>
        <text x="200" y="65" text-anchor="middle" fill="#888" font-family="Arial, sans-serif" font-size="10">${errorMessage.substring(0, 60)}</text>
      </svg>
    `.trim();

        return new NextResponse(errorSvg, {
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=300',
            },
        });
    }
}
