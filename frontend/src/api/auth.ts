import type { LoginCredentials, RegisterInput, TokenResponse } from '@/types/auth';
import type { User } from '@/types/user';
import { apiRequest } from './client';

export function loginRequest(credentials: LoginCredentials): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function registerRequest(data: RegisterInput): Promise<User> {
  return apiRequest<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
