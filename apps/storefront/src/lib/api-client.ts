import { createClient } from "@/lib/supabase/client";

// In the browser, use the same-origin proxy (/api/v1) so requests go through
// Vercel's edge instead of hitting Railway directly. This avoids mobile carrier
// DNS/routing issues (Jio, Airtel) that block connections to Railway.
// On the server (SSR), call Railway directly for speed.
const API_BASE =
  typeof window !== "undefined"
    ? "/api/v1"
    : (process.env.NEXT_PUBLIC_API_URL || "https://earth-revibeapi-production.up.railway.app/api/v1");

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: { field?: string; message: string }[] };
}

/**
 * Get the current Supabase access token from the browser session.
 * Returns null on the server or if no session exists.
 */
async function getSupabaseToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this._doRefresh().finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }

  private async _doRefresh(): Promise<boolean> {
    try {
      // Try refreshing the Supabase session first
      if (typeof window !== "undefined") {
        const supabase = createClient();
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) return true;
      }
      // Fallback to API cookie refresh
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
      if (!res.ok) return false;
      const json = await res.json();
      return json.success === true;
    } catch { return false; }
  }

  async request<T = any>(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };

    // Attach Supabase Bearer token — works through the Vercel proxy
    // (unlike httpOnly cookies which are domain-bound to Railway)
    const token = await getSupabaseToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include", signal });
    } catch {
      throw { status: 0, code: "NETWORK_ERROR", message: "Cannot reach the server." };
    }
    if (res.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Re-read token after refresh
        const newToken = await getSupabaseToken();
        if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
        try { res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include", signal }); }
        catch { throw { status: 0, code: "NETWORK_ERROR", message: "Cannot reach the server." }; }
      }
    }
    let json: ApiResponse<T>;
    try { json = await res.json(); } catch { throw { status: res.status, code: "PARSE_ERROR", message: `Invalid response (${res.status})` }; }
    if (!res.ok || !json.success) throw { status: res.status, code: json.error?.code || "ERROR", message: json.error?.message || "Something went wrong", details: json.error?.details };
    return json.data as T;
  }

  get<T = any>(path: string, signal?: AbortSignal) { return this.request<T>(path, { method: "GET" }, signal); }
  post<T = any>(path: string, body?: any) { return this.request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }); }
  put<T = any>(path: string, body?: any) { return this.request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }); }
  delete<T = any>(path: string) { return this.request<T>(path, { method: "DELETE" }); }
}

export const api = new ApiClient();
