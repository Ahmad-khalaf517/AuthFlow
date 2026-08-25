import type { ApiErrorPayload, ValidationErrorItem } from '@/types/api';
import { API_BASE_URL, AUTH_STORAGE_KEY, ERROR_MESSAGES } from '@/utils/constants';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly validationErrors: ValidationErrorItem[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getPersistedToken(): string | null {
  try {
    const persisted = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!persisted) return null;
    const parsed = JSON.parse(persisted) as { state?: { token?: unknown } };
    return typeof parsed.state?.token === 'string' ? parsed.state.token : null;
  } catch {
    return null;
  }
}

function getErrorMessage(payload: ApiErrorPayload | null, status: number): string {
  if (typeof payload?.detail === 'string') return payload.detail;
  if (Array.isArray(payload?.detail)) return payload.detail.map((item) => item.msg).join('. ');
  if (status === 401) return ERROR_MESSAGES.unauthorized;
  return ERROR_MESSAGES.generic;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');

  const token = getPersistedToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(ERROR_MESSAGES.offline, 0);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    const validationErrors = Array.isArray(payload?.detail) ? payload.detail : [];
    if (response.status === 401 && token) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.assign('/login');
    }
    throw new ApiError(
      getErrorMessage(payload, response.status),
      response.status,
      validationErrors,
    );
  }

  return (await response.json()) as T;
}
