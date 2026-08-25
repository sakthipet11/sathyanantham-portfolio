import { test, expect } from '@playwright/test';

test.describe('API Error Handling & Graceful Degradation', () => {
  test('should handle failing API gracefully when route mocked with 500 error', async ({ page }) => {
    // Intercept any AI studio API or chat endpoints and mock 500 response
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Simulation Error' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Page must still render without breaking or white screening
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should survive network timeout on API requests', async ({ page }) => {
    // Intercept API routes and simulate delay or abort
    await page.route('**/api/analytics**', async (route) => {
      await route.abort('timedout');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify main view remains intact and interactive
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
