import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/test/handlers';
import { createAdmin, createUser } from '@/test/factories';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { DashboardPage } from './DashboardPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

beforeEach(() => useAuthStore.setState({ isAuthenticated: true }));

describe('DashboardPage', () => {
  it('shows the client account overview and profile action', async () => {
    const client = createUser();
    useAuthStore.setState({ user: client });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('heading', { name: 'Welcome back, Ahmad.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Account details' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review profile/ })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(screen.queryByRole('heading', { name: 'Workspace pulse' })).not.toBeInTheDocument();
  });

  it('shows live statistics and admin quick actions', async () => {
    const admin = createAdmin();
    server.use(http.get(`${api}/users/me`, () => HttpResponse.json(admin)));
    useAuthStore.setState({ user: admin });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('heading', { name: 'Welcome back, Maya.' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument());
    expect(screen.getByText(/31.5/)).toBeInTheDocument();
    expect(screen.getByText('Beirut')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage users/ })).toHaveAttribute('href', '/users');
    expect(screen.getByRole('link', { name: /My profile/ })).toHaveAttribute('href', '/profile');
  });

  it('renders nothing until a current user exists', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    const { container } = renderWithProviders(<DashboardPage />);
    expect(container).toBeEmptyDOMElement();
  });
});
