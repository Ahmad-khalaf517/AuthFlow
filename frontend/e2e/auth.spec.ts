import { expect, test } from '@playwright/test';
import { TEST_ACCOUNTS } from './support/auth';

test('redirects unauthenticated users away from protected routes', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in to AuthFlow' })).toBeVisible();
});

test('shows an accessible error for invalid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(TEST_ACCOUNTS.client.email);
  await page.getByPlaceholder('Enter your password').fill('definitely-not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert')).toContainText(/invalid|incorrect|unable|too many/i);
  await expect(page).toHaveURL(/\/login$/);
});
