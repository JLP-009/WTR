let activeToken: string | null = (typeof localStorage !== 'undefined' ? localStorage.getItem('wtr_access_token') : null);
let activeRefreshToken: string | null = (typeof localStorage !== 'undefined' ? localStorage.getItem('wtr_refresh_token') : null);

export function setAuthToken(token: string | null, refreshToken?: string | null) {
  activeToken = token;
  if (refreshToken !== undefined) {
    activeRefreshToken = refreshToken;
  }
  if (typeof localStorage !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem('wtr_access_token', token);
      } else {
        localStorage.removeItem('wtr_access_token');
      }
      if (refreshToken) {
        localStorage.setItem('wtr_refresh_token', refreshToken);
      } else if (refreshToken === null) {
        localStorage.removeItem('wtr_refresh_token');
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

export function getRefreshToken(): string | null {
  if (!activeRefreshToken && typeof localStorage !== 'undefined') {
    try {
      activeRefreshToken = localStorage.getItem('wtr_refresh_token');
    } catch {}
  }
  return activeRefreshToken;
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
      const refreshToken = getRefreshToken();
      if (refreshToken && !endpoint.includes('/auth/refresh')) {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
          });
          const refreshJson = await refreshRes.json();
          if (refreshRes.ok && refreshJson.data?.access_token) {
            setAuthToken(refreshJson.data.access_token, refreshJson.data.refresh_token);
            
            // Retry original request
            headers['Authorization'] = `Bearer ${refreshJson.data.access_token}`;
            const retryRes = await fetch(url, { ...options, headers });
            const retryJson: ApiResponse<T> = await retryRes.json();
            if (retryRes.ok && !retryJson.error) {
              return retryJson.data;
            }
          }
        } catch (e) {
          // Ignore error and fall through to logout
        }
      }

      // If refresh failed or no refresh token
      setAuthToken(null, null);
      try {
        localStorage.removeItem('wtr_user_session');
        window.location.href = '/login'; // Optional: force redirect
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
