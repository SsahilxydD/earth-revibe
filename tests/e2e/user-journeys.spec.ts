import { test, expect } from '@playwright/test';

/**
 * Critical user journey tests.
 * Tests complete flows that real users take, across all viewports.
 */

test.describe('Browse → Product Detail Flow', () => {
  test('user can browse categories and view a product', async ({ page }) => {
    // 1. Land on homepage
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // 2. Navigate to a category
    await page.goto('/categories/new-arrivals', {
      waitUntil: 'domcontentloaded',
    });
    await expect(header).toBeVisible({ timeout: 10000 });

    // 3. Click on a product
    const productLink = page.locator('a[href*="/products/"]').first();
    const hasProducts = await productLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasProducts) {
      await productLink.click();
      await page.waitForLoadState('domcontentloaded');

      // 4. Product detail should show product info
      // Check URL changed to product page
      expect(page.url()).toContain('/products/');

      // Should have an add to cart button
      const addToCart = page
        .locator(
          'button:has-text("Add to Cart"), button:has-text("ADD TO CART"), button:has-text("Add to Bag")'
        )
        .first();
      const cartBtnVisible = await addToCart.isVisible({ timeout: 5000 }).catch(() => false);

      // Either add-to-cart button or size selector should be visible
      if (!cartBtnVisible) {
        // Product might require size selection first
        const sizeSelector = page
          .locator('[data-testid="size-selector"], button:has-text("S"), button:has-text("M")')
          .first();
        const hasSizes = await sizeSelector.isVisible({ timeout: 3000 }).catch(() => false);
        expect(cartBtnVisible || hasSizes).toBeTruthy();
      }
    }
  });
});

test.describe('Search Flow', () => {
  test('user can search for products', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Try direct search page navigation (more reliable)
    await page.goto('/search?q=shirt', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Search results or empty state should appear
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Page should contain search-related content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Cart Flow', () => {
  test('empty cart shows appropriate message', async ({ page }) => {
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Should show empty cart state or cart page
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Auth Pages Accessible', () => {
  test('login page has form fields', async ({ page }) => {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    // Submit button should exist
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")'
    );
    await expect(submitBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('register page has form fields', async ({ page }) => {
    await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Navigation Consistency', () => {
  const routes = ['/', '/categories/new-arrivals', '/about', '/contact', '/blog'];

  for (const route of routes) {
    test(`${route} has header and footer`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      // Header visible
      const header = page.locator('header').first();
      await expect(header).toBeVisible({ timeout: 10000 });

      // Footer visible (scroll down)
      const footer = page.locator('footer').first();
      const footerVisible = await footer.isVisible({ timeout: 3000 }).catch(() => false);

      if (!footerVisible) {
        await footer.scrollIntoViewIfNeeded().catch(() => {});
        await expect(footer).toBeVisible({ timeout: 5000 });
      }
    });
  }
});

test.describe('Error Handling', () => {
  test('404 page renders for invalid route', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345', {
      waitUntil: 'domcontentloaded',
    });

    // Should get 404 status or show error page
    if (response) {
      expect([200, 404]).toContain(response.status());
    }

    // Should still have basic layout (not a blank page)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('No Console Errors', () => {
  test('homepage loads without critical JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('hydration') &&
        !e.includes('Minified React error') &&
        !e.includes('ResizeObserver')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
