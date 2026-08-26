import { expect, test } from '@playwright/test';
import { AUTH_FILES } from './support/auth';

test.use({ storageState: AUTH_FILES.admin });

async function deactivateStaleE2EUsers(page: import('@playwright/test').Page) {
  const emailFilter = page.getByLabel('Filter by email');
  const filteredResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/users') && url.searchParams.get('email') === 'e2e.';
  });
  await emailFilter.fill('e2e.');
  await filteredResponse;

  const deleteButtons = page.getByRole('button', { name: /^Delete E2E / });
  while ((await deleteButtons.count()) > 0) {
    const previousCount = await deleteButtons.count();
    await deleteButtons.first().click();
    const deleteDialog = page.getByRole('dialog', { name: 'Deactivate user' });
    await deleteDialog.getByRole('button', { name: 'Deactivate user' }).click();
    await expect(deleteDialog).toBeHidden();
    await expect(deleteButtons).toHaveCount(previousCount - 1);
  }

  await emailFilter.fill('');
}

async function deactivateVisibleUser(page: import('@playwright/test').Page, email: string) {
  const emailFilter = page.getByLabel('Filter by email');
  if (!(await emailFilter.isVisible().catch(() => false))) return;

  await emailFilter.fill(email);
  const userRow = page.getByRole('row').filter({ hasText: email });
  if (!(await userRow.isVisible().catch(() => false))) return;

  await userRow.getByRole('button', { name: /^Delete / }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Deactivate user' });
  await deleteDialog.getByRole('button', { name: 'Deactivate user' }).click();
  await expect(userRow).toHaveCount(0);
}

test('lets an admin create, edit, filter, and deactivate a test-owned user', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);

  const suffix = `${Date.now()}${testInfo.workerIndex}`;
  const firstName = 'E2E';
  const lastName = `User${suffix}`;
  const fullName = `${firstName} ${lastName}`;
  const email = `e2e.${suffix}@example.com`;

  try {
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
    await deactivateStaleE2EUsers(page);
    await page.getByRole('button', { name: 'Create user' }).click();

    const createDialog = page.getByRole('dialog', { name: 'Create a new user' });
    await createDialog.getByLabel('First name').fill(firstName);
    await createDialog.getByLabel('Last name').fill(lastName);
    await createDialog.getByLabel('Email address').fill(email);
    await createDialog.getByLabel('Phone number').fill('+96170123456');
    await createDialog.getByLabel('City').fill('Beirut');
    await createDialog.getByLabel('Age').fill('29');
    await createDialog.getByLabel('Role').selectOption('client');
    await createDialog.getByLabel('Password', { exact: true }).fill('Playwright1');
    await createDialog.getByRole('button', { name: 'Create user' }).click();

    await expect(
      page.getByRole('status').filter({ hasText: 'User created successfully' }),
    ).toBeVisible();
    await page.getByLabel('Filter by email').fill(email);

    let userRow = page.getByRole('row').filter({ hasText: email });
    await expect(userRow).toBeVisible();
    await userRow.getByRole('button', { name: `Edit ${fullName}` }).click();

    const editDialog = page.getByRole('dialog', { name: 'Edit user' });
    await editDialog.getByLabel('City').fill('Tripoli');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'User updated successfully' }),
    ).toBeVisible();

    userRow = page.getByRole('row').filter({ hasText: email });
    await expect(userRow).toContainText('Tripoli');
    await userRow.getByRole('button', { name: `Delete ${fullName}` }).click();

    const deleteDialog = page.getByRole('dialog', { name: 'Deactivate user' });
    await expect(deleteDialog).toContainText(fullName);
    await deleteDialog.getByRole('button', { name: 'Deactivate user' }).click();

    await expect(
      page.getByRole('status').filter({ hasText: `${fullName} was deactivated` }),
    ).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: email })).toHaveCount(0);
  } finally {
    await deactivateVisibleUser(page, email);
  }
});
