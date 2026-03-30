import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { generateUploadUrl } from './functions/generateUploadUrl/resource';
import { listUploadedFiles } from './functions/listUploadedFiles/resource';
import { deleteUploadedFiles } from './functions/deleteUploadedFiles/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  generateUploadUrl,
  listUploadedFiles,
  deleteUploadedFiles,
});

const upload_policy = new PolicyStatement({
  actions: ['s3:PutObject'],
  resources: [
    'arn:aws:s3:::recoding-upload-baba',
    'arn:aws:s3:::recoding-upload-baba/*'
  ]
});

const list_policy = new PolicyStatement({
  actions: ['s3:GetObject', 's3:ListBucket'],
  resources: [
    'arn:aws:s3:::recoding-upload-baba',
    'arn:aws:s3:::recoding-upload-baba/*'
  ]
});
const delete_policy = new PolicyStatement({
  actions: ['s3:DeleteObject'],
  resources: [
    'arn:aws:s3:::recoding-upload-baba',
    'arn:aws:s3:::recoding-upload-baba/*'
  ]
});

backend.generateUploadUrl.resources.lambda.addToRolePolicy(upload_policy);
backend.listUploadedFiles.resources.lambda.addToRolePolicy(list_policy);
backend.deleteUploadedFiles.resources.lambda.addToRolePolicy(delete_policy);

backend.addOutput({
  storage: {
    aws_region: "ap-southeast-2",
    bucket_name: "recoding-upload-baba",
  },
});
