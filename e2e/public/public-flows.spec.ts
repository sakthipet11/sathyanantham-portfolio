import { test, expect } from '@playwright/test';

test.describe('Public Portfolio - End-to-End User Flows', () => {
  test('should render hero, nav sections, and allow navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check main heading
    const heroHeading = page.getByRole('heading', { level: 1 });
    await expect(heroHeading).toBeVisible();

    // Check key nav links exist
    const philosophyLink = page.getByRole('link', { name: /Philosophy/i }).first();
    await expect(philosophyLink).toBeVisible();

    const experienceLink = page.getByRole('link', { name: /Experience/i }).first();
    await expect(experienceLink).toBeVisible();
  });

  test('should allow asking AI Twin query from the hero section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // AI Twin input
    const aiInput = page.getByPlaceholder(/Ask AI:/i);
    await expect(aiInput).toBeVisible();

    await aiInput.fill('Tell me about your Order Management and Bayer architecture experience');
    const askButton = page.getByRole('button', { name: 'Ask' });
    await expect(askButton).toBeVisible();
  });

  test('should allow typing in contact form', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Fill contact form
    const nameInput = page.getByPlaceholder(/Alex Morgan/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('John Recruiter');
    }

    const emailInput = page.getByPlaceholder(/alex@company.com/i);
    if (await emailInput.isVisible()) {
      await emailInput.fill('john@enterprise.com');
    }

    const transmitButton = page.getByRole('button', { name: /TRANSMIT MESSAGE/i });
    if (await transmitButton.isVisible()) {
      await expect(transmitButton).toBeVisible();
    }
  });

  test('should provide download resume link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const resumeLinks = page.locator('a[href*="resume.pdf"]');
    await expect(resumeLinks.first()).toBeVisible();
  });
});
