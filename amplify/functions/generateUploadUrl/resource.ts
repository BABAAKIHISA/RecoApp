import { defineFunction } from '@aws-amplify/backend';

export const generateUploadUrl = defineFunction({
    name: 'generateUploadUrl',
    entry: './handler.ts'
});
