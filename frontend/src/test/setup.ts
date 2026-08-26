import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    token: null,
    isHydrated: true,
  });
  useUiStore.setState({
    toasts: [],
    isUserDialogOpen: false,
    selectedUser: null,
    isSidebarOpen: false,
  });
  vi.useRealTimers();
});

afterAll(() => server.close());
