import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { generateUploadUrl } from './functions/generateUploadUrl/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  generateUploadUrl,
});

backend.generateUploadUrl.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['s3:PutObject'],
    resources: ['arn:aws:s3:::recoding-upload-baba/*']
  })
);

backend.addOutput({
  storage: {
    aws_region: "ap-southeast-2",
    bucket_name: "recoding-upload-baba",
  },
});
