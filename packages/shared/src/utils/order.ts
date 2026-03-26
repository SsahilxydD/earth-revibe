export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  // Use crypto for better randomness to avoid collisions at scale
  const randomBytes =
    typeof globalThis.crypto !== 'undefined'
      ? globalThis.crypto.getRandomValues(new Uint8Array(4))
      : new Uint8Array([
          Math.floor(Math.random() * 256),
          Math.floor(Math.random() * 256),
          Math.floor(Math.random() * 256),
          Math.floor(Math.random() * 256),
        ]);
  const random = Array.from(randomBytes)
    .map((b) => b.toString(36))
    .join('')
    .toUpperCase()
    .slice(0, 6);
  return `ER-${timestamp}${random}`;
}

export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomBytes =
    typeof globalThis.crypto !== 'undefined'
      ? globalThis.crypto.getRandomValues(new Uint8Array(3))
      : new Uint8Array([
          Math.floor(Math.random() * 256),
          Math.floor(Math.random() * 256),
          Math.floor(Math.random() * 256),
        ]);
  const random = Array.from(randomBytes)
    .map((b) => b.toString(36))
    .join('')
    .toUpperCase()
    .slice(0, 4);
  return `ER-TKT-${timestamp}${random}`;
}

export function generateReferralCode(userId: string): string {
  const prefix = 'REVIBE';
  const suffix = userId.slice(-6).toUpperCase();
  return `${prefix}-${suffix}`;
}
