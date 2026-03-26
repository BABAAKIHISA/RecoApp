import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Schema } from '../../data/resource';

const s3Client = new S3Client({ region: 'ap-southeast-2' });

export const handler: Schema['listUploadedFiles']['functionHandler'] = async (event) => {
    const bucketName = 'recoding-upload-baba';

    const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
    });

    const listResponse = await s3Client.send(listCommand);
    const files = listResponse.Contents || [];

    const fileUrls = await Promise.all(
        files.filter(f => f.Key).map(async (file) => {
            const getCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: file.Key,
            });
            const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
            return {
                key: file.Key as string,
                url: url,
                lastModified: file.LastModified ? file.LastModified.toISOString() : undefined
            };
        })
    );

    return fileUrls.sort((a, b) => {
        if (!a.lastModified || !b.lastModified) return 0;
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });
};
