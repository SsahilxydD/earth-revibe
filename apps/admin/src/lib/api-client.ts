import { createClient } from "@/lib/supabase/client";

// Ensure API_BASE is always an absolute URL - guard against missing https:// protocol
function resolveApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || "https://earth-revibeapi-production.up.railway.app/api/v1";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}
const API_BASE = resolveApiBase();

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: { field?: string; message: string }[];
  };
}

class ApiClient {
  /** Get access token from Supabase session — Supabase handles refresh automatically */
  private async getToken(): Promise<string | null> {
    if (typeof window === "undefined") return null;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  async request<T = any>(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal });

    let json: ApiResponse<T>;
    try {
      json = await res.json();
    } catch {
      throw {
        status: res.status,
        code: "NETWORK_ERROR",
        message: res.status === 0
          ? "Cannot reach the API server. Check CORS or network."
          : `Server returned non-JSON response (${res.status})`,
      };
    }

    if (!res.ok || !json.success) {
      throw {
        status: res.status,
        code: json.error?.code || "ERROR",
        message: json.error?.message || "Something went wrong",
        details: json.error?.details,
      };
    }

    return json.data as T;
  }

  get<T = any>(path: string, signal?: AbortSignal) {
    return this.request<T>(path, { method: "GET" }, signal);
  }

  post<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
