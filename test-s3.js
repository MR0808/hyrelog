import {
    S3Client,
    ListObjectsV2Command,
    HeadBucketCommand
} from '@aws-sdk/client-s3';
import { config } from 'dotenv';

config();

const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function test() {
    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket) {
        console.error('❌ AWS_S3_BUCKET environment variable not set');
        process.exit(1);
    }

    try {
        // Test 1: Check if bucket exists and is accessible
        const headCommand = new HeadBucketCommand({ Bucket: bucket });
        await client.send(headCommand);
        console.log(`✅ Bucket "${bucket}" is accessible`);

        // Test 2: List objects in bucket (tests ListBucket permission)
        const listCommand = new ListObjectsV2Command({
            Bucket: bucket,
            MaxKeys: 1
        });
        const response = await client.send(listCommand);
        console.log(`✅ S3 connection successful!`);
        console.log(`   Bucket: ${bucket}`);
        console.log(`   Objects found: ${response.KeyCount ?? 0}`);

        if (response.Contents && response.Contents.length > 0) {
            console.log(`   Sample object: ${response.Contents[0]?.Key}`);
        }
    } catch (error) {
        console.error('❌ S3 connection failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error(
            '1. Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct'
        );
        console.error(
            '2. Check IAM user has s3:ListBucket permission for the bucket'
        );
        console.error('3. Verify AWS_S3_BUCKET matches your bucket name');
        console.error('4. Ensure AWS_REGION matches your bucket region');
        process.exit(1);
    }
}

test();
