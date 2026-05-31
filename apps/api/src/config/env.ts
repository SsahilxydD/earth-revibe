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
  // WhatsApp delivery webhook (Meta → us). Configure in Meta Business Manager →
  // WhatsApp → Configuration → Webhook. Verify token is what Meta echoes during
  // the GET handshake. App secret is your Meta App's "App Secret" — used to
  // verify X-Hub-Signature-256 on every incoming POST. Both optional so dev
  // doesn't break, but the webhook returns 503 if unset.
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  // Per-cycle cap on abandoned-cart sweep. The Meta tier on this account is
  // 2000 business-initiated msg/24h shared with OTP/order/loyalty/trip — keep
  // headroom. Default of 30 × 96 cycles/day = 2880 ceiling, but in practice
  // we burn well below the cap because OTP+order updates already use most.
  WHATSAPP_ABANDONED_CART_SWEEP_CAP: z.coerce.number().default(30),
  // Public HTTPS URL for the abandoned-cart template's IMAGE header. Required
  // if the approved Meta template carries an image header — Meta validates
  // the send-time payload against the template's component shape and returns
  // 132012 ("header: Format mismatch, expected IMAGE, received UNKNOWN") when
  // the header is missing. Leave unset only if the template has no header.
  WHATSAPP_ABANDONED_CART_HEADER_IMAGE_URL: z.string().url().optional(),
  // Welcome WhatsApp message, sent once right after a shopper signs up via OTP.
  // Event-driven, 1:1, inside the signup window (the user just initiated contact),
  // and consent-gated on user.whatsappOptIn — so it stays clear of the cron-marketing
  // fair-use guard rail that keeps WhatsApp out of the engagement-rule engine.
  WHATSAPP_WELCOME_TEMPLATE: z.string().default('er_welcome'),
  // Public HTTPS URL for the er_welcome template's IMAGE header. The approved
  // template carries an image header, so Meta rejects the send (132012) without
  // it — leave unset to disable the welcome send entirely (it warns + skips).
  WHATSAPP_WELCOME_HEADER_IMAGE_URL: z.string().url().optional(),
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
  // Shared secret for the Shiprocket webhook receiver — Shiprocket's dashboard
  // requires a token rather than HMAC, so this is sent in the `x-api-key`
  // header and we constant-time-compare it. Optional so dev doesn't break;
  // when unset, the webhook endpoint returns 503.
  SHIPROCKET_WEBHOOK_TOKEN: z.string().optional(),
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
  // New-order admin notifications — fires on every PLACED/CONFIRMED order.
  // Discord: rich embed with order + customer + total. Email + WhatsApp reuse
  // the same team phone/email as trip-form alerts.
  DISCORD_ORDER_WEBHOOK_URL: z.string().url().optional(),
  WHATSAPP_NEW_ORDER_TEMPLATE: z.string().default('er_new_order_alert'),
  // Comma-separated list of ops emails to CC on every new order
  ORDER_NOTIFY_EMAIL: z.string().optional(),
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
  COMMUNITY_WHATSAPP_URL: z.string().default('https://chat.whatsapp.com/HLDBhFiwYAnGiaJvzWLzfu'),
  // Loyalty redemption code delivery — pre-approved Meta template required.
  // If unset, WhatsApp delivery is skipped silently and only email is sent.
  WHATSAPP_LOYALTY_REDEMPTION_TEMPLATE: z.string().default('earth_revibe_redemption_ready'),
  // Back-in-stock alert (PR 10). Utility-category template, must include
  // {{1}} firstName + {{2}} productName in the body. The destination URL
  // (e.g. /products/<slug>) lives inside the template, not in the API
  // payload — keeps the send call free of ad-hoc URL injection.
  WHATSAPP_BACK_IN_STOCK_TEMPLATE: z.string().default('earth_revibe_back_in_stock'),
  // New-drop alert carousel (PR 10b — see docs/plans/2026-05-06-new-drop-alerts-design.md).
  // MARKETING-category template with N cards. Body params: {{1}} firstName,
  // {{2}} drop name. Per-card body params: {{1}} product name, {{2}} price.
  // Card image header is filled at send time. Default targets the 3-card
  // approval; multi-card variants land via the WhatsAppTemplateVariant
  // infrastructure in PR 8.
  WHATSAPP_DROP_ALERT_TEMPLATE: z.string().default('earth_revibe_drop_alert_3card'),
  // Public storefront base URL — used for the /u/<token> unsubscribe deep
  // link in marketing templates. Falls back to FRONTEND_URL.
  STOREFRONT_PUBLIC_URL: z.string().optional(),
  // Broadcast announcement for new trips — MARKETING-category template, must be
  // approved in Meta Business Manager before first use. Admin can override the
  // template name per-request via the broadcast API.
  WHATSAPP_TRIP_ANNOUNCEMENT_TEMPLATE: z.string().default('earth_revibe_trip_announcement'),
  // Utility-category template fired to existing applicants when a new trip
  // batch opens. Must be approved under Utility (NOT Marketing) so it
  // bypasses MM_LITE pacing. Takes 3 body vars + 1 URL button suffix.
  WHATSAPP_TRIP_OPENING_TEMPLATE: z.string().default('er_trip_opening_update'),
  WHATSAPP_TRIP_OPENING_LANG: z.string().default('en'),
  // Language code for the trip-announcement template. Meta approves each
  // template in a specific locale — our current approved template is
  // submitted as plain 'en' (English), but 'en_US' / 'en_GB' / 'hi' are also
  // valid. Whatever was selected at template submission must match exactly.
  WHATSAPP_TRIP_ANNOUNCEMENT_LANG: z.string().default('en'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
