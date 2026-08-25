import type { User } from '@/types/user';

export function getInitials(user: Pick<User, 'first_name' | 'last_name'>): string {
  return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
}

export function getFullName(user: Pick<User, 'first_name' | 'last_name'>): string {
  return `${user.first_name} ${user.last_name}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatAverageAge(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
