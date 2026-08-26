import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { api } from '@/test/handlers';
import { createUser } from '@/test/factories';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { ProfileForm } from './ProfileForm';

describe('ProfileForm', () => {
  it('loads user values, enables only when dirty, and omits a blank password', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put(`${api}/users/me`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createUser(body));
      }),
    );
    const current = createUser();
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm user={current} />);
    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();
    expect(screen.getByLabelText('Email address')).toHaveValue(current.email);
    await user.clear(screen.getByLabelText('City'));
    await user.type(screen.getByLabelText('City'), 'Tripoli');
    expect(save).toBeEnabled();
    await user.click(save);
    await waitFor(() => expect(body).toMatchObject({ city: 'Tripoli' }));
    expect(body).not.toHaveProperty('password');
    expect(useAuthStore.getState().user).toMatchObject({ city: 'Tripoli' });
    expect(useUiStore.getState().toasts.at(-1)).toMatchObject({ type: 'success' });
    await waitFor(() => expect(save).toBeDisabled());
  });

  it('validates a supplied password and sends it when valid', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put(`${api}/users/me`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createUser());
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm user={createUser()} />);
    await user.type(screen.getByLabelText('New password'), 'weak');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('New password'));
    await user.type(screen.getByLabelText('New password'), 'newpass1');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(body).toMatchObject({ password: 'newpass1' }));
  });

  it('shows an API failure and preserves the edited value', async () => {
    server.use(
      http.put(`${api}/users/me`, () =>
        HttpResponse.json({ detail: 'Email already exists' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm user={createUser()} />);
    await user.clear(screen.getByLabelText('Email address'));
    await user.type(screen.getByLabelText('Email address'), 'taken@example.com');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(useUiStore.getState().toasts.at(-1)).toMatchObject({
        message: 'Email already exists',
        type: 'error',
      }),
    );
    expect(screen.getByLabelText('Email address')).toHaveValue('taken@example.com');
  });

  it('resets fields when a different user prop arrives', () => {
    const first = createUser();
    const { rerender } = renderWithProviders(<ProfileForm user={first} />);
    rerender(<ProfileForm user={createUser({ id: 'user-2', city: 'Byblos' })} />);
    expect(screen.getByLabelText('City')).toHaveValue('Byblos');
  });
});
