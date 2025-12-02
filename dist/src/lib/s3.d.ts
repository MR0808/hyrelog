import { S3Client } from "@aws-sdk/client-s3";
export declare const getS3Client: () => S3Client | null;
/**
 * Uploads compressed JSON data to S3.
 */
export declare const uploadToS3: (key: string, data: Buffer | string, contentType?: string) => Promise<void>;
/**
 * Generates S3 key for archived events.
 * Format: {companyId}/{workspaceId}/{YYYY-MM-DD}.json.gz
 */
export declare const generateArchiveKey: (companyId: string, workspaceId: string, date: Date) => string;
/**
 * Retrieves archived data from S3 as a Buffer (for gzipped files).
 * @throws Error with code 'NoSuchKey' if the key doesn't exist
 */
export declare const getFromS3: (key: string) => Promise<Buffer>;
//# sourceMappingURL=s3.d.ts.map