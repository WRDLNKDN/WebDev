import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../fixtures';
import { stubAppSurface } from '../utils/stubAppSurface';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_FIXTURE = path.resolve(
  __dirname,
  '../../../../public/assets/logo.png',
);

test.describe('Advertise modal', () => {
  test('renders as a modal, validates destination link, and submits it in the payload', async ({
    page,
  }) => {
    let submittedBody = '';
    await page.route('**/api/advertise/request', async (route) => {
      submittedBody = route.request().postData() ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          message: 'Request sent successfully.',
        }),
      });
    });
    await stubAppSurface(page);

    await page.goto('/advertise', { waitUntil: 'domcontentloaded' });

    const dialog = page.getByRole('dialog', { name: 'Advertise with us' });
    await expect(dialog).toBeVisible();

    const bodyOverflow = await page.evaluate(
      () => window.getComputedStyle(document.body).overflow,
    );
    expect(bodyOverflow).toBe('hidden');

    const submitButton = dialog.getByRole('button', { name: 'Send request' });
    await expect(submitButton).toBeDisabled();

    await dialog.getByLabel('Name').fill('April Drake');
    await dialog.getByLabel('Email').fill('april@example.com');
    await dialog.getByLabel('Destination Link').fill('http://example.com');
    await dialog.getByLabel('Message').fill('This is a real message body.');
    await dialog
      .getByLabel('Brief Description of Your Ad Copy')
      .fill('This is a real ad copy summary.');
    await dialog.locator('input[type="file"]').setInputFiles(IMAGE_FIXTURE);

    await expect(
      dialog.getByText('Enter a valid https:// destination URL.'),
    ).toBeVisible();
    await expect(submitButton).toBeDisabled();

    await dialog
      .getByLabel('Destination Link')
      .fill('https://example.com/campaign');
    await expect(submitButton).toBeEnabled();

    await submitButton.click();
    await expect(page).toHaveURL('/');

    expect(submittedBody).toContain('name="destinationUrl"');
    expect(submittedBody).toContain('https://example.com/campaign');
  });

  test('fits on mobile with internal modal scroll and no horizontal overflow', async ({
    page,
  }) => {
    await stubAppSurface(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/advertise', { waitUntil: 'domcontentloaded' });

    const dialog = page.getByRole('dialog', { name: 'Advertise with us' });
    await expect(dialog).toBeVisible();

    const metrics = await dialog.evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.scrollHeight).toBeGreaterThanOrEqual(metrics.clientHeight);

    await dialog.getByLabel('Close advertise modal').click();
    await expect(page).toHaveURL('/');
  });
});
