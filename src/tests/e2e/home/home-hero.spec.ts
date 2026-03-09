import { expect, test } from '../fixtures';

test.describe('Home hero', () => {
  test('shows the updated pre-sign-in hero hierarchy', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { name: 'WRDLNKDN', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    const pronunciation = page.getByText('(Weird Link-uh-din)');
    await expect(pronunciation).toBeVisible();
    await expect(pronunciation).toHaveCSS('font-style', 'italic');

    await expect(page.getByText('Business, but weirder.')).toBeVisible();
    await expect(
      page.getByText('A networking space for people who think differently'),
    ).toBeVisible();

    await expect(page.getByRole('button', { name: 'Join Us' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Already a member? Sign In' }),
    ).toBeVisible();

    await expect(
      page.getByText(
        "A professional networking space where you don't have to pretend.",
      ),
    ).toHaveCount(0);
    await expect(
      page.getByText('For people who build, create, and think differently.'),
    ).toHaveCount(0);
  });
});
