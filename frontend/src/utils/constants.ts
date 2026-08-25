export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const AUTH_STORAGE_KEY = 'authflow-auth';
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const ERROR_MESSAGES = {
  generic: 'Something went wrong. Please try again.',
  offline: 'Unable to reach AuthFlow. Check that the API is running.',
  unauthorized: 'Your session has expired. Please sign in again.',
} as const;
