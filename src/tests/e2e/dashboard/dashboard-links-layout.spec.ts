import { expect, test } from '@playwright/test';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

test.describe('Dashboard links and profile layout regressions', () => {
  test('profile header is left-justified and pills do not stretch full width', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.goto('/dashboard', { timeout: 20000 });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 15000 });

    // ---- HEADER LEFT ALIGN CHECK (scope to main to avoid dialogs/overlays) ----

    const heading = main.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    const headerContainer = heading.locator(
      'xpath=ancestor::*[self::section or self::div][1]',
    );

    // Wait for layout so boundingBox() is non-null (can be null before paint)
    let headingBox: Awaited<ReturnType<typeof heading.boundingBox>> = null;
    let containerBox: Awaited<ReturnType<typeof headerContainer.boundingBox>> =
      null;
    await expect
      .poll(
        async () => {
          headingBox = await heading.boundingBox();
          return headingBox;
        },
        { timeout: 5000 },
      )
      .not.toBeNull();
    await expect
      .poll(
        async () => {
          containerBox = await headerContainer.boundingBox();
          return containerBox;
        },
        { timeout: 5000 },
      )
      .not.toBeNull();

    if (headingBox === null || containerBox === null) {
      throw new Error('bounding boxes unavailable after poll');
    }

    // heading should not be centered or pushed right (left-aligned)
    const hb = headingBox as { x: number };
    const cb = containerBox as { x: number };
    const leftOffset = hb.x - cb.x;

    expect(leftOffset).toBeLessThan(400);

    // ---- PILL WIDTH CHECK (when profile has skills/industries) ----

    const pills = page.getByTestId('dashboard-pill');
    const pillCount = await pills.count();

    if (pillCount > 0) {
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

      // pill should not be full width (allow for narrow parent / single pill)
      expect(pillMetrics.width).toBeLessThan(pillMetrics.parentWidth * 0.99);
    }
  });
});
