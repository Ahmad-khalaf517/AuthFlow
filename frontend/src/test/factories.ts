import type { User, UsersListResponse } from '@/types/user';

export const createUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  first_name: 'Ahmad',
  last_name: 'Khalaf',
  email: 'ahmad@example.com',
  phone_number: '+96170123456',
  city: 'Beirut',
  age: 28,
  type: 'client',
  is_deleted: false,
  created_at: '2025-01-15T10:00:00.000Z',
  updated_at: '2025-01-15T10:00:00.000Z',
  ...overrides,
});

export const createAdmin = (overrides: Partial<User> = {}): User =>
  createUser({
    id: 'admin-1',
    first_name: 'Maya',
    last_name: 'Haddad',
    email: 'maya@example.com',
    type: 'admin',
    ...overrides,
  });

export const createUsersResponse = (
  overrides: Partial<UsersListResponse> = {},
): UsersListResponse => ({
  page: 1,
  limit: 10,
  total: 1,
  total_pages: 1,
  users: [createUser()],
  ...overrides,
});
