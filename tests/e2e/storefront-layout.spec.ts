import { test, expect } from '@playwright/test';

test.describe('Storefront layout', () => {
  test('home page loads with visible header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('products page loads', async ({ page }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/products/);
  });

  test('blog page loads', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/blog/);
  });
});
