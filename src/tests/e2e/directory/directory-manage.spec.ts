import type { BrowserContext, Locator, Page } from '@playwright/test';

import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

const CONNECTED_MEMBER = {
  id: '22222222-2222-4222-8222-222222222222',
  handle: 'ora',
  display_name: 'Orana Velarde',
  avatar: null,
  tagline: null,
  pronouns: null,
  industry: 'Technology and Software',
  secondary_industry: null,
  location: null,
  skills: [] as string[],
  bio_snippet: null,
  connection_state: 'connected' as const,
  use_weirdling_avatar: false,
};

async function stubDirectoryWithConnectedMember(page: Page) {
  await page.route('**/api/directory*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [CONNECTED_MEMBER],
        hasMore: false,
      }),
    });
  });
}

async function gotoStubbedDirectory(page: Page, context: BrowserContext) {
  const { stubAdminRpc } = await seedSignedInSession(context);
  await stubAdminRpc(page);
  await stubAppSurface(page);
  await stubDirectoryWithConnectedMember(page);

  await page.goto('/directory');
  await expect(page.locator('main').first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole('heading', { name: /discover members/i }),
  ).toBeVisible({
    timeout: 20_000,
  });
}

async function openManageConnectionMenu(page: Page) {
  await expect(
    page.getByRole('button', { name: /manage connection/i }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole('button', { name: /manage connection/i }).click();
}

async function clickCancelAndExpectDialogClosed(page: Page, dialog: Locator) {
  await page
    .getByRole('button', { name: /cancel/i })
    .first()
    .click();
  await expect(dialog).not.toBeVisible();
}

test.describe('Directory Manage menu (Disconnect / Block)', () => {
  // fixme: E2E auth/session stub causes SYSTEM_HALT on directory; fix stubs or run against real backend
  test.beforeEach(async ({ page, context }) => {
    test.setTimeout(45_000);
    await gotoStubbedDirectory(page, context);
    await openManageConnectionMenu(page);
  });

  test.fixme('Manage opens menu with Disconnect and Block; Disconnect shows confirmation', async ({
    page,
  }) => {
    await expect(
      page.getByRole('menuitem', { name: /disconnect/i }),
    ).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /block/i })).toBeVisible();

    await page.getByRole('menuitem', { name: /disconnect/i }).click();

    const disconnectDialog = page
      .getByRole('dialog')
      .filter({ hasText: /disconnect from/i });
    await expect(disconnectDialog).toBeVisible();
    await expect(
      page.getByText(/this will remove your connection/i),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /cancel/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /confirm/i }).first(),
    ).toBeVisible();

    await clickCancelAndExpectDialogClosed(page, disconnectDialog);
  });

  test.fixme('Manage → Block shows Block confirmation dialog', async ({
    page,
  }) => {
    await page.getByRole('menuitem', { name: /^block$/i }).click();

    const blockDialog = page.getByRole('dialog', { name: 'Block' });
    await expect(blockDialog).toBeVisible();
    await expect(
      page.getByText(
        /blocking will remove your connection and prevent future interactions/i,
      ),
    ).toBeVisible();
    await expect(page.getByText(/unblock later in settings/i)).toBeVisible();

    await clickCancelAndExpectDialogClosed(page, blockDialog);
  });
});
