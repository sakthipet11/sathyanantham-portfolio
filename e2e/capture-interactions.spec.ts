import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENS_DIR = path.resolve(process.cwd(), 'docs/images/screens');

test.describe.serial('Capture Interactive Modal & Action Screenshots', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('14 - Capture ATS Radar & Score Breakdown Modal', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/jobs', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click the first Radar button
    const radarBtn = page.getByRole('button', { name: /Radar/i }).first();
    await expect(radarBtn).toBeVisible({ timeout: 10000 });
    await radarBtn.click();

    // Wait for the modal dialog
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENS_DIR, '14_ats_radar_modal.png'), fullPage: false });
  });

  test('15 - Capture Bulk Action Bar on Job Selection', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('sathya_admin_token', 'sathya2026');
    });
    await page.goto('/admin/jobs', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click "Select All" checkbox
    const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(selectAllCheckbox).toBeVisible({ timeout: 10000 });
    await selectAllCheckbox.click();

    // Wait for Bulk Action Bar at bottom
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENS_DIR, '15_bulk_action_bar.png'), fullPage: false });
  });

  test('16 - Capture AI Twin Interactive Chat Modal', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click "Launch AI Twin"
    const launchBtn = page.getByRole('button', { name: /Launch AI Twin/i });
    if (await launchBtn.isVisible()) {
      await launchBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENS_DIR, '16_ai_twin_chat_modal.png'), fullPage: false });
    }
  });

  test('17 - Capture Contact & Live Handoff Section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Scroll to contact section
    const contactSection = page.locator('#contact, section:has-text("Get In Touch"), section:has-text("Live Handoff")').first();
    if (await contactSection.isVisible()) {
      await contactSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENS_DIR, '17_contact_live_handoff.png'), fullPage: false });
    }
  });
});
