import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { createAdmin, createUser } from '@/test/factories';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('@tanstack/react-router', () => ({
  Navigate: ({ to, replace }: { to: string; replace: boolean }) => (
    <div data-testid="redirect" data-to={to} data-replace={String(replace)} />
  ),
}));

describe('ProtectedRoute', () => {
  it('shows a session loader before persisted state hydrates', () => {
    useAuthStore.setState({ isHydrated: false });
    render(<ProtectedRoute>Private</ProtectedRoute>);
    expect(screen.getByLabelText('Loading session')).toBeInTheDocument();
  });

  it('redirects signed-out users to login', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });
    render(<ProtectedRoute>Private</ProtectedRoute>);
    expect(screen.getByTestId('redirect')).toHaveAttribute('data-to', '/login');
  });

  it('allows authenticated clients on normal private pages', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true, user: createUser() });
    render(<ProtectedRoute>Private</ProtectedRoute>);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('redirects clients away from admin pages but allows admins', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true, user: createUser() });
    const { rerender } = render(<ProtectedRoute adminOnly>Admin tools</ProtectedRoute>);
    expect(screen.getByTestId('redirect')).toHaveAttribute('data-to', '/dashboard');
    useAuthStore.setState({ user: createAdmin() });
    rerender(<ProtectedRoute adminOnly>Admin tools</ProtectedRoute>);
    expect(screen.getByText('Admin tools')).toBeInTheDocument();
  });
});
