import { defineFunction } from '@aws-amplify/backend';

export const listUploadedFiles = defineFunction({
  name: 'listUploadedFiles',
  entry: './handler.ts'
});
