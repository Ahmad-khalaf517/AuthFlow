import { expect, test } from '@playwright/test';
import { AUTH_FILES, TEST_ACCOUNTS } from './support/auth';

test.use({ storageState: AUTH_FILES.client });

function luminance(channels: number[]): number {
  const [red = 0, green = 0, blue = 0] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const parse = (color: string) => (color.match(/\d+/g) ?? []).slice(0, 3).map(Number);
  const first = luminance(parse(foreground));
  const second = luminance(parse(background));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test('shows account details and opens the client profile', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Account overview' }).getByText(TEST_ACCOUNTS.client.email),
  ).toBeVisible();

  const reviewProfile = page.getByRole('link', { name: 'Review profile' });
  const colors = await reviewProfile.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return { foreground: styles.color, background: styles.backgroundColor };
  });
  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);

  await reviewProfile.click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'My profile', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveValue(TEST_ACCOUNTS.client.email);
});

test('closes mobile navigation when the client signs out', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('complementary', { name: 'Mobile navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('complementary', { name: 'Mobile navigation' })).toHaveCount(0);
});
