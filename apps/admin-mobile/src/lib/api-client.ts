import { tokenStore } from './secure-store';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  /** Set true to bypass auth (login, refresh) */
  skipAuth?: boolean;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

interface ApiError {
  success: false;
  error: { code: string; message: string };
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Coalesce concurrent refreshes — many requests hitting 401 at once should
  // share one refresh round-trip, not race.
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const { refreshToken } = await tokenStore.getTokens();
      if (!refreshToken) return null;

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client': 'mobile',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;
      const json = (await res.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
      }>;
      if (!json.success) return null;
      await tokenStore.setTokens(json.data.accessToken, json.data.refreshToken);
      return json.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client': 'mobile',
    ...headers,
  };

  if (!skipAuth) {
    const { accessToken } = await tokenStore.getTokens();
    if (accessToken) baseHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const doFetch = async (token?: string) => {
    const finalHeaders = { ...baseHeaders };
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  // Auto-refresh on 401 (unless we were already trying to refresh / login).
  if (res.status === 401 && !skipAuth && path !== '/auth/refresh') {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      res = await doFetch(newAccess);
    }
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    // Non-JSON response (e.g. 502 from a proxy)
    throw new ApiClientError(`Network error (${res.status})`, res.status);
  }

  if (!res.ok || !json || !json.success) {
    const message = json && !json.success ? json.error.message : `Request failed (${res.status})`;
    const code = json && !json.success ? json.error.code : undefined;
    throw new ApiClientError(message, res.status, code);
  }

  return json.data;
}

export const api = {
  get: <T>(path: string, opts?: ApiOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: ApiOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};

export { ApiClientError, API_URL };
