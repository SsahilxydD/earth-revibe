import posthog from 'posthog-js';

// ── PostHog identity ────────────────────────────────────────────────────────

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  posthog.identify(userId, traits);
}

export function resetUser() {
  posthog.reset();
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

// ── Trip-form funnel events ─────────────────────────────────────────────────

export function trackPhoneSubmitted(properties: { phone: string }) {
  trackEvent('application_phone_submitted', properties);
}

export function trackPhoneVerified(properties: { phone: string }) {
  trackEvent('application_phone_verified', properties);
}

export function trackApplicationSubmitted(properties: {
  applicationId: string;
  travelerType: string | null;
  pastTravel: string | null;
  meetBefore: string | null;
  curated: string | null;
  tripPrefsCount: number;
}) {
  trackEvent('application_submitted', properties);
}

export function trackApplicationSubmitFailed(properties: { reason: string }) {
  trackEvent('application_submit_failed', properties);
}
