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
    INTERNAL_TOKEN: z.ZodOptional<z.ZodString>;
    AWS_ACCESS_KEY_ID: z.ZodOptional<z.ZodString>;
    AWS_SECRET_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    AWS_REGION: z.ZodDefault<z.ZodString>;
    AWS_S3_BUCKET: z.ZodOptional<z.ZodString>;
    OTEL_SERVICE_NAME: z.ZodDefault<z.ZodString>;
    OTEL_EXPORTER_OTLP_ENDPOINT: z.ZodOptional<z.ZodString>;
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
    AWS_REGION: string;
    OTEL_SERVICE_NAME: string;
    INTERNAL_TOKEN?: string | undefined;
    AWS_ACCESS_KEY_ID?: string | undefined;
    AWS_SECRET_ACCESS_KEY?: string | undefined;
    AWS_S3_BUCKET?: string | undefined;
    OTEL_EXPORTER_OTLP_ENDPOINT?: string | undefined;
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
    INTERNAL_TOKEN?: string | undefined;
    AWS_ACCESS_KEY_ID?: string | undefined;
    AWS_SECRET_ACCESS_KEY?: string | undefined;
    AWS_REGION?: string | undefined;
    AWS_S3_BUCKET?: string | undefined;
    OTEL_SERVICE_NAME?: string | undefined;
    OTEL_EXPORTER_OTLP_ENDPOINT?: string | undefined;
}>;
export type AppEnv = z.infer<typeof envSchema>;
export declare const env: AppEnv;
export declare const isProduction: boolean;
export {};
//# sourceMappingURL=env.d.ts.map