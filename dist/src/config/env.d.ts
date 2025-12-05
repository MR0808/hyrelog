import "dotenv/config";
import { z } from "zod";
/**
 * Runtime environment configuration parsed via Zod.
 */
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        test: "test";
        production: "production";
    }>>;
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    HOST: z.ZodDefault<z.ZodString>;
    DATABASE_URL: z.ZodString;
    API_KEY_SECRET: z.ZodString;
    RATE_LIMIT_PER_KEY: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    RATE_LIMIT_PER_IP: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    RATE_LIMIT_WINDOW_SECONDS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    RATE_LIMIT_BURST_MULTIPLIER: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    RATE_LIMIT_REFILL_RATE: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    BILLING_HARD_CAP_RESPONSE: z.ZodDefault<z.ZodEnum<{
        402: "402";
        429: "429";
    }>>;
    INTERNAL_TOKEN: z.ZodOptional<z.ZodString>;
    AWS_ACCESS_KEY_ID: z.ZodOptional<z.ZodString>;
    AWS_SECRET_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    AWS_REGION: z.ZodDefault<z.ZodString>;
    AWS_S3_BUCKET: z.ZodOptional<z.ZodString>;
    OTEL_SERVICE_NAME: z.ZodDefault<z.ZodString>;
    OTEL_EXPORTER_OTLP_ENDPOINT: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AppEnv = z.infer<typeof envSchema>;
export declare const env: AppEnv;
export declare const isProduction: boolean;
export {};
//# sourceMappingURL=env.d.ts.map