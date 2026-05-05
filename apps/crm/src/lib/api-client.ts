// Identical pattern to admin's api-client. Both apps call the same Railway
// API; the JWT cookie is stored against the API origin so a session in one
// app authenticates the other automatically.

const API_BASE =
  typeof window !== 'undefined'
    ? '/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: { field?: string; message: string }[];
  };
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

const REFRESH_INTERVAL_MS = 13 * 60 * 1000;
const REFRESH_THROTTLE_MS = 2 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;
let lastRefreshAt = 0;

function refreshIfVisible() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - lastRefreshAt < REFRESH_THROTTLE_MS) return;
  lastRefreshAt = Date.now();
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
}

export function startProactiveRefresh() {
  if (typeof window === 'undefined') return;
  stopProactiveRefresh();
  refreshTimer = setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
  visibilityHandler = refreshIfVisible;
  document.addEventListener('visibilitychange', visibilityHandler);
}

export function stopProactiveRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  lastRefreshAt = 0;
}

class ApiClient {
  async request<T = unknown>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal,
    _isRetry = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
        signal,
      });
    } catch {
      throw {
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Cannot reach the API server. Check CORS or network.',
      };
    }

    if (
      res.status === 401 &&
      !_isRetry &&
      path !== '/auth/refresh' &&
      path !== '/auth/login' &&
      typeof window !== 'undefined'
    ) {
      if (!refreshPromise) {
        lastRefreshAt = Date.now();
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshed = await refreshPromise;
      if (refreshed) {
        return this.request<T>(path, options, signal, true);
      }
      try {
        return await this.request<T>(path, options, signal, true);
      } catch {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {});
        window.location.href = '/login';
      }
    }

    let json: ApiResponse<T>;
    try {
      json = await res.json();
    } catch {
      throw {
        status: res.status,
        code: 'NETWORK_ERROR',
        message:
          res.status === 0
            ? 'Cannot reach the API server. Check CORS or network.'
            : `Server returned non-JSON response (${res.status})`,
      };
    }

    if (!res.ok || !json.success) {
      throw {
        status: res.status,
        code: json.error?.code || 'ERROR',
        message: json.error?.message || 'Something went wrong',
        details: json.error?.details,
      };
    }

    return json.data as T;
  }

  get<T = unknown>(path: string, signal?: AbortSignal) {
    return this.request<T>(path, { method: 'GET' }, signal);
  }

  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = unknown>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const api = new ApiClient();
