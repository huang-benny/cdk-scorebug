import { defineFunction } from "@aws-amplify/backend";

export const analyzePackageFunction = defineFunction({
  entry: './analyze-package-handler.ts',
  name: 'overrideName', // explicitly set the name to override the default naming behavior
  timeoutSeconds: 300, // Increased timeout for package analysis
  memoryMB: 512, // Increased memory for package analysis
});