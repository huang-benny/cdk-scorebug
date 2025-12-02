import { defineFunction } from "@aws-amplify/backend";

export const analyzePackageFunction = defineFunction({
    entry: './analyze-package-handler.ts',
    name: 'overrideName',
    timeoutSeconds: 300,
    memoryMB: 512,
});
