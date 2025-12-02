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
  RATE_LIMIT_BURST_MULTIPLIER: z.coerce.number().positive().default(2.0), // Burst limit = limit * multiplier
  RATE_LIMIT_REFILL_RATE: z.coerce.number().positive().optional(), // Tokens per second (optional, uses leaky bucket if not set)
  BILLING_HARD_CAP_RESPONSE: z.enum(["402", "429"]).default("429"),
  INTERNAL_TOKEN: z.string().min(32).optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_S3_BUCKET: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default("hyrelog-api"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === "production";

