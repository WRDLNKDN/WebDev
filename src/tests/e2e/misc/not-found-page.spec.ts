import { expect, test } from '../fixtures';

test.describe('Not found page', () => {
  test('renders a weirdling-themed 404 and swaps matching copy by variant', async ({
    page,
  }) => {
    await page.goto('/definitely-not-a-real-route', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByText('404')).toBeVisible({ timeout: 25_000 });

    const wizardButton = page.getByRole('button', {
      name: 'Wizard Weirdling',
    });
    const gymButton = page.getByRole('button', {
      name: 'Gym Weirdling',
    });
    const rainbowButton = page.getByRole('button', {
      name: 'Rainbow Weirdling',
    });
    const builderButton = page.getByRole('button', {
      name: 'Builder Weirdling',
    });
    const scienceButton = page.getByRole('button', {
      name: 'Science Weirdling',
    });

    await expect(wizardButton).toBeVisible();
    await expect(gymButton).toBeVisible();
    await expect(rainbowButton).toBeVisible();
    await expect(builderButton).toBeVisible();
    await expect(scienceButton).toBeVisible();

    await wizardButton.click();
    await expect(page.getByText('Wrong portal')).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Wizard Weirdling' }),
    ).toBeVisible();

    await gymButton.click();
    await expect(page.getByText('Page skipped leg day')).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Gym Weirdling' }),
    ).toBeVisible();

    await rainbowButton.click();
    await expect(page.getByText('Page wandered off')).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Rainbow Weirdling' }),
    ).toBeVisible();

    await builderButton.click();
    await expect(page.getByText('Page under construction')).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Builder Weirdling' }),
    ).toBeVisible();

    await scienceButton.click();
    await expect(page.getByText('Experiment failed')).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Science Weirdling' }),
    ).toBeVisible();
  });
});
