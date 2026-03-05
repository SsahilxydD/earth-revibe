export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ER-${timestamp}${random}`;
}

export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ER-TKT-${timestamp}${random}`;
}

export function generateReferralCode(userId: string): string {
  const prefix = "REVIBE";
  const suffix = userId.slice(-6).toUpperCase();
  return `${prefix}-${suffix}`;
}
