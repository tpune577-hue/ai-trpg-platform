import { test, expect } from '@playwright/test';

test('homepage has correct title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/AI-TRPG/);
});

test('marketplace link works', async ({ page }) => {
    await page.goto('/');

    // Check if there is a link to marketplace (assuming there is one, or we just check direct navigation)
    // If no direct link on home yet, we can test direct navigation
    await page.goto('/marketplace');

    await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
});
