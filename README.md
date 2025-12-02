# Package Analyzer

A Next.js application that analyzes npm package quality using AWS Amplify and the CDK Construct Analyzer. Get comprehensive scores for package quality across multiple pillars including maintenance, security, and community health.

## Features

- **Real-time Package Analysis**: Analyze any npm package and get detailed quality scores
- **Multi-Pillar Scoring**: Evaluate packages across multiple quality dimensions
- **Visual Score Display**: Interactive circular progress indicators for easy score interpretation
- **Badge Generation**: Generate embeddable SVG badges for your packages
- **Serverless Architecture**: Built on AWS Lambda for scalability and performance

## Architecture

- **Frontend**: Next.js 14 with App Router and React Server Components
- **Backend**: AWS Lambda function for package analysis
- **Authentication**: Amazon Cognito for secure access
- **Analysis Engine**: CDK Construct Analyzer for comprehensive package evaluation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS Account
- AWS Amplify CLI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
npm install
```

3. Configure Amplify:
```bash
npx amplify sandbox
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000?package=your-package-name](http://localhost:3000?package=your-package-name)

## Usage

### Analyzing a Package

Visit the application with a package name as a query parameter:
```
http://localhost:3000?package=aws-cdk-lib
```

### Generating Badges

Use the badge API endpoint to generate SVG badges:
```
http://localhost:3000/api/badge?package=aws-cdk-lib
```

Embed in your README:
```markdown
![Package Score](https://your-domain.com/api/badge?package=your-package)
```

## Project Structure

```
├── app/
│   ├── api/badge/          # Badge generation API
│   ├── components/         # React components
│   ├── lib/               # Utility functions and AWS logic
│   ├── page.tsx           # Main application page
│   └── layout.tsx         # Root layout
├── amplify/
│   └── functions/
│       └── analyze-package/  # Lambda function for analysis
└── public/                # Static assets
```

## Configuration

### Environment Variables

The Lambda function uses AWS Secrets Manager for sensitive tokens:
- `GITHUB_TOKEN_SECRET_NAME`: GitHub API token for repository analysis
- `NPM_TOKEN_SECRET_NAME`: NPM API token for package data

Configure these in your AWS Secrets Manager and reference them in the Lambda environment.

## Deploying to AWS

Deploy your application using Amplify:

```bash
git push
```

Amplify will automatically build and deploy your application. For detailed instructions, refer to the [Amplify deployment documentation](https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/#deploy-a-fullstack-app-to-aws).
