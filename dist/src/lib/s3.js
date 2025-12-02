import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/config/env";
/**
 * S3 client singleton for archival operations.
 */
let s3Client = null;
export const getS3Client = () => {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_S3_BUCKET) {
        return null;
    }
    if (!s3Client) {
        s3Client = new S3Client({
            region: env.AWS_REGION,
            credentials: {
                accessKeyId: env.AWS_ACCESS_KEY_ID,
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }
    return s3Client;
};
/**
 * Uploads compressed JSON data to S3.
 */
export const uploadToS3 = async (key, data, contentType = "application/json") => {
    const client = getS3Client();
    if (!client || !env.AWS_S3_BUCKET) {
        throw new Error("S3 not configured");
    }
    const body = typeof data === "string" ? Buffer.from(data, "base64") : data;
    const command = new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentEncoding: "gzip",
    });
    try {
        const response = await client.send(command);
        console.log(`    S3 upload successful: ${key} (ETag: ${response.ETag})`);
    }
    catch (error) {
        console.error(`    S3 upload failed for ${key}:`, error);
        if (error instanceof Error) {
            console.error(`    Error message: ${error.message}`);
            if ("$metadata" in error) {
                console.error(`    Status code: ${error.$metadata?.httpStatusCode}`);
            }
        }
        throw error;
    }
};
/**
 * Generates S3 key for archived events.
 * Format: {companyId}/{workspaceId}/{YYYY-MM-DD}.json.gz
 */
export const generateArchiveKey = (companyId, workspaceId, date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${companyId}/${workspaceId}/${year}-${month}-${day}.json.gz`;
};
/**
 * Retrieves archived data from S3 as a Buffer (for gzipped files).
 * @throws Error with code 'NoSuchKey' if the key doesn't exist
 */
export const getFromS3 = async (key) => {
    const client = getS3Client();
    if (!client || !env.AWS_S3_BUCKET) {
        throw new Error("S3 not configured");
    }
    const command = new GetObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
    });
    try {
        const response = await client.send(command);
        if (!response.Body) {
            throw new Error(`No body in S3 response for key: ${key}`);
        }
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        // Return as Buffer (binary data) - don't convert to UTF-8 string
        return Buffer.concat(chunks);
    }
    catch (error) {
        // Re-throw with normalized error structure
        const s3Error = error;
        if (s3Error.Code === "NoSuchKey" || s3Error.code === "NoSuchKey" || s3Error.name === "NoSuchKey") {
            const normalizedError = new Error(`S3 key not found: ${key}`);
            normalizedError.code = "NoSuchKey";
            normalizedError.Code = "NoSuchKey";
            throw normalizedError;
        }
        throw error;
    }
};
//# sourceMappingURL=s3.js.map