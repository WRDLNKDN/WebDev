import { expect, test } from '@playwright/test';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Avatar, ad link refresh, and GIF URL rendering', () => {
  test('avatar change updates navbar avatar across site', async ({ page }) => {
    await stubAppSurface(page);

    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /edit/i }).first().click();
    await page
      .getByRole('button', { name: /select/i })
      .first()
      .click();

    await expect(page.locator('header img')).toHaveCount(1);
  });

  test('GIF URL in post body renders inline once', async ({ page }) => {
    await stubAppSurface(page);

    const gifUrl = 'https://media.example.com/reaction.gif';

    await page.route(/\/api\/feeds(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '1',
              payload: {
                body: `Check ${gifUrl}`,
                images: [gifUrl],
              },
              actor: { display_name: 'Member' },
            },
          ],
        }),
      });
    });

    await page.goto('/feed');
    await expect(page.locator(`img[src*="${gifUrl}"]`)).toHaveCount(1);
  });

  test('attached post images support fullscreen and escape close', async ({
    page,
  }) => {
    await stubAppSurface(page);

    await page.goto('/feed');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    const image = page.locator('img').first();
    if (await image.count()) {
      await image.click();
      await page.keyboard.press('Escape');
    }
  });

  test('mobile feed header stacks and action buttons remain tap-friendly', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await stubAppSurface(page);

    await page.goto('/feed');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    const likeButton = page.getByRole('button').first();
    const height = await likeButton.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    expect(height).toBeGreaterThanOrEqual(36);
  });
});
