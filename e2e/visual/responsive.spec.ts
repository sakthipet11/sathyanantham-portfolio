import { test, expect } from '@playwright/test';

test.describe('Responsive Layout & Viewport Verification', () => {
  test('should render homepage without horizontal page overflow on desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check that scrollWidth matches clientWidth (no unexpected horizontal overflow)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('should render homepage properly without horizontal overflow on mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('should have readable and visible main content elements', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main, [role="main"], body');
    await expect(main.first()).toBeVisible();
  });
});
