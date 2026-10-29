import { expect, test } from '@playwright/test';

test('signup, verify notice, login, protected route, and logout', async ({ page }) => {
  let user: { email: string; local_id: string } | null = null;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === '/api/auth/session') {
      await route.fulfill({ json: { user } });
      return;
    }
    if (path === '/api/auth/firebase/signup') {
      await route.fulfill({
        json: {
          ok: true,
          message: 'Account created! Check your email and verify your address before logging in.',
        },
      });
      return;
    }
    if (path === '/api/auth/firebase/login') {
      user = { email: 'ci@example.com', local_id: 'ci-user' };
      await route.fulfill({ json: { user } });
      return;
    }
    if (path === '/api/auth/logout') {
      user = null;
      await route.fulfill({ json: { ok: true } });
      return;
    }
    if (path === '/api/data') {
      await route.fulfill({
        json: { metrics: [], nav: [], monthly: [], synthetic: true },
      });
      return;
    }

    await route.fulfill({ json: {} });
  });

  await page.goto('/app/overview');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole('button', { name: /^Create account$/ }).first().click();
  await page.getByLabel('Email address').fill('ci@example.com');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('correct-horse');
  await page.getByRole('textbox', { name: 'Confirm password', exact: true }).fill('correct-horse');
  await page.getByRole('button', { name: /^Create account$/ }).last().click();
  await expect(page.getByRole('status')).toContainText('verify your address');

  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('correct-horse');
  await page.getByRole('button', { name: /^Sign in$/ }).last().click();
  await expect(page).toHaveURL(/\/app\/overview$/);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

  await page.getByRole('button', { name: /Sign out/ }).click();
  await expect(page).toHaveURL(/\/login$/);
});
