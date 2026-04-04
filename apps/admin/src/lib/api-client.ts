// In the browser, use the same-origin proxy (/api/v1) so requests avoid CORS.
// On the server (SSR), call Railway directly for speed.
const API_BASE =
  typeof window !== 'undefined'
    ? '/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

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

class ApiClient {
  async request<T = any>(
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

    // Auto-refresh on 401 — but not for auth endpoints or retries
    if (
      res.status === 401 &&
      !_isRetry &&
      path !== '/auth/refresh' &&
      path !== '/auth/login' &&
      typeof window !== 'undefined'
    ) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshed = await refreshPromise;
      if (refreshed) {
        return this.request<T>(path, options, signal, true);
      }
      // Refresh failed — redirect to login
      window.location.href = '/login';
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

  get<T = any>(path: string, signal?: AbortSignal) {
    return this.request<T>(path, { method: 'GET' }, signal);
  }

  post<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const api = new ApiClient();
