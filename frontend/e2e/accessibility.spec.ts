import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { AUTH_FILES } from './support/auth';

interface PageTarget {
  name: string;
  path: string;
  heading: string | RegExp;
}

const publicPages: PageTarget[] = [
  { name: 'login', path: '/login', heading: 'Sign in to AuthFlow' },
  { name: 'registration', path: '/register', heading: 'Create your account' },
];

const clientPages: PageTarget[] = [
  { name: 'client dashboard', path: '/dashboard', heading: /Welcome back/i },
  { name: 'client profile', path: '/profile', heading: 'My profile' },
];

const adminPages: PageTarget[] = [
  { name: 'admin dashboard', path: '/dashboard', heading: /Welcome back/i },
  { name: 'user management', path: '/users', heading: 'User management' },
];

async function scanPage(page: Page, target: PageTarget): Promise<void> {
  await page.goto(target.path);
  await expect(page).toHaveURL(new RegExp(`${target.path.replace('/', '\\/')}$`));
  await page.getByRole('main').waitFor();
  await expect(page.getByRole('heading', { name: target.heading })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const seriousViolations = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(
    seriousViolations,
    `${target.name} has serious accessibility violations:\n${seriousViolations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join('\n')}`,
  ).toEqual([]);
}

async function scanTargets(context: BrowserContext, targets: PageTarget[]): Promise<void> {
  const page = await context.newPage();
  for (const target of targets) await scanPage(page, target);
  await context.close();
}

test('critical pages have no serious automated accessibility violations', async ({ browser }) => {
  const publicContext = await browser.newContext({ reducedMotion: 'reduce' });
  await scanTargets(publicContext, publicPages);

  const clientContext = await browser.newContext({
    storageState: AUTH_FILES.client,
    reducedMotion: 'reduce',
  });
  await scanTargets(clientContext, clientPages);

  const adminContext = await browser.newContext({
    storageState: AUTH_FILES.admin,
    reducedMotion: 'reduce',
  });
  await scanTargets(adminContext, adminPages);
});
