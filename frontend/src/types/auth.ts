import type { UserCreateInput } from './user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export type RegisterInput = UserCreateInput;

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
}
