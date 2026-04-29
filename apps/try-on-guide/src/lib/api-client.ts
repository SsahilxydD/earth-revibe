// Minimal fetch wrapper. Browser calls go through the Next rewrite to Railway,
// server calls (SSR) use NEXT_PUBLIC_API_URL.
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

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: { field?: string; message: string }[];
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the server.',
    } as ApiError;
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw {
      status: res.status,
      code: 'PARSE_ERROR',
      message: `Invalid response (${res.status})`,
    } as ApiError;
  }

  if (!res.ok || !json.success) {
    throw {
      status: res.status,
      code: json.error?.code || 'ERROR',
      message: json.error?.message || 'Something went wrong',
      details: json.error?.details,
    } as ApiError;
  }

  return json.data as T;
}

export const api = {
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
};
