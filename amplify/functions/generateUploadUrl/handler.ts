import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Schema } from '../../data/resource';

const s3Client = new S3Client({ region: 'ap-southeast-2' });

export const handler: Schema['generateUploadUrl']['functionHandler'] = async (event) => {
    const { filename } = event.arguments;

    if (!filename) {
        throw new Error('Filename is required');
    }

    const bucketName = 'recoding-upload-baba';

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `${filename}`,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return uploadUrl;
};
