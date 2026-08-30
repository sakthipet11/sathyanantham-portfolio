import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENS_DIR = path.resolve(process.cwd(), 'docs/images/screens');

test.describe.serial('Capture Live Application Screenshots', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('01 - Capture Homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Allow animations & 3D canvas to render
    await page.screenshot({ path: path.join(SCREENS_DIR, '01_homepage.png'), fullPage: false });
  });

  test('02 - Capture Admin Login Screen', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENS_DIR, '02_admin_login.png'), fullPage: false });
  });

  test('03 - Capture Admin Dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '03_admin_dashboard.png'), fullPage: false });
  });

  test('04 - Capture Admin Job Discovery', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/jobs', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '04_admin_jobs.png'), fullPage: false });
  });

  test('05 - Capture Admin Applications Pipeline', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/applications', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '05_admin_applications.png'), fullPage: false });
  });

  test('06 - Capture Admin Referrals Center', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/referrals', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENS_DIR, '06_admin_referrals.png'), fullPage: false });
  });

  test('07 - Capture Admin Connections', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/connections', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENS_DIR, '07_admin_connections.png'), fullPage: false });
  });

  test('08 - Capture Admin Recruiter Inbox', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/recruiter-inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '08_admin_recruiter_inbox.png'), fullPage: false });
  });

  test('09 - Capture Admin Resumes & Versions', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/resumes', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '09_admin_resumes.png'), fullPage: false });
  });

  test('10 - Capture Admin Automation & Governance', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/automation', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '10_admin_automation.png'), fullPage: false });
  });

  test('11 - Capture Admin AI Job Copilot', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/agent', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '11_admin_copilot_agent.png'), fullPage: false });
  });

  test('12 - Capture Admin Analytics Hub', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/analytics', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '12_admin_analytics.png'), fullPage: false });
  });

  test('13 - Capture Admin Settings', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '13_admin_settings.png'), fullPage: false });
  });
});
