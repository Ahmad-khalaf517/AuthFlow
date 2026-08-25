import { expect, test as setup } from '@playwright/test';
import { authenticateAndSave } from './support/auth';

const apiHealthURL = process.env.E2E_API_HEALTH_URL ?? 'http://localhost:8000/health';

setup.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const response = await request.get(apiHealthURL);
  expect(
    response.ok(),
    `AuthFlow API is unavailable at ${apiHealthURL}. Start the backend before running E2E tests.`,
  ).toBeTruthy();
  await request.dispose();
});

setup('authenticate as admin', async ({ page }) => {
  await authenticateAndSave(page, 'admin');
});

setup('authenticate as client', async ({ page }) => {
  await authenticateAndSave(page, 'client');
});
