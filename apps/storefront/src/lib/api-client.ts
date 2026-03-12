// Ensure API_BASE is always an absolute URL
function resolveApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || "https://earth-revibeapi-production.up.railway.app/api/v1";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}
const API_BASE = resolveApiBase();

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: { field?: string; message: string }[] };
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
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
      if (!res.ok) return false;
      const data = await res.json();
      return data.success === true;
    } catch { return false; }
  }

  async request<T = any>(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include", signal });
    } catch {
      throw { status: 0, code: "NETWORK_ERROR", message: "Cannot reach the server." };
    }
    if (res.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
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
