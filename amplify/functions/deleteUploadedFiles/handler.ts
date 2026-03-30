import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Schema } from '../../data/resource';

const s3Client = new S3Client({ region: 'ap-southeast-2' });

export const handler: Schema['deleteUploadedFiles']['functionHandler'] = async (event) => {
    const { filename } = event.arguments;

    const bucketName = 'recoding-upload-baba';

    const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: `${filename}`,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return uploadUrl;
}