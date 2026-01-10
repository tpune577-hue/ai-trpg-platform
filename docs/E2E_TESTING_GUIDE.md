# End-to-End (E2E) Testing Guide - Playwright

## Overview

We usage **Playwright** for E2E testing. Playwright allows testing the application across multiple browsers (Chrome, Firefox, Safari) and mobile viewports.

## Installation

Playwright and its browsers have been installed.

## Configuration

Config file: `playwright.config.ts`
- Base URL: `http://localhost:3000`
- Test Directory: `e2e/`
- Automatic Web Server: It will auto-start `npm run dev` before tests.

## Running Tests

### 1. Run All Tests (Headless)
Runs all tests in the console.
```bash
npm run test:e2e
```

### 2. Run with UI Mode (Recommended)
Opens an interactive UI to run and debug tests.
```bash
npm run test:e2e:ui
```

### 3. Show Report
View the HTML report of the last run.
```bash
npm run test:e2e:report
```

## Writing Tests

Create files in the `e2e/` directory, e.g., `e2e/login.spec.ts`.

### Example Test

```typescript
import { test, expect } from '@playwright/test';

test('navigate to marketplace', async ({ page }) => {
  // Go to homepage
  await page.goto('/');

  // Find and click the marketplace link/button
  await page.getByText('Marketplace').click();

  // Verify URL
  await expect(page).toHaveURL(/.*marketplace/);
  
  // Verify content
  await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
});
```

### Tips
- Use `await page.pause()` to pause execution and debug in UI mode.
- Use `npx playwright codegen` to record actions and generate test code automatically!

## Browser Support
The current config runs tests in:
- Desktop Chrome
- Desktop Firefox
- Desktop Safari
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)
