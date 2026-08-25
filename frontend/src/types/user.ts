export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  city: string;
  age: number;
  type: UserRole;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreateInput {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  city: string;
  age: number;
  password: string;
}

export interface AdminUserCreateInput extends UserCreateInput {
  type: UserRole;
}

export type UserUpdateInput = Partial<UserCreateInput>;

export interface AdminUserUpdateInput extends UserUpdateInput {
  type?: UserRole;
}

export interface UsersFilters {
  first_name?: string;
  last_name?: string;
  email?: string;
  city?: string;
  age?: number;
  type?: UserRole;
}

export interface UsersListResponse {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  users: User[];
}
