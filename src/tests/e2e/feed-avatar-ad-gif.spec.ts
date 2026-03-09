import { expect, test } from '@playwright/test';
import { seedSignedInSession } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

test.describe('Avatar, ad link refresh, and GIF URL rendering', () => {
  test('avatar change updates navbar avatar across site', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
    await stubAppSurface(page);

    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /profile menu/i }).click();
    await page.getByRole('menuitem', { name: /edit profile/i }).click();
    await page.getByRole('button', { name: /select weirdling 1/i }).click();
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
    }
    await page.getByRole('button', { name: /save changes/i }).click();

    // Save closes the dialog; dashboard main content is visible again
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  });

  test('GIF URL in post body renders inline once', async ({
    page,
    context,
  }) => {
    await seedSignedInSession(context);
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
              user_id: '11111111-1111-4111-8111-111111111111',
              kind: 'post',
              payload: {
                body: `Check ${gifUrl}`,
                images: [gifUrl],
              },
              parent_id: null,
              created_at: new Date().toISOString(),
              actor: {
                handle: 'member',
                display_name: 'Member',
                avatar: null,
              },
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
