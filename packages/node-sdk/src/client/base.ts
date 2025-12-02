/**
 * Base client implementation with common functionality
 */

import type {
  HyreLogClientOptions,
  TransportFunction,
  TransportRequest,
  TransportResponse,
  RetryConfig,
} from "../types";

/**
 * Default HTTP transport using fetch API
 */
const defaultTransport: TransportFunction = async (request: TransportRequest): Promise<TransportResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), request.timeout || 30000);

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: controller.signal,
    });

    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    clearTimeout(timeoutId);
    return {
      status: response.status,
      headers,
      body,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${request.timeout || 30000}ms`);
    }
    throw error;
  }
};

/**
 * Default retry configuration
 */
const defaultRetryConfig: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  multiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Base client class with common functionality
 */
export abstract class BaseClient {
  protected readonly apiKey: string;
  protected readonly baseUrl: string;
  protected readonly debug: boolean;
  protected readonly logger: NonNullable<HyreLogClientOptions["logger"]>;
  protected readonly transport: TransportFunction;
  protected readonly retryConfig: Required<RetryConfig>;
  protected readonly timeout: number;

  constructor(options: HyreLogClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || "https://api.hyrelog.com";
    this.debug = options.debug || false;
    this.logger = options.logger || console;
    this.transport = options.transport || defaultTransport;
    this.retryConfig = { ...defaultRetryConfig, ...options.retry };
    this.timeout = options.timeout || 30000;
  }

  /**
   * Make an HTTP request with retry logic
   */
  protected async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      retry?: boolean;
    } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "x-hyrelog-key": this.apiKey,
      "content-type": "application/json",
      ...options.headers,
    };

    const body = options.body ? JSON.stringify(options.body) : undefined;

    const makeRequest = async (): Promise<TransportResponse> => {
      if (this.debug) {
        this.logger.debug?.("HyreLog SDK Request:", { method, url, headers: { ...headers, "x-hyrelog-key": "***" } });
      }

      return this.transport({
        method,
        url,
        headers,
        body,
        timeout: this.timeout,
      });
    };

    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 0; attempt <= (options.retry !== false ? this.retryConfig.maxRetries : 0); attempt++) {
      try {
        const response = await makeRequest();

        // Check for rate limit headers
        if (response.status === 429) {
          const retryAfter = response.headers["retry-after"];
          if (retryAfter) {
            const retryAfterMs = parseInt(retryAfter, 10) * 1000;
            if (this.debug) {
              this.logger.warn?.(`Rate limited. Retrying after ${retryAfterMs}ms`);
            }
            await this.sleep(retryAfterMs);
            continue;
          }
        }

        // Parse response
        let data: T;
        try {
          data = JSON.parse(response.body) as T;
        } catch {
          throw new Error(`Invalid JSON response: ${response.body.substring(0, 100)}`);
        }

        // Handle errors
        if (response.status >= 400) {
          const error = new Error(
            `HyreLog API error: ${response.status} ${(data as { error?: string }).error || response.body}`,
          );
          (error as { status?: number }).status = response.status;

          // Retry on retryable status codes
          if (
            options.retry !== false &&
            this.retryConfig.retryableStatusCodes.includes(response.status) &&
            attempt < this.retryConfig.maxRetries
          ) {
            if (this.debug) {
              this.logger.warn?.(`Retrying after error ${response.status} (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
            }
            await this.sleep(delay);
            delay = Math.min(delay * this.retryConfig.multiplier, this.retryConfig.maxDelay);
            lastError = error;
            continue;
          }

          throw error;
        }

        if (this.debug) {
          this.logger.debug?.("HyreLog SDK Response:", { status: response.status, data });
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx) except 429
        if (
          lastError instanceof Error &&
          "status" in lastError &&
          typeof lastError.status === "number" &&
          lastError.status >= 400 &&
          lastError.status < 500 &&
          lastError.status !== 429
        ) {
          throw lastError;
        }

        // Retry on network errors or server errors
        if (attempt < (options.retry !== false ? this.retryConfig.maxRetries : 0)) {
          if (this.debug) {
            this.logger.warn?.(`Retrying after error (attempt ${attempt + 1}/${this.retryConfig.maxRetries}):`, lastError.message);
          }
          await this.sleep(delay);
          delay = Math.min(delay * this.retryConfig.multiplier, this.retryConfig.maxDelay);
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

