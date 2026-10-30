import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const syntheticDataset = {
  synthetic: true,
  source_mode: 'synthetic',
  source_url: null,
  generated_at_utc: '2026-01-01T00:00:00Z',
  metrics: [
    {
      scheme_code: 'test-equity',
      scheme_name: 'Synthetic Test Equity Fund',
      category: 'Equity',
      observations: 3,
      start_date: '2024-01-01',
      end_date: '2026-01-01',
      starting_nav: 100,
      ending_nav: 121,
      period_return: 0.21,
      cagr: 0.1,
      annualized_volatility: 0.12,
      max_drawdown: -0.08,
      sharpe_ratio: 0.9,
      sortino_ratio: 1.1,
      calmar_ratio: 1.25,
    },
    {
      scheme_code: 'test-index',
      scheme_name: 'Synthetic Test Index Fund',
      category: 'Index',
      observations: 3,
      start_date: '2024-01-01',
      end_date: '2026-01-01',
      starting_nav: 100,
      ending_nav: 110,
      period_return: 0.1,
      cagr: 0.0488,
      annualized_volatility: 0.08,
      max_drawdown: -0.04,
      sharpe_ratio: 0.6,
      sortino_ratio: 0.8,
      calmar_ratio: 1.22,
    },
  ],
  nav: [
    { scheme_code: 'test-equity', scheme_name: 'Synthetic Test Equity Fund', category: 'Equity', date: '2024-01-01', nav: 100, daily_return: null },
    { scheme_code: 'test-equity', scheme_name: 'Synthetic Test Equity Fund', category: 'Equity', date: '2025-01-01', nav: 110, daily_return: 0.1 },
    { scheme_code: 'test-equity', scheme_name: 'Synthetic Test Equity Fund', category: 'Equity', date: '2026-01-01', nav: 121, daily_return: 0.1 },
    { scheme_code: 'test-index', scheme_name: 'Synthetic Test Index Fund', category: 'Index', date: '2024-01-01', nav: 100, daily_return: null },
    { scheme_code: 'test-index', scheme_name: 'Synthetic Test Index Fund', category: 'Index', date: '2025-01-01', nav: 105, daily_return: 0.05 },
    { scheme_code: 'test-index', scheme_name: 'Synthetic Test Index Fund', category: 'Index', date: '2026-01-01', nav: 110, daily_return: 0.0476 },
  ],
  monthly: [
    { scheme_code: 'test-equity', scheme_name: 'Synthetic Test Equity Fund', month: '2025-11', month_end_nav: 118, monthly_return: 0.02 },
    { scheme_code: 'test-equity', scheme_name: 'Synthetic Test Equity Fund', month: '2025-12', month_end_nav: 121, monthly_return: 0.0254 },
    { scheme_code: 'test-index', scheme_name: 'Synthetic Test Index Fund', month: '2025-11', month_end_nav: 108, monthly_return: 0.01 },
    { scheme_code: 'test-index', scheme_name: 'Synthetic Test Index Fund', month: '2025-12', month_end_nav: 110, monthly_return: 0.0185 },
  ],
  benchmarks: [
    {
      scheme_code: 'test-equity',
      scheme_name: 'Synthetic Test Equity Fund',
      category: 'Equity',
      benchmark_code: 'test-index',
      benchmark_name: 'Synthetic Test Index Fund',
      benchmark_category: 'Index',
      start_date: '2024-01-01',
      end_date: '2026-01-01',
      observations: 3,
      fund_return: 0.21,
      benchmark_return: 0.1,
      return_difference: 0.11,
    },
  ],
  findings: [
    {
      title: 'Synthetic finding',
      value: 'Example only',
      detail: 'This fixture is synthetic test data, not a market observation.',
      source: 'Playwright test fixture',
    },
  ],
};

const routes = [
  { path: '/', name: 'landing' },
  { path: '/app/overview', name: 'overview' },
  { path: '/app/explore', name: 'fund-explorer' },
  { path: '/app/calculators', name: 'calculators' },
  { path: '/app/portfolio', name: 'portfolio' },
] as const;

const widths = [360, 768, 1024, 1440];

async function mockApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/session') {
      await route.fulfill({ json: { user: { email: 'synthetic@example.test', local_id: 'synthetic-test' } } });
    } else if (path === '/api/data') {
      await route.fulfill({ json: syntheticDataset });
    } else {
      await route.fulfill({ json: {} });
    }
  });
}

for (const width of widths) {
  test(`primary pages fit ${width}px and render without console errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await mockApi(page);
    await page.setViewportSize({ width, height: 900 });

    const screenshotDir = process.env.FUNDSCOPE_SCREENSHOT_DIR
      ?? resolve(process.cwd(), '..', 'assets', 'screenshots');
    await mkdir(screenshotDir, { recursive: true });

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator('main h1, main h2').first()).toBeVisible();
      if (route.path === '/') {
        await expect(page.getByRole('button', { name: 'Flip between bull and bear market illustrations' })).toBeVisible();
        await expect(page.locator('.hero-market-flip__front img')).toHaveAttribute('alt', 'Bull market illustration');
      } else {
        await expect(page.getByRole('note').first()).toBeVisible();
      }

      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.documentWidth, `${route.name} overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewportWidth);

      if (route.path.startsWith('/app/')) {
        const chart = page.locator('.recharts-surface').first();
        if (await chart.count()) {
          const chartWidth = await chart.evaluate((element) => element.getBoundingClientRect().width);
          expect(chartWidth, `${route.name} chart has no width at ${width}px`).toBeGreaterThan(0);
        }
      }

      await page.screenshot({
        path: resolve(screenshotDir, `${route.name}-${width}.png`),
        fullPage: true,
      });
    }

    expect(consoleErrors).toEqual([]);
  });
}

test('landing and dashboard mobile menus are visible and keyboard dismissible', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 768, height: 900 });

  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('#landing-mobile-navigation')).toBeVisible();

  await page.goto('/app/overview');
  await page.getByRole('button', { name: 'Open dashboard navigation' }).click();
  await expect(page.locator('#mobile-dashboard-navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-dashboard-navigation')).toBeHidden();
});
