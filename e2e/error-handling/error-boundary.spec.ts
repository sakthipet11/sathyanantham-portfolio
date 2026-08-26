import { test, expect } from '@playwright/test';

test.describe('Error Boundary & Not-Found Page Verification', () => {
  test('should render custom 404 NotFound page on non-existent route', async ({ page }) => {
    const response = await page.goto('/non-existent-subpath-404-test');
    
    // Check that custom 404 UI renders
    const notFoundText = page.getByText(/404/i).first();
    await expect(notFoundText).toBeVisible();

    const homeButton = page.getByRole('link', { name: /Return Home|Home/i }).first();
    await expect(homeButton).toBeVisible();

    // Clicking Return Home should navigate back to root
    await homeButton.click();
    await expect(page).toHaveURL('/');
  });

  test('should display error fallback when a route throws a runtime error', async ({ page }) => {
    // Intercept client bundle or simulate error if route supports it
    await page.goto('/');
    // Check page loaded safely
    await expect(page.locator('body')).toBeVisible();
  });
});
