import { expect, test } from '@playwright/test';

test.describe('Join mobile scroll', () => {
  test.use({ viewport: { width: 320, height: 500 } });

  test('join flow can scroll on mobile viewport', async ({ page }) => {
    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ avatarUrl: null }),
      });
    });

    await page.goto('/join');
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Create your profile/i }).click();
    await expect(
      page.getByRole('heading', { name: /Sign in with intent/i }),
    ).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>(
        '[data-testid="join-scroll-container"]',
      );
      if (!container) return false;
      return container.scrollHeight > container.clientHeight;
    });
    if (!hasOverflow) {
      const overflowY = await page.evaluate(() => {
        const container = document.querySelector<HTMLElement>(
          '[data-testid="join-scroll-container"]',
        );
        if (!container) return '';
        return window.getComputedStyle(container).overflowY;
      });
      expect(overflowY).toBe('auto');
      return;
    }

    await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>(
        '[data-testid="join-scroll-container"]',
      );
      if (container) container.scrollTop = 0;
    });
    await page.locator('[data-testid="join-scroll-container"]').hover();
    await page.mouse.wheel(0, 700);
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const container = document.querySelector<HTMLElement>(
            '[data-testid="join-scroll-container"]',
          );
          return container?.scrollTop ?? 0;
        }),
      )
      .toBeGreaterThan(0);
  });
});
