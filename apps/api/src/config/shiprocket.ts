import { env } from "./env";

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get a valid Shiprocket auth token. Caches for 9 days (tokens last 10 days).
 */
export async function getShiprocketToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (!env.SHIPROCKET_EMAIL || !env.SHIPROCKET_PASSWORD) {
    throw new Error("Shiprocket credentials not configured");
  }

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.SHIPROCKET_EMAIL,
      password: env.SHIPROCKET_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`Shiprocket auth failed: ${res.status}`);
  }

  const data: any = await res.json();
  cachedToken = data.token;
  // Cache for 9 days (Shiprocket tokens last 10 days)
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
  return cachedToken!;
}

/**
 * Make an authenticated request to the Shiprocket API.
 */
export async function shiprocketRequest<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const token = await getShiprocketToken();

  const res = await fetch(`${SHIPROCKET_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data: any = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Shiprocket API error: ${res.status}`);
  }

  return data as T;
}
