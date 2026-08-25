import type {
  AdminUserCreateInput,
  AdminUserUpdateInput,
  User,
  UsersFilters,
  UsersListResponse,
  UserUpdateInput,
} from '@/types/user';
import { apiRequest } from './client';

export function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/users/me');
}

export function updateCurrentUser(data: UserUpdateInput): Promise<User> {
  return apiRequest<User>('/users/me', { method: 'PUT', body: JSON.stringify(data) });
}

export interface GetUsersParams extends UsersFilters {
  page: number;
  limit: number;
}

export function getUsers(params: GetUsersParams): Promise<UsersListResponse> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return apiRequest<UsersListResponse>(`/users?${search.toString()}`);
}

export function createUser(data: AdminUserCreateInput): Promise<User> {
  return apiRequest<User>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id: string, data: AdminUserUpdateInput): Promise<User> {
  return apiRequest<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteUser(id: string): Promise<User> {
  return apiRequest<User>(`/users/${id}`, { method: 'DELETE' });
}
