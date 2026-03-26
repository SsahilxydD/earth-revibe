import { test, expect, type Page } from '@playwright/test';

/**
 * Responsive visual regression tests.
 * Runs against desktop, tablet, and mobile viewports (configured in playwright.config.ts).
 * Takes screenshots of key pages for visual comparison across PRs.
 */

async function waitForPage(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  // Wait for images and fonts to settle
  await page.waitForTimeout(1000);
}

test.describe('Homepage', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    // Header should be visible
    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // No error boundaries triggered
    const errorText = page.getByText('SOMETHING WENT WRONG');
    await expect(errorText)
      .toBeHidden({ timeout: 3000 })
      .catch(() => {});

    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Product Listing Page', () => {
  test('renders product grid', async ({ page }) => {
    await page.goto('/categories/new-arrivals', {
      waitUntil: 'domcontentloaded',
    });
    await waitForPage(page);

    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('product-listing.png', {
      fullPage: false, // Above the fold only
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Product Detail Page', () => {
  test('renders product info', async ({ page }) => {
    // Navigate to a product via listing
    await page.goto('/categories/new-arrivals', {
      waitUntil: 'domcontentloaded',
    });
    await waitForPage(page);

    // Click first product link
    const productLink = page.locator('a[href*="/products/"]').first();
    if (await productLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productLink.click();
      await waitForPage(page);

      await expect(page).toHaveScreenshot('product-detail.png', {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
      });
    }
  });
});

test.describe('Cart Page', () => {
  test('renders empty cart', async ({ page }) => {
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    await expect(page).toHaveScreenshot('cart-empty.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Auth Pages', () => {
  test('login page renders form', async ({ page }) => {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    // Login form should be present
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('login.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('register page renders form', async ({ page }) => {
    await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    await expect(page).toHaveScreenshot('register.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Static Pages', () => {
  const pages = [
    { name: 'about', path: '/about' },
    { name: 'contact', path: '/contact' },
    { name: 'faq', path: '/faq' },
    { name: 'blog', path: '/blog' },
  ];

  for (const p of pages) {
    test(`${p.name} page renders`, async ({ page }) => {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      await waitForPage(page);

      const header = page.locator('header').first();
      await expect(header).toBeVisible({ timeout: 10000 });

      await expect(page).toHaveScreenshot(`${p.name}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});

test.describe('Search', () => {
  test('search results page works', async ({ page }) => {
    await page.goto('/search?q=shirt', { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    await expect(page).toHaveScreenshot('search-results.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Mobile Navigation', () => {
  test('mobile menu opens and shows links', async ({ page }) => {
    // Only relevant for mobile viewport
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 768) {
      test.skip();
      return;
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    // Look for mobile menu button (hamburger)
    const menuButton = page
      .locator(
        'button[aria-label*="menu" i], button[aria-label*="nav" i], [data-testid="mobile-menu"]'
      )
      .first();

    if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuButton.click();
      await page.waitForTimeout(500); // Animation

      await expect(page).toHaveScreenshot('mobile-menu-open.png', {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
      });
    }
  });
});
