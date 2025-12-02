/**
 * Authentication utilities
 *
 * Note: HyreLog uses API key authentication, not email/password.
 * The login command validates and stores an API key (workspace or company key).
 */
export declare function validateApiKey(apiKey: string, baseUrl?: string): Promise<{
    valid: boolean;
    type?: "workspace" | "company";
    error?: string;
}>;
/**
 * Validate and return the API key
 * For HyreLog, "login" means validating and storing an API key
 */
export declare function authenticate(apiKey: string, baseUrl?: string): Promise<string>;
