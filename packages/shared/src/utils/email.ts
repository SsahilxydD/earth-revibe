/**
 * Phone-OTP signups get a synthetic placeholder email
 * (`91XXXXXXXXXX@phone.earthrevibe.com`) because the account model requires a
 * unique email. A real one must replace it before order confirmations land and
 * loyalty redemption (which is email-gated) works — callers gate on this check.
 * A missing email counts as a placeholder too (still needs collecting).
 */
export const PLACEHOLDER_EMAIL_DOMAIN = '@phone.earthrevibe.com';

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !email || email.endsWith(PLACEHOLDER_EMAIL_DOMAIN);
}
