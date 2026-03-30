import { defineFunction } from '@aws-amplify/backend';

export const deleteUploadedFiles = defineFunction({
    name: 'deleteUploadedFiles',
    entry: './handler.ts'
});

