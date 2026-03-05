import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/earth_revibe"),
  JWT_ACCESS_SECRET: z.string().default("dev-access-secret-change-in-production-min32chars"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret-change-in-production-min32chars"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_placeholder"),
  RAZORPAY_KEY_SECRET: z.string().default("placeholder_secret"),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().default("placeholder"),
  CLOUDINARY_API_KEY: z.string().default("placeholder"),
  CLOUDINARY_API_SECRET: z.string().default("placeholder"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  ADMIN_URL: z.string().default("http://localhost:3001"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
