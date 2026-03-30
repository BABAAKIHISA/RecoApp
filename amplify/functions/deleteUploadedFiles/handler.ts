import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { Schema } from '../../data/resource';

const s3Client = new S3Client({ region: 'ap-southeast-2' });

export const handler: Schema['deleteUploadedFiles']['functionHandler'] = async (event) => {
    const { filename } = event.arguments;

    const bucketName = 'recoding-upload-baba';

    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: `${filename}`,
        });
        await s3Client.send(command);
        return true
    } catch (error) {
        console.error("Error generating upload URL:", error);
        throw new Error("Failed to generate upload URL");
    }
}