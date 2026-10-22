import { test, expect } from '@playwright/test';

test.describe('Mobile-First & PWA Verification Suite', () => {
  test('PWA manifest exists and is valid', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/manifest.webmanifest`);
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe('Betting Intelligence OS');
    expect(manifest.short_name).toBe('Betting OS');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test('Service worker sw.js is accessible', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/sw.js`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('CACHE_NAME');
    expect(body).toContain('skipWaiting');
  });

  test('Truthful data freshness badge and branding render correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Betting Intelligence OS/);

    // Header brand and truthful freshness indicator
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check that freshness text is rendered (LIVE, DELAYED, STALE, or SYNCING)
    const freshnessText = page.locator('header').getByText(/(LIVE|DELAYED|STALE|SYNCING|OFFLINE)/);
    await expect(freshnessText.first()).toBeVisible();
  });

  test('Mobile navigation displays 5 primary tabs and More sheet', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      const nav = page.locator('nav.sm\\:hidden');
      await expect(nav).toBeVisible();

      // Verify all 5 mobile navigation items
      await expect(nav.getByText('Home')).toBeVisible();
      await expect(nav.getByText('Markets')).toBeVisible();
      await expect(nav.getByText('Watchlist')).toBeVisible();
      await expect(nav.getByText('Portfolio')).toBeVisible();
      await expect(nav.getByText('More')).toBeVisible();

      // Test Watchlist navigation
      await nav.getByText('Watchlist').click();
      await expect(page.getByText('Personal Market Watchlist')).toBeVisible();

      // Test More drawer navigation
      await nav.getByText('More').click();
      await expect(page.getByText('All Analytical Features')).toBeVisible();
      await expect(page.getByText('AI Agents Command Center')).toBeVisible();
      await expect(page.getByText('Model Accuracy & Brier Score')).toBeVisible();
      await expect(page.getByText('Data Feeds & Connectivity')).toBeVisible();

      // Close More drawer
      await page.locator('button:has-text("Dismiss"), button:has-text("✕"), button:has(.lucide-x)').first().click();
    }
  });

  test('Best Trade card displays 3 primary actions and analysis toggle', async ({ page }) => {
    await page.goto('/');

    // Best Trade card should be visible on Decision Desk
    const bestTradeCard = page.locator('.border-emerald-500\\/60').first();
    await expect(bestTradeCard).toBeVisible();

    // 3 Primary Actions
    const analysisBtn = bestTradeCard.getByRole('button', { name: /Complete Analysis|Hide Analysis/i });
    await expect(analysisBtn).toBeVisible();

    const previewBtn = bestTradeCard.getByRole('button', { name: /Preview/i });
    await expect(previewBtn).toBeVisible();

    const kalshiLink = bestTradeCard.getByRole('link', { name: /View on Kalshi/i });
    await expect(kalshiLink).toBeVisible();
    await expect(kalshiLink).toHaveAttribute('href', /kalshi\.com\/markets/);

    // Expand Complete Analysis
    await analysisBtn.click();
    await expect(bestTradeCard.getByText(/Quantitative Thesis & Edge Breakdown/i)).toBeVisible();
  });

  test('Trade drawer opens with dollar sizing and financial economics', async ({ page }) => {
    await page.goto('/');

    // Click Preview on best trade card
    const previewBtn = page.getByRole('button', { name: /Preview/i }).first();
    await previewBtn.click();

    // Trade drawer should appear as bottom sheet
    const drawer = page.locator('form');
    await expect(drawer).toBeVisible();
    await expect(page.getByText('CHOOSE OUTCOME')).toBeVisible();
    await expect(page.getByText('Actual Amount to Bet ($)')).toBeVisible();
    await expect(page.getByText('Financial Economics')).toBeVisible();
    await expect(page.getByText('Total Capital Committed')).toBeVisible();

    // Close drawer
    await page.locator('button:has(.lucide-x)').first().click();
  });
});
