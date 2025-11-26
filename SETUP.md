# Setup Instructions

## Install Dependencies

Run these commands to install all required dependencies:

```bash
# Install main project dependencies
npm install

# Install Lambda function dependencies
npm install --prefix amplify/functions/analyze-package
```

## Deploy

After installing dependencies, deploy your Amplify app:

```bash
npx ampx sandbox
```

## Usage

1. Once deployed, open your app in the browser
2. Enter a CDK package name (e.g., `@aws-cdk/aws-s3` or `aws-cdk-lib`)
3. Click "Analyze" to get the package quality score
4. View the total score and individual pillar scores with detailed signal breakdowns

## What Changed

- Replaced the todo app with a CDK Construct Analyzer interface
- Updated Lambda function to use `@cdklabs/cdk-construct-analyzer`
- Added aws4fetch for authenticated Lambda calls
- Created a clean UI with circular progress indicators and detailed scoring
- Backend now exports the Lambda function URL for the frontend to use
