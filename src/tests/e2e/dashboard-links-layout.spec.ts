import { expect, test, type Page, type Route } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function mockSessionPayload() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'member@example.com',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { handle: 'member', full_name: 'Member' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

async function seedSignedInSession(page: Page) {
  const payload = mockSessionPayload();
  await page.addInitScript((session) => {
    [
      'dev-sb-wrdlnkdn-auth',
      'uat-sb-wrdlnkdn-auth',
      'prod-sb-wrdlnkdn-auth',
    ].forEach((key) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    });
  }, payload);
}

async function fulfillPostgrest(route: Route, rowOrRows: unknown) {
  const accept = route.request().headers()['accept'] || '';
  const isSingle = accept.includes('application/vnd.pgrst.object+json');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(
      isSingle && Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows,
    ),
  });
}

test.describe('Dashboard links and profile layout regressions', () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInSession(page);

    await page.route('**/api/me/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { avatarUrl: null } }),
      });
    });

    await page.route('**/rest/v1/rpc/is_admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(false),
      });
    });

    await page.route('**/rest/v1/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/0' },
        body: '[]',
      });
    });

    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      await fulfillPostgrest(route, []);
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await fulfillPostgrest(route, [
        {
          id: USER_ID,
          handle: 'member',
          display_name: 'April Drake',
          avatar: null,
          status: 'approved',
          join_reason: ['networking'],
          participation_style: ['builder'],
          policy_version: '1.0',
          industry: 'Technology,Healthcare,Education,Engineering',
          nerd_creds: {
            bio: 'Technology leader with systems mindset.',
            skills: [
              'Technical Program Management',
              'Technical Product Management',
              'Technical Project Management',
            ],
          },
          socials: [],
        },
      ]);
    });
  });

  test('edit links form state persists across browser tab switches', async ({
    page,
    context,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: 'Edit Links' }).first().click();
    await expect(page.getByText('ADD NEW LINK')).toBeVisible();

    const linksDialog = page
      .getByRole('dialog')
      .filter({ hasText: 'ADD NEW LINK' });
    const platformSelect = linksDialog.getByRole('combobox').nth(1);
    await platformSelect.click();
    await page.getByRole('option', { name: 'LinkedIn' }).click();
    await linksDialog
      .getByRole('textbox', { name: 'URL' })
      .fill('https://linkedin.com/in/aprillordrake');

    const otherTab = await context.newPage();
    await otherTab.goto('about:blank');
    await otherTab.bringToFront();
    await page.bringToFront();

    await expect(platformSelect).toContainText('LinkedIn');
    await expect(linksDialog.getByRole('textbox', { name: 'URL' })).toHaveValue(
      'https://linkedin.com/in/aprillordrake',
    );
    await expect(
      linksDialog.getByRole('button', { name: 'Add to List' }),
    ).toBeEnabled();
  });

  test('profile header is left-justified and pills do not stretch full width', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    const nameHeading = page.getByRole('heading', { name: 'April Drake' });
    const identityHeader = nameHeading.locator(
      'xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]',
    );
    await expect(identityHeader).toBeVisible();
    await expect(nameHeading).toBeVisible();

    const [headerBox, nameBox] = await Promise.all([
      identityHeader.boundingBox(),
      nameHeading.boundingBox(),
    ]);
    expect(headerBox).not.toBeNull();
    expect(nameBox).not.toBeNull();
    expect((nameBox?.x ?? 0) - (headerBox?.x ?? 0)).toBeLessThan(280);

    const skillPill = identityHeader
      .locator(
        "xpath=.//*[normalize-space(text())='Technical Program Management' and not(*)]",
      )
      .first();
    const industryPill = identityHeader
      .locator("xpath=.//*[normalize-space(text())='Technology' and not(*)]")
      .first();
    await expect(skillPill).toBeVisible();
    await expect(industryPill).toBeVisible();

    const [skillMetrics, industryMetrics] = await Promise.all([
      skillPill.evaluate((el) => {
        const parent = el.parentElement;
        return {
          width: el.getBoundingClientRect().width,
          parentWidth: parent?.getBoundingClientRect().width ?? 0,
        };
      }),
      industryPill.evaluate((el) => {
        const parent = el.parentElement;
        return {
          width: el.getBoundingClientRect().width,
          parentWidth: parent?.getBoundingClientRect().width ?? 0,
        };
      }),
    ]);

    expect(skillMetrics.width).toBeLessThan(skillMetrics.parentWidth * 0.95);
    expect(industryMetrics.width).toBeLessThan(
      industryMetrics.parentWidth * 0.95,
    );
  });
});
