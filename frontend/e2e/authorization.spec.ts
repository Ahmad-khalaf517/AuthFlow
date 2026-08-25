import { expect, test } from '@playwright/test';
import { AUTH_FILES } from './support/auth';

test.use({ storageState: AUTH_FILES.client });

test('prevents a client from opening admin user management', async ({ page }) => {
  await page.goto('/users');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'User management' })).toHaveCount(0);
});
