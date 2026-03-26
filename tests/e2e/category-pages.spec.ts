import { test, expect } from '@playwright/test';

/**
 * E2E tests for category and core pages on the live production storefront.
 * Base URL: https://storefront-tawny-one.vercel.app
 *
 * Each test verifies:
 *  - Page loads within 15 seconds (set via navigationTimeout in config)
 *  - No "SOMETHING WENT WRONG" error text is visible
 *  - Header navigation is visible
 */

const ERROR_TEXT = 'SOMETHING WENT WRONG';

/**
 * Shared assertion: header is visible and the page has not crashed.
 */
async function assertHealthy(page: import('@playwright/test').Page) {
  // Header must be present
  await expect(page.locator('header').first()).toBeVisible();

  // No crash error banner
  await expect(page.getByText(ERROR_TEXT, { exact: false })).not.toBeVisible();
}

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------

test.describe('Homepage', () => {
  test('loads hero section and header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await assertHealthy(page);

    // Hero: look for a prominent banner / hero element.
    // Accept any of the common patterns used in Next.js storefronts.
    const hero = page
      .locator('section, div')
      .filter({ hasText: /shop|collection|new arrival|welcome|explore/i })
      .first();
    await expect(hero).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Products listing
// ---------------------------------------------------------------------------

test.describe('Products page', () => {
  test('loads product grid with at least one product card', async ({ page }) => {
    await page.goto('/products', { waitUntil: 'networkidle' });

    // Check for crash error banner FIRST — this is the primary production guard
    await expect(page.getByText(ERROR_TEXT, { exact: false })).not.toBeVisible({ timeout: 5000 });

    await assertHealthy(page);

    // Verify the URL resolved correctly
    await expect(page).toHaveURL(/products/);

    // Product grid: try several common card patterns used in Next.js storefronts
    // (linked product cards, list items in a grid, or generic grid children)
    const productCards = page
      .locator(
        [
          "a[href*='/products/']",
          'article',
          "[data-testid*='product']",
          "ul[class*='grid'] > li",
          "div[class*='grid'] > a",
          "div[class*='grid'] > div > a",
        ].join(', ')
      )
      .first();
    await expect(productCards).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Category pages — happy path
// ---------------------------------------------------------------------------

test.describe('Category pages — no crash', () => {
  const categories = [
    { slug: 'shirts', expectHeading: true },
    { slug: 't-shirts', expectHeading: false },
    { slug: 'new-arrivals', expectHeading: false },
    { slug: 'outerwear', expectHeading: false },
  ];

  for (const { slug, expectHeading } of categories) {
    test(`/categories/${slug} loads without error`, async ({ page }) => {
      await page.goto(`/categories/${slug}`, { waitUntil: 'domcontentloaded' });

      await assertHealthy(page);

      await expect(page).toHaveURL(new RegExp(`categories/${slug}`));

      if (expectHeading) {
        // The "shirts" route should display a heading containing "shirts"
        const heading = page
          .locator('h1, h2')
          .filter({ hasText: /shirts/i })
          .first();
        await expect(heading).toBeVisible({ timeout: 10000 });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Edge-case category: "men" — may show 0 products but must NOT crash
// ---------------------------------------------------------------------------

test.describe('Category edge cases', () => {
  test('/categories/men does not crash (0 products is acceptable)', async ({ page }) => {
    await page.goto('/categories/men', { waitUntil: 'domcontentloaded' });

    // Must not show an error banner
    await expect(page.getByText(ERROR_TEXT, { exact: false })).not.toBeVisible();

    // Header must still render
    await expect(page.locator('header').first()).toBeVisible();

    // URL should resolve — could be a 404 page or an empty category page,
    // but a runtime crash (500 / error boundary) is the failure we are guarding against.
    const url = page.url();
    expect(url).toContain('storefront-tawny-one.vercel.app');
  });
});
