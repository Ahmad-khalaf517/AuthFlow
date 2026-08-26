import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useUiStore } from '@/store/uiStore';
import { api } from '@/test/handlers';
import { createUser } from '@/test/factories';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { UserDialog } from './UserDialog';

async function fillUserForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('First name'), 'Nour');
  await user.type(screen.getByLabelText('Last name'), 'Saleh');
  await user.type(screen.getByLabelText('Email address'), 'nour@example.com');
  await user.type(screen.getByLabelText('Phone number'), '+96171123456');
  await user.type(screen.getByLabelText('City'), 'Sidon');
  const age = screen.getByLabelText('Age');
  await user.clear(age);
  await user.type(age, '32');
  await user.selectOptions(screen.getByLabelText('Role'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'password1');
  return user;
}

describe('UserDialog', () => {
  it('validates and creates a user, invalidating users and stats queries', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${api}/users`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createUser(body), { status: 201 });
      }),
    );
    useUiStore.getState().openUserDialog();
    const { queryClient } = renderWithProviders(<UserDialog />);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    await fillUserForm();
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    await waitFor(() => expect(body).toMatchObject({ email: 'nour@example.com', type: 'admin' }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['stats'] });
    expect(useUiStore.getState()).toMatchObject({ isUserDialogOpen: false, selectedUser: null });
    expect(useUiStore.getState().toasts.at(-1)).toMatchObject({ type: 'success' });
  });

  it('prefills and edits a selected user without changing the password', async () => {
    let body: Record<string, unknown> | undefined;
    const selected = createUser();
    server.use(
      http.put(`${api}/users/${selected.id}`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createUser(body));
      }),
    );
    useUiStore.getState().openUserDialog(selected);
    renderWithProviders(<UserDialog />);
    expect(screen.getByRole('heading', { name: 'Edit user' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveValue(selected.email);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('City'));
    await user.type(screen.getByLabelText('City'), 'Zahle');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(body).toMatchObject({ city: 'Zahle' }));
    expect(body).not.toHaveProperty('password');
  });

  it('keeps the dialog open and shows an API error', async () => {
    server.use(
      http.post(`${api}/users`, () =>
        HttpResponse.json({ detail: 'Email already exists' }, { status: 409 }),
      ),
    );
    useUiStore.getState().openUserDialog();
    renderWithProviders(<UserDialog />);
    const user = await fillUserForm();
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    await waitFor(() =>
      expect(useUiStore.getState().toasts.at(-1)).toMatchObject({
        message: 'Email already exists',
        type: 'error',
      }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes from cancel', async () => {
    useUiStore.getState().openUserDialog();
    renderWithProviders(<UserDialog />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(useUiStore.getState().isUserDialogOpen).toBe(false);
  });
});
