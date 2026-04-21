import { z } from 'zod';

// NODE_ENV must tolerate whatever Railway/hosts inject (empty string,
// 'Production' with capitals, trailing whitespace, etc.) — we normalise to a
// canonical lowercase value and fall back to 'development' for anything
// unrecognised so app startup never fails on this single variable.
const nodeEnvSchema = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return 'development';
    const normalised = v.trim().toLowerCase();
    if (['development', 'production', 'test'].includes(normalised)) {
      return normalised;
    }
    return 'development';
  },
  z.enum(['development', 'production', 'test'])
);

const envSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().optional(),
  // JWT auth
  JWT_SECRET: z.string().min(32),
  // WhatsApp Cloud API (OTP login)
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_TEMPLATE_NAME: z.string().default('earth_revibe_login_otp'),
  WHATSAPP_ORDER_UPDATE_TEMPLATE: z.string().default('earth_revibe_order_update'),
  // Supabase Storage (image uploads only — auth is handled by JWT)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_IMAGES_API_TOKEN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  ADMIN_URL: z.string().default('http://localhost:3001'),
  TRIP_FORM_URL: z.string().default('http://localhost:3002'),
  SHIPROCKET_EMAIL: z.string().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),
  SHIPROCKET_PICKUP_PINCODE: z.string().default('380014'),
  SHIPROCKET_PICKUP_LOCATION: z.string().default('Earthrevibe'),
  // Meta Conversions API (server-side pixel)
  META_PIXEL_ID: z.string().default('1263879098593572'),
  META_CONVERSIONS_API_TOKEN: z.string().optional(),
  // PostHog server-side analytics
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
  // Resend email service
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('Earth Revibe <noreply@earthrevibe.com>'),
  // Razorpay COD review API — Basic Auth credentials
  RAZORPAY_COD_REVIEW_USERNAME: z.string().optional(),
  RAZORPAY_COD_REVIEW_PASSWORD: z.string().optional(),
  // Mappls (MapmyIndia) address autosuggest — static REST API key
  MAPPLS_API_KEY: z.string().optional(),
  // COD surcharge in rupees (0 = free COD)
  COD_FEE: z.coerce.number().default(0),
  // Cron job secret — protects internal endpoints from public access
  CRON_SECRET: z.string().optional(),
  // Trip-form application notifications
  // Discord webhook — posts rich embed with every field on each new application
  DISCORD_TRIP_FORM_WEBHOOK_URL: z.string().url().optional(),
  // WhatsApp — short templated alert to a team number (pre-approved template required)
  TRIP_FORM_NOTIFY_PHONE: z.string().optional(), // E.164, e.g. "+919876543210"
  WHATSAPP_TRIP_APPLICATION_TEMPLATE: z.string().default('earth_revibe_trip_application_alert'),
  // Applicant-facing acknowledgement sent the moment the form is submitted
  // (fires in parallel with the acknowledgement email).
  WHATSAPP_TRIP_RECEIVED_TEMPLATE: z.string().default('earth_revibe_trip_received'),
  // Applicant-facing decision templates — sent when admin changes status.
  WHATSAPP_TRIP_APPROVED_TEMPLATE: z.string().default('earth_revibe_trip_approved'),
  WHATSAPP_TRIP_REJECTED_TEMPLATE: z.string().default('earth_revibe_trip_rejected'),
  WHATSAPP_TRIP_WAITLISTED_TEMPLATE: z.string().default('earth_revibe_trip_waitlisted'),
  // Applicant-facing approved template now has a 3rd body variable = the
  // community WhatsApp group link. Override via Railway env if the invite
  // URL ever changes (don't redeploy just for that).
  COMMUNITY_WHATSAPP_URL: z
    .string()
    .default('https://chat.whatsapp.com/HLDBhFiwYAnGiaJvzWLzfu'),
  // Loyalty redemption code delivery — pre-approved Meta template required.
  // If unset, WhatsApp delivery is skipped silently and only email is sent.
  WHATSAPP_LOYALTY_REDEMPTION_TEMPLATE: z.string().default('earth_revibe_redemption_ready'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
