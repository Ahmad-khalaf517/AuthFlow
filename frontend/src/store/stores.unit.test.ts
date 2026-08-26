import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { api } from '@/test/handlers';
import { server } from '@/test/server';
import { createUser } from '@/test/factories';
import { useAuthStore } from './authStore';
import { useUiStore } from './uiStore';

describe('auth store', () => {
  it('logs in, fetches the current user, and logs out', async () => {
    await useAuthStore.getState().login({ email: 'ahmad@example.com', password: 'password1' });
    expect(useAuthStore.getState()).toMatchObject({
      token: 'test-token',
      isAuthenticated: true,
      user: { email: 'ahmad@example.com' },
    });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  });

  it('rolls back authentication when the profile request fails', async () => {
    server.use(http.get(`${api}/users/me`, () => HttpResponse.json({}, { status: 500 })));
    await expect(
      useAuthStore.getState().login({ email: 'ahmad@example.com', password: 'password1' }),
    ).rejects.toBeInstanceOf(Error);
    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  });

  it('registers and then logs the new user in', async () => {
    await useAuthStore.getState().register({
      first_name: 'Ahmad',
      last_name: 'Khalaf',
      email: 'ahmad@example.com',
      phone_number: '+96170123456',
      city: 'Beirut',
      age: 28,
      password: 'password1',
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('sets user and hydration state directly', () => {
    const user = createUser();
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setHydrated(false);
    expect(useAuthStore.getState()).toMatchObject({ user, isHydrated: false });
  });
});

describe('UI store', () => {
  it('adds, removes, and automatically expires toasts', () => {
    vi.useFakeTimers();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
    useUiStore.getState().addToast('Saved', 'success');
    expect(useUiStore.getState().toasts).toEqual([
      { id: '00000000-0000-4000-8000-000000000001', message: 'Saved', type: 'success' },
    ]);
    vi.advanceTimersByTime(5000);
    expect(useUiStore.getState().toasts).toEqual([]);

    useUiStore.setState({ toasts: [{ id: 'manual', message: 'Info', type: 'info' }] });
    useUiStore.getState().removeToast('manual');
    expect(useUiStore.getState().toasts).toEqual([]);
  });

  it('manages the user dialog and sidebar', () => {
    const user = createUser();
    useUiStore.getState().openUserDialog(user);
    expect(useUiStore.getState()).toMatchObject({ isUserDialogOpen: true, selectedUser: user });
    useUiStore.getState().closeUserDialog();
    useUiStore.getState().setSidebarOpen(true);
    expect(useUiStore.getState()).toMatchObject({
      isUserDialogOpen: false,
      selectedUser: null,
      isSidebarOpen: true,
    });
  });
});
