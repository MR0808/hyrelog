/**
 * Authentication utilities
 *
 * Note: HyreLog uses API key authentication, not email/password.
 * The login command validates and stores an API key (workspace or company key).
 */
// Use native fetch (Node 18+) or node-fetch fallback
async function getFetch() {
    if (typeof fetch !== "undefined") {
        return fetch;
    }
    const nodeFetch = await import("node-fetch");
    // Cast through unknown to handle type differences between native fetch and node-fetch
    return nodeFetch.default;
}
export async function validateApiKey(apiKey, baseUrl = "https://api.hyrelog.com") {
    const fetchFn = await getFetch();
    let connectionError = null;
    // Try workspace endpoint first
    try {
        const workspaceResponse = await fetchFn(`${baseUrl}/v1/key/workspace`, {
            headers: {
                "x-hyrelog-key": apiKey,
            },
        });
        if (workspaceResponse.ok) {
            return { valid: true, type: "workspace" };
        }
        // If we get a 401/403, the key format is correct but invalid
        if (workspaceResponse.status === 401 || workspaceResponse.status === 403) {
            return {
                valid: false,
                error: "Invalid API key. The key format is correct but authentication failed.",
            };
        }
    }
    catch (error) {
        connectionError = error instanceof Error ? error : new Error(String(error));
        // Continue to try company endpoint
    }
    // Try company endpoint
    try {
        const companyResponse = await fetchFn(`${baseUrl}/v1/key/company`, {
            headers: {
                "x-hyrelog-key": apiKey,
            },
        });
        if (companyResponse.ok) {
            return { valid: true, type: "company" };
        }
        // If we get a 401/403, the key format is correct but invalid
        if (companyResponse.status === 401 || companyResponse.status === 403) {
            return {
                valid: false,
                error: "Invalid API key. The key format is correct but authentication failed.",
            };
        }
    }
    catch (error) {
        if (!connectionError) {
            connectionError = error instanceof Error ? error : new Error(String(error));
        }
    }
    // If we got connection errors, provide helpful message
    if (connectionError) {
        const errorMsg = connectionError.message.toLowerCase();
        if (errorMsg.includes("fetch failed") || errorMsg.includes("econnrefused") || errorMsg.includes("enotfound")) {
            return {
                valid: false,
                error: `Cannot connect to API at ${baseUrl}. Make sure the server is running. For local development, use: --url http://localhost:4040`,
            };
        }
        return {
            valid: false,
            error: `Connection error: ${connectionError.message}. Make sure the server is running at ${baseUrl}`,
        };
    }
    return {
        valid: false,
        error: "Invalid API key. The key must be a valid workspace or company API key.",
    };
}
/**
 * Validate and return the API key
 * For HyreLog, "login" means validating and storing an API key
 */
export async function authenticate(apiKey, baseUrl = "https://api.hyrelog.com") {
    const validation = await validateApiKey(apiKey, baseUrl);
    if (!validation.valid) {
        throw new Error(validation.error || "Invalid API key");
    }
    return apiKey;
}
