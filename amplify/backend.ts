import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { analyzePackageFunction } from './functions/analyze-package/resource';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

const backend = defineBackend({
  auth,
  data,
  analyzePackageFunction
});

// ===== TOKEN CONFIGURATION =====
// Add your tokens here - just add a new entry to easily add more tokens
const SECRETS = [
  { id: 'GitHubToken', secretName: 'GITHUB_TOKEN', envVar: 'GITHUB_TOKEN_SECRET_NAME' },
  { id: 'NpmToken', secretName: 'NPM_TOKEN', envVar: 'NPM_TOKEN_SECRET_NAME' },
  // Add more secrets here as needed:
  // { id: 'AnotherToken', secretName: 'ANOTHER_TOKEN', envVar: 'ANOTHER_TOKEN_SECRET_NAME' },
];
// ===============================

// Setup all secrets
SECRETS.forEach(({ id, secretName, envVar }) => {
  const secret = Secret.fromSecretNameV2(
    backend.analyzePackageFunction.resources.lambda.stack,
    id,
    secretName
  );

  secret.grantRead(backend.analyzePackageFunction.resources.lambda);

  backend.analyzePackageFunction.addEnvironment(envVar, secretName);
});

// Grant authenticated users permission to invoke the Lambda function
backend.analyzePackageFunction.resources.lambda.grantInvoke(
  backend.auth.resources.authenticatedUserIamRole
);

backend.analyzePackageFunction.resources.lambda.grantInvoke(
  backend.auth.resources.unauthenticatedUserIamRole
);

backend.addOutput({
  custom: {
    analyzePackageFunctionArn: backend.analyzePackageFunction.resources.lambda.functionArn
  }
});