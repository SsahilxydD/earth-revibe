import { test, expect } from '@playwright/test';

test('debug products page error', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`PAGE_ERROR: ${err.message}`));

  await page.goto('/products', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);

  // Log all errors
  for (const e of errors) {
    console.log('ERROR:', e);
  }

  // Check if error boundary is shown
  const errorVisible = await page
    .getByText('Something Went Wrong', { exact: false })
    .isVisible()
    .catch(() => false);
  console.log('Error boundary visible:', errorVisible);

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-products.png' });
});
