let activeToken: string | null = (typeof localStorage !== 'undefined' ? localStorage.getItem('wtr_access_token') : null);

export function setAuthToken(token: string | null) {
  activeToken = token;
  if (typeof localStorage !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem('wtr_access_token', token);
      } else {
        localStorage.removeItem('wtr_access_token');
      }
    } catch {}
  }
}

export function getAuthToken(): string | null {
  if (!activeToken && typeof localStorage !== 'undefined') {
    try {
      activeToken = localStorage.getItem('wtr_access_token');
    } catch {}
  }
  return activeToken;
}

const defaultHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BASE_URL = import.meta.env.VITE_API_URL || `http://${defaultHost}:3000/api/v1`;

export interface ApiResponse<T> {
  data: T;
  request_id?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || json.error) {
    if (response.status === 401) {
      activeToken = null;
      try {
        localStorage.removeItem('wtr_access_token');
        localStorage.removeItem('wtr_user_session');
      } catch {}
    }
    const errorMsg = json.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as Error & { code?: string; details?: unknown; statusCode?: number };
    err.code = json.error?.code;
    err.details = json.error?.details;
    err.statusCode = response.status;
    throw err;
  }

  return json.data;
}

export const api = {
  get: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', headers }),
  post: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),
  put: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),
  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
};
