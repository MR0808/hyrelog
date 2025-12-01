import "dotenv/config";
import { z } from "zod";
/**
 * Runtime environment configuration parsed via Zod.
 */
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    HOST: z.ZodDefault<z.ZodString>;
    DATABASE_URL: z.ZodString;
    API_KEY_SECRET: z.ZodString;
    RATE_LIMIT_PER_KEY: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_PER_IP: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_WINDOW_SECONDS: z.ZodDefault<z.ZodNumber>;
    BILLING_HARD_CAP_RESPONSE: z.ZodDefault<z.ZodEnum<["402", "429"]>>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    HOST: string;
    DATABASE_URL: string;
    API_KEY_SECRET: string;
    RATE_LIMIT_PER_KEY: number;
    RATE_LIMIT_PER_IP: number;
    RATE_LIMIT_WINDOW_SECONDS: number;
    BILLING_HARD_CAP_RESPONSE: "402" | "429";
}, {
    DATABASE_URL: string;
    API_KEY_SECRET: string;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    HOST?: string | undefined;
    RATE_LIMIT_PER_KEY?: number | undefined;
    RATE_LIMIT_PER_IP?: number | undefined;
    RATE_LIMIT_WINDOW_SECONDS?: number | undefined;
    BILLING_HARD_CAP_RESPONSE?: "402" | "429" | undefined;
}>;
export type AppEnv = z.infer<typeof envSchema>;
export declare const env: AppEnv;
export declare const isProduction: boolean;
export {};
//# sourceMappingURL=env.d.ts.map