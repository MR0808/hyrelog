import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
/**
 * Middleware to verify internal token.
 */
const verifyInternalToken = (request) => {
    const token = request.headers["x-internal-token"];
    if (!token || typeof token !== "string") {
        throw new Error("Missing x-internal-token header");
    }
    if (!env.INTERNAL_TOKEN || token !== env.INTERNAL_TOKEN) {
        throw new Error("Invalid internal token");
    }
};
const startTime = Date.now();
export const internalHealthRoutes = async (app) => {
    app.get("/internal/health", async (request) => {
        verifyInternalToken(request);
        // Check DB connection
        let dbStatus = "ok";
        try {
            await prisma.$queryRaw `SELECT 1`;
        }
        catch (error) {
            dbStatus = "error";
        }
        const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
        return {
            status: dbStatus === "ok" ? "healthy" : "unhealthy",
            uptime: {
                seconds: uptimeSeconds,
                formatted: formatUptime(uptimeSeconds),
            },
            database: {
                status: dbStatus,
            },
            version: {
                service: "hyrelog-api",
                version: "1.0.0",
            },
            timestamp: new Date().toISOString(),
        };
    });
};
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];
    if (days > 0)
        parts.push(`${days}d`);
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0)
        parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0)
        parts.push(`${secs}s`);
    return parts.join(" ");
}
//# sourceMappingURL=internal.health.js.map