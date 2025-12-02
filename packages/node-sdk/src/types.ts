/**
 * Type definitions for HyreLog SDK
 */

export interface HyreLogClientOptions {
  /**
   * API key (workspace or company key)
   */
  apiKey: string;
  
  /**
   * Base URL for the HyreLog API
   * @default "https://api.hyrelog.com"
   */
  baseUrl?: string;
  
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
  
  /**
   * Custom logger function
   * @default console
   */
  logger?: {
    debug?: (...args: unknown[]) => void;
    info?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
  };
  
  /**
   * Custom transport function for advanced use cases
   */
  transport?: TransportFunction;
  
  /**
   * Retry configuration
   */
  retry?: RetryConfig;
  
  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
}

export interface RetryConfig {
  /**
   * Maximum number of retries
   * @default 3
   */
  maxRetries?: number;
  
  /**
   * Initial delay in milliseconds
   * @default 1000
   */
  initialDelay?: number;
  
  /**
   * Maximum delay in milliseconds
   * @default 10000
   */
  maxDelay?: number;
  
  /**
   * Exponential backoff multiplier
   * @default 2
   */
  multiplier?: number;
  
  /**
   * Retry on these HTTP status codes
   * @default [429, 500, 502, 503, 504]
   */
  retryableStatusCodes?: number[];
}

export interface TransportFunction {
  (request: TransportRequest): Promise<TransportResponse>;
}

export interface TransportRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | Buffer;
  timeout?: number;
}

export interface TransportResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Event input structure
 */
export interface EventInput {
  /**
   * Action identifier (e.g., "user.created", "payment.processed")
   */
  action: string;
  
  /**
   * Category (e.g., "auth", "billing", "user")
   */
  category: string;
  
  /**
   * Actor information
   */
  actor?: {
    id?: string;
    email?: string;
    name?: string;
  };
  
  /**
   * Target information
   */
  target?: {
    id?: string;
    type?: string;
  };
  
  /**
   * Event payload (arbitrary JSON)
   */
  payload?: Record<string, unknown>;
  
  /**
   * Event metadata (arbitrary JSON)
   */
  metadata?: Record<string, unknown>;
  
  /**
   * Field changes (for update events)
   */
  changes?: Array<{
    field: string;
    old: unknown;
    new: unknown;
  }>;
  
  /**
   * Project ID (optional)
   */
  projectId?: string;
}

/**
 * Event structure as returned by the API
 */
export interface Event extends EventInput {
  id: string;
  companyId: string;
  workspaceId: string;
  projectId: string | null;
  hash: string;
  prevHash: string | null;
  traceId: string | null;
  createdAt: string;
  archived: boolean;
  dataRegion?: string;
}

/**
 * Query options for event retrieval
 */
export interface QueryOptions {
  /**
   * Page number (1-indexed)
   * @default 1
   */
  page?: number;
  
  /**
   * Items per page
   * @default 20
   */
  limit?: number;
  
  /**
   * Start date (ISO 8601)
   */
  from?: string;
  
  /**
   * End date (ISO 8601)
   */
  to?: string;
  
  /**
   * Filter by action
   */
  action?: string;
  
  /**
   * Filter by category
   */
  category?: string;
  
  /**
   * Filter by actor ID
   */
  actorId?: string;
  
  /**
   * Filter by actor email
   */
  actorEmail?: string;
  
  /**
   * Filter by workspace ID (company key only)
   */
  workspaceId?: string;
  
  /**
   * Filter by project ID
   */
  projectId?: string;
}

/**
 * Query response structure
 */
export interface QueryResponse {
  data: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  retentionApplied?: boolean;
  retentionWindowStart?: string;
}

/**
 * Batch ingestion options
 */
export interface BatchOptions {
  /**
   * Maximum batch size
   * @default 100
   */
  maxSize?: number;
  
  /**
   * Maximum wait time before flushing (ms)
   * @default 5000
   */
  maxWait?: number;
  
  /**
   * Enable automatic batching
   * @default false
   */
  autoFlush?: boolean;
}

