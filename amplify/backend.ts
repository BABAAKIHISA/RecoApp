import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { generateUploadUrl } from './functions/generateUploadUrl/resource';
import { listUploadedFiles } from './functions/listUploadedFiles/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  generateUploadUrl,
  listUploadedFiles,
});

const s3Policy = new PolicyStatement({
  actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject', 's3:ListBucket'],
  resources: [
    'arn:aws:s3:::recoding-upload-baba',
    'arn:aws:s3:::recoding-upload-baba/*'
  ]
});

backend.generateUploadUrl.resources.lambda.addToRolePolicy(s3Policy);
backend.listUploadedFiles.resources.lambda.addToRolePolicy(s3Policy);

backend.addOutput({
  storage: {
    aws_region: "ap-southeast-2",
    bucket_name: "recoding-upload-baba",
  },
});
