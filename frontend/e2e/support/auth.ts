import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';

export type TestRole = 'admin' | 'client';

export const AUTH_FILES = {
  admin: resolve('playwright/.auth/admin.json'),
  client: resolve('playwright/.auth/client.json'),
} as const;

export const TEST_ACCOUNTS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'maya@gmail.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'password1',
  },
  client: {
    email: process.env.E2E_CLIENT_EMAIL ?? 'ahmadkhalaf517@gmail.com',
    password: process.env.E2E_CLIENT_PASSWORD ?? 'password1',
  },
} as const;

const APP_ORIGIN = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:5173').origin;
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:8000/api/v1';

interface StoredOrigin {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
}

interface StoredState {
  origins?: StoredOrigin[];
}

interface PersistedAuth {
  state?: {
    token?: unknown;
  };
}

async function restoreSavedSession(page: Page, role: TestRole): Promise<boolean> {
  const authFile = AUTH_FILES[role];
  if (!existsSync(authFile)) return false;

  const state = JSON.parse(readFileSync(authFile, 'utf8')) as StoredState;
  const savedOrigin = state.origins?.find((origin) => origin.origin === APP_ORIGIN);
  const authEntry = savedOrigin?.localStorage.find((entry) => entry.name === 'authflow-auth');
  if (!authEntry) return false;

  const persistedAuth = JSON.parse(authEntry.value) as PersistedAuth;
  const token = persistedAuth.state?.token;
  if (typeof token !== 'string' || token.length === 0) return false;

  const sessionResponse = await page.request.get(`${API_BASE_URL}/users/me`, {
    failOnStatusCode: false,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!sessionResponse.ok()) return false;

  const currentUser = (await sessionResponse.json()) as { email?: unknown; role?: unknown };
  if (currentUser.role !== role || currentUser.email !== TEST_ACCOUNTS[role].email) return false;

  await page.addInitScript(
    ({ name, value }) => window.localStorage.setItem(name, value),
    authEntry,
  );
  await page.goto('/dashboard');

  try {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome back/i, {
      timeout: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function signIn(page: Page, role: TestRole): Promise<void> {
  const account = TEST_ACCOUNTS[role];
  await page.goto('/login');
  await page.getByLabel('Email address').fill(account.email);
  await page.getByPlaceholder('Enter your password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome back/i);
}

export async function authenticateAndSave(page: Page, role: TestRole): Promise<void> {
  const restored = await restoreSavedSession(page, role);
  if (!restored) await signIn(page, role);

  mkdirSync(dirname(AUTH_FILES[role]), { recursive: true });
  await page.context().storageState({ path: AUTH_FILES[role] });
}
