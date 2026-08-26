import { test, expect, Page } from '@playwright/test';

// Helper to authenticate admin session before testing protected admin routes
async function loginAsAdmin(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('sathya_admin_token', 'sathya2026');
  });
}

const ADMIN_ROUTES = [
  '/admin/dashboard',
  '/admin/jobs',
  '/admin/applications',
  '/admin/recruiter-inbox',
  '/admin/connections',
  '/admin/referrals',
  '/admin/resumes',
  '/admin/automation',
  '/admin/agent',
  '/admin/analytics',
  '/admin/settings'
];

test.describe('Responsive Layout & Viewport Verification', () => {
  test('should render homepage without horizontal page overflow on desktop', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('should render homepage properly without horizontal overflow on mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('should have readable and visible main content elements on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const main = page.locator('main, [role="main"], body');
    await expect(main.first()).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should render admin login page without overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 15000 });
  });

  for (const route of ADMIN_ROUTES) {
    test(`should render admin screen (${route}) without horizontal overflow on mobile`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      // Verify page body or main is visible
      await expect(page.locator('body')).toBeVisible();

      // Check mobile header / burger or main container renders
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalOverflow).toBe(false);
    });
  }
});

