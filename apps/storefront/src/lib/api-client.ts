const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://earth-revibeapi-production.up.railway.app/api/v1";

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
  private refreshPromise: Promise<boolean> | null = null;

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async _doRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) return false;

      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  }

  async request<T = any>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    let res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal,
    });

    // If 401, try refresh
    if (res.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        res = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
          credentials: "include",
          signal,
        });
      }
    }

    const json: ApiResponse<T> = await res.json();

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
