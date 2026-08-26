import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { createAdmin, createUser } from '@/test/factories';
import { AuthLayout } from './AuthLayout';
import { Header } from './Header';
import { MainLayout } from './MainLayout';
import { Sidebar } from './Sidebar';

const routerState = vi.hoisted(() => ({ pathname: '/dashboard' }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect" data-to={to} />,
  Outlet: () => <div>Current route</div>,
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: routerState }),
}));

describe('application layouts', () => {
  it('renders authentication branding and its nested route', () => {
    render(<AuthLayout />);
    expect(
      screen.getByRole('heading', { name: 'The calm, clear way to manage access.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Secure by design')).toBeInTheDocument();
    expect(screen.getByText('Current route')).toBeInTheDocument();
  });

  it('hides the header without a user and opens mobile navigation for a user', async () => {
    const { rerender } = render(<Header />);
    expect(document.querySelector('header')).toBeNull();
    useAuthStore.setState({ user: createUser() });
    rerender(<Header />);
    expect(screen.getByText('Ahmad Khalaf')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(useUiStore.getState().isSidebarOpen).toBe(true);
  });

  it('shows role-specific navigation, active state, and signs out', async () => {
    useAuthStore.setState({
      user: createUser(),
      isAuthenticated: true,
      token: 'token',
    });
    const { rerender } = render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'User management' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');

    useAuthStore.setState({ user: createAdmin() });
    routerState.pathname = '/users';
    rerender(<Sidebar />);
    expect(screen.getByRole('link', { name: 'User management' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('renders and closes the mobile sidebar and backdrop', async () => {
    useAuthStore.setState({ user: createUser() });
    useUiStore.setState({ isSidebarOpen: true });
    render(<Sidebar />);
    expect(screen.getByLabelText('Mobile navigation')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Close navigation' })[0]!);
    expect(useUiStore.getState().isSidebarOpen).toBe(false);
  });

  it('protects and renders the main application layout', () => {
    useAuthStore.setState({
      user: createUser(),
      isAuthenticated: true,
      isHydrated: true,
    });
    render(<MainLayout />);
    expect(screen.getAllByText('Current route')).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
