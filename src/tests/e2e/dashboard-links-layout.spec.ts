import { expect, test } from '@playwright/test';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Dashboard links and profile layout regressions', () => {
  test('profile header is left-justified and pills do not stretch full width', async ({
    page,
  }) => {
    await stubAppSurface(page);

    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    // ---- HEADER LEFT ALIGN CHECK ----

    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();

    const headerContainer = heading.locator(
      'xpath=ancestor::*[self::section or self::div][1]',
    );

    const [headingBox, containerBox] = await Promise.all([
      heading.boundingBox(),
      headerContainer.boundingBox(),
    ]);

    expect(headingBox).not.toBeNull();
    expect(containerBox).not.toBeNull();

    // heading should not be centered or pushed right
    const leftOffset = (headingBox?.x ?? 0) - (containerBox?.x ?? 0);

    expect(leftOffset).toBeLessThan(280);

    // ---- PILL WIDTH CHECK ----

    // target chips/pills without coupling to MUI classnames
    const pills = page.locator(
      '[role="button"], [class*="Chip"], [class*="pill"]',
    );

    const pillCount = await pills.count();
    expect(pillCount).toBeGreaterThan(0);

    const firstPill = pills.first();

    const pillMetrics = await firstPill.evaluate((el) => {
      const parent = el.parentElement;
      const rect = el.getBoundingClientRect();
      const parentRect = parent?.getBoundingClientRect();

      return {
        width: rect.width,
        parentWidth: parentRect?.width ?? 0,
      };
    });

    // pill should not be full width
    expect(pillMetrics.width).toBeLessThan(pillMetrics.parentWidth * 0.95);
  });
});
