import "dotenv/config";
import { z } from "zod";
/**
 * Runtime environment configuration parsed via Zod.
 */
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4040),
    HOST: z.string().default("0.0.0.0"),
    DATABASE_URL: z.string().url(),
    API_KEY_SECRET: z.string().min(32),
    RATE_LIMIT_PER_KEY: z.coerce.number().int().positive().default(1200),
    RATE_LIMIT_PER_IP: z.coerce.number().int().positive().default(600),
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    BILLING_HARD_CAP_RESPONSE: z.enum(["402", "429"]).default("429"),
});
export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
//# sourceMappingURL=env.js.map