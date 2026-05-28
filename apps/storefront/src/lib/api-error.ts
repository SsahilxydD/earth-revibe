// The api client throws a plain object `{ status, code, message, details }`
// (not an Error). For Zod validation 400s the useful, field-level text is in
// `details[0].message` while the top-level `message` is the generic
// "Validation failed". Use this everywhere we surface an API error to the user
// so they see the real reason (e.g. "PIN code must be 6 digits").
export interface ApiErrorLike {
  status?: number;
  code?: string;
  message?: string;
  details?: { field?: string; message: string }[];
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as ApiErrorLike | undefined;
  return e?.details?.[0]?.message || e?.message || fallback;
}
