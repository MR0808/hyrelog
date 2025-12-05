/**
 * AWS Lambda@Edge function for event ingestion
 * Phase 4: Edge Ingestion Endpoints
 *
 * Deploy to CloudFront Lambda@Edge (viewer-request or origin-request)
 */
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';
export declare const handler: (event: CloudFrontRequestEvent) => Promise<CloudFrontRequestResult>;
//# sourceMappingURL=lambda-edge.d.ts.map