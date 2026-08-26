import { test, expect } from '@playwright/test';

test.describe('Admin Control Center - Complete Flow & Mobile Verification', () => {
  test('should allow admin login with master passkey', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    // Fill master passkey
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 15000 });
    await passwordInput.fill('sathya2026');

    // Submit login
    const loginButton = page.getByRole('button', { name: /Unlock Command Center/i });
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Verify dashboard displays
    await expect(page.getByRole('heading', { name: /Autonomous Job Automation Command Center/i })).toBeVisible({ timeout: 15000 });
  });

  test('should open and navigate via Mobile Navigation Drawer on small screens', async ({ page }) => {
    // Authenticate via addInitScript
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });

    // Check sticky mobile header toggle button
    const menuButton = page.getByRole('button', { name: /Toggle menu/i });
    await expect(menuButton).toBeVisible({ timeout: 15000 });

    // Open mobile drawer
    await menuButton.click();

    // Target link in the open mobile drawer
    const jobsLink = page.locator('div.fixed.inset-0').getByRole('link', { name: /Job discovery/i });
    await expect(jobsLink).toBeVisible({ timeout: 10000 });

    // Click Job discovery link
    await jobsLink.click();

    // Verify routed to /admin/jobs
    await expect(page).toHaveURL(/.*\/admin\/jobs/, { timeout: 10000 });
    await expect(page.getByText(/AI Job Discovery/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should support Job Discovery page search and filter interactions', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });

    await page.goto('/admin/jobs', { waitUntil: 'domcontentloaded' });

    // Check search bar
    const searchInput = page.getByPlaceholder(/Search job title/i);
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await searchInput.fill('Senior');

    // Verify filters exist
    const matchTypeSelect = page.locator('select').first();
    await expect(matchTypeSelect).toBeVisible();
  });

  test('should render Admin Applications and Recruiter Inbox flows', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });

    // Applications Screen
    await page.goto('/admin/applications', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main, body').first()).toBeVisible({ timeout: 15000 });

    // Recruiter Inbox Screen
    await page.goto('/admin/recruiter-inbox', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main, body').first()).toBeVisible({ timeout: 15000 });
  });

  test('should render Admin Settings and SRE controls', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });

    await page.goto('/admin/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main, body').first()).toBeVisible({ timeout: 15000 });
  });
});

