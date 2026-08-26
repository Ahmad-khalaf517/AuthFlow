import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigate,
}));

beforeEach(() => navigate.mockReset());

describe('LoginForm', () => {
  it('shows accessible validation errors and toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('authenticates and navigates to the dashboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText('Email address'), 'ahmad@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/dashboard', replace: true }));
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, token: 'test-token' });
  });

  it('shows an API error and remains on the page', async () => {
    server.use(
      http.post(`${api}/auth/login`, () =>
        HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(screen.getByLabelText('Email address'), 'ahmad@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() =>
      expect(useUiStore.getState().toasts.at(-1)).toMatchObject({
        message: 'Invalid email or password',
        type: 'error',
      }),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('RegisterForm', () => {
  async function completeRegistration(password = 'password1', confirmation = 'password1') {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('First name'), 'Ahmad');
    await user.type(screen.getByLabelText('Last name'), 'Khalaf');
    await user.type(screen.getByLabelText('Email address'), 'ahmad@example.com');
    await user.type(screen.getByLabelText('Phone number'), '+96170123456');
    await user.type(screen.getByLabelText('City'), 'Beirut');
    const age = screen.getByLabelText('Age');
    await user.clear(age);
    await user.type(age, '28');
    await user.type(screen.getByLabelText('Password'), password);
    await user.type(screen.getByLabelText('Confirm password'), confirmation);
    return user;
  }

  it('keeps submission disabled until the form is valid and catches mismatched passwords', async () => {
    renderWithProviders(<RegisterForm />);
    const user = await completeRegistration('password1', 'password2');
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    await user.clear(screen.getByLabelText('Confirm password'));
    await user.type(screen.getByLabelText('Confirm password'), 'password1');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled(),
    );
  });

  it('registers, logs in, shows success feedback, and navigates', async () => {
    renderWithProviders(<RegisterForm />);
    const user = await completeRegistration();
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/dashboard', replace: true }));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useUiStore.getState().toasts.at(-1)).toMatchObject({ type: 'success' });
  });

  it('surfaces registration errors without logging in', async () => {
    server.use(
      http.post(`${api}/auth/register`, () =>
        HttpResponse.json({ detail: 'Email already exists' }, { status: 409 }),
      ),
    );
    renderWithProviders(<RegisterForm />);
    const user = await completeRegistration();
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(useUiStore.getState().toasts.at(-1)).toMatchObject({
        message: 'Email already exists',
        type: 'error',
      }),
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
