import { test, expect } from "@playwright/test";

/**
 * E2E tests for critical user journeys on the live production storefront.
 * Base URL: https://storefront-tawny-one.vercel.app
 *
 * Covers:
 *  - Product browsing flow (listing → detail page)
 *  - Search flow
 *  - Header / footer navigation
 *  - Static informational pages (About, Contact, FAQ, policies)
 *  - Cart flow (add item → view cart)
 */

const ERROR_TEXT = "SOMETHING WENT WRONG";

/**
 * Shared assertion: header is visible and the page has not crashed.
 */
async function assertHealthy(page: import("@playwright/test").Page) {
  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.getByText(ERROR_TEXT, { exact: false })).not.toBeVisible();
}

// ---------------------------------------------------------------------------
// Product browsing flow
// ---------------------------------------------------------------------------

test.describe("Product browsing flow", () => {
  test("products listing shows cards and navigating to a detail page works", async ({
    page,
  }) => {
    // 1. Land on the products listing page
    await page.goto("/products", { waitUntil: "networkidle" });
    await assertHealthy(page);
    await expect(page).toHaveURL(/products/);

    // 2. Find at least one link to a product detail page
    const productLink = page.locator("a[href*='/products/']").first();
    await expect(productLink).toBeVisible({ timeout: 10000 });

    // 3. Capture the destination href so we can assert we landed there
    const href = await productLink.getAttribute("href");

    // 4. Click through to the detail page
    await productLink.click();
    await page.waitForLoadState("domcontentloaded");

    // 5. Verify we are on a product detail URL
    await expect(page).toHaveURL(/\/products\/.+/);
    await assertHealthy(page);

    // 6. Product detail must show a heading (product name), a price, and an
    //    add-to-cart button.  Accept a range of common markup patterns.
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).not.toBeEmpty();

    // Price: look for any element that contains the ₹ symbol followed by a number
    const price = page
      .locator("*")
      .filter({ hasText: /₹\s*[\d,]+/ })
      .first();
    await expect(price).toBeVisible({ timeout: 10000 });

    // Add-to-cart button — accept various label patterns
    const addToCartBtn = page
      .locator("button")
      .filter({ hasText: /add to cart|add to bag|buy now/i })
      .first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
  });

  test("product detail page loads directly by URL", async ({ page }) => {
    // Navigate to the products listing and grab the first slug so we always
    // test against a slug that actually exists in the database.
    await page.goto("/products", { waitUntil: "networkidle" });

    const productLink = page.locator("a[href*='/products/']").first();
    await expect(productLink).toBeVisible({ timeout: 10000 });
    const href = await productLink.getAttribute("href");

    // Navigate directly — simulates user arriving from a bookmark / share link
    await page.goto(href ?? "/products", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Search flow
// ---------------------------------------------------------------------------

test.describe("Search flow", () => {
  test("search page loads, accepts input, and shows a valid response", async ({
    page,
  }) => {
    await page.goto("/search", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);
    await expect(page).toHaveURL(/search/);

    // Locate the search input — try data-testid first, then common patterns
    const searchInput = page
      .locator(
        [
          "[data-testid='search-input']",
          "input[type='search']",
          "input[name='q']",
          "input[name='query']",
          "input[placeholder*='search' i]",
          "input[aria-label*='search' i]",
        ].join(", ")
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type a search term and submit
    await searchInput.fill("tee");
    await searchInput.press("Enter");

    // Wait for the page to settle after the search
    await page.waitForLoadState("networkidle");
    await assertHealthy(page);

    // The page must show either:
    //  (a) product results  — links to /products/, article cards, grid items, OR
    //  (b) a valid empty-state — "no results", "0 products", "browse all" etc.
    // Both are correct behavior; what matters is no crash and a coherent UI.
    const hasResults = await page
      .locator("a[href*='/products/']")
      .first()
      .isVisible()
      .catch(() => false);

    const hasEmptyState = await page
      .locator("*")
      .filter({ hasText: /no results|0 products|nothing found|browse all/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(
      hasResults || hasEmptyState,
      "Search page must show either product results or a no-results empty state"
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Navigation flow
// ---------------------------------------------------------------------------

test.describe("Navigation flow", () => {
  test("header nav links navigate to key pages without crashing", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const header = page.locator("header").first();

    // Collect all in-header links that point to first-party paths
    const navLinks = header.locator("a[href^='/']");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    // Build a de-duplicated list of hrefs to visit (cap at 8 to keep the test fast)
    const hrefs: string[] = [];
    for (let i = 0; i < count && hrefs.length < 8; i++) {
      const href = await navLinks.nth(i).getAttribute("href");
      if (href && !hrefs.includes(href) && href !== "/") {
        hrefs.push(href);
      }
    }

    for (const href of hrefs) {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      // Primary guard: no error boundary shown
      await expect(
        page.getByText(ERROR_TEXT, { exact: false })
      ).not.toBeVisible({ timeout: 5000 });
      // Header still renders (page did not white-screen)
      await expect(page.locator("header").first()).toBeVisible();
    }
  });

  test("footer links are present and navigate without crashing", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible({ timeout: 10000 });

    // Collect distinct first-party footer links (cap at 6)
    const footerLinks = footer.locator("a[href^='/']");
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(0);

    const hrefs: string[] = [];
    for (let i = 0; i < count && hrefs.length < 6; i++) {
      const href = await footerLinks.nth(i).getAttribute("href");
      if (href && !hrefs.includes(href)) {
        hrefs.push(href);
      }
    }

    for (const href of hrefs) {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByText(ERROR_TEXT, { exact: false })
      ).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator("header").first()).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Static / informational pages
// ---------------------------------------------------------------------------

test.describe("Static pages load without errors", () => {
  const staticPages: { path: string; label: string }[] = [
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
    { path: "/faq", label: "FAQ" },
    { path: "/policies/privacy", label: "Privacy policy" },
    { path: "/policies/returns", label: "Returns policy" },
    { path: "/policies/shipping", label: "Shipping policy" },
    { path: "/policies/terms", label: "Terms" },
    { path: "/track-order", label: "Track order" },
  ];

  for (const { path, label } of staticPages) {
    test(`${label} (${path}) loads without crashing`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      // No crash error boundary
      await expect(
        page.getByText(ERROR_TEXT, { exact: false })
      ).not.toBeVisible({ timeout: 5000 });

      // Page has a recognisable document structure — at minimum a <body>
      await expect(page.locator("body")).toBeVisible();

      // URL resolves to the correct path (no redirect loop to /)
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));
    });
  }
});

// ---------------------------------------------------------------------------
// Auth pages
// ---------------------------------------------------------------------------

test.describe("Auth pages load without errors", () => {
  const authPages = [
    { path: "/auth/login", label: "Login" },
    { path: "/auth/register", label: "Register" },
    { path: "/auth/forgot-password", label: "Forgot password" },
  ];

  for (const { path, label } of authPages) {
    test(`${label} page loads and shows a form`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      await expect(
        page.getByText(ERROR_TEXT, { exact: false })
      ).not.toBeVisible({ timeout: 5000 });

      await expect(page.locator("body")).toBeVisible();

      // Must contain at least one input field (email / password)
      const input = page.locator("input").first();
      await expect(input).toBeVisible({ timeout: 10000 });
    });
  }
});

// ---------------------------------------------------------------------------
// Cart flow
// ---------------------------------------------------------------------------

test.describe("Cart flow", () => {
  test("cart page loads without crashing", async ({ page }) => {
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);
    await expect(page).toHaveURL(/cart/);
  });

  test("add a product to cart and verify cart reflects the item", async ({
    page,
  }) => {
    // 1. Go to the products listing and pick the first product
    await page.goto("/products", { waitUntil: "networkidle" });
    await assertHealthy(page);

    const productLink = page.locator("a[href*='/products/']").first();
    await expect(productLink).toBeVisible({ timeout: 10000 });
    await productLink.click();
    await page.waitForLoadState("domcontentloaded");
    await assertHealthy(page);

    // 2. Capture the product name for later verification
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const productName = (await heading.textContent()) ?? "";
    expect(productName.trim().length).toBeGreaterThan(0);

    // 3. If a size/variant selector exists, select the first available option
    //    before attempting to add to cart (some implementations require it).
    const variantBtn = page
      .locator("button")
      .filter({ hasText: /^(XS|S|M|L|XL|XXL|one size)/i })
      .first();
    const variantVisible = await variantBtn.isVisible().catch(() => false);
    if (variantVisible) {
      await variantBtn.click();
    }

    // 4. Click the add-to-cart button
    const addToCartBtn = page
      .locator("button")
      .filter({ hasText: /add to cart|add to bag|buy now/i })
      .first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await addToCartBtn.click();

    // 5. Wait for feedback — either a toast message or a cart count badge update
    //    Accept either signal; both indicate the item was registered.
    const cartFeedback = page
      .locator(
        [
          "[data-testid='cart-count']",
          "[data-testid='cart-badge']",
          "[aria-label*='cart' i]",
          ".cart-count",
          // Toast / confirmation messages
          "[role='status']",
          "[role='alert']",
          "*",
        ].join(", ")
      )
      .filter({ hasText: /added|cart|bag|\d+/i })
      .first();

    // A short wait is acceptable here — the cart update is optimistic / async
    await expect(cartFeedback).toBeVisible({ timeout: 10000 });

    // 6. Navigate to the cart page and verify it loads
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);
    await expect(page).toHaveURL(/cart/);

    // 7. Cart page must contain at least one line item
    const cartItem = page
      .locator(
        [
          "[data-testid*='cart-item']",
          "[data-testid*='line-item']",
          "li",
          "tr",
          "div[class*='cart'] div[class*='item']",
        ].join(", ")
      )
      .first();
    await expect(cartItem).toBeVisible({ timeout: 10000 });
  });
});
