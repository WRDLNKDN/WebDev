import { expect, test, type Route } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

const FEED_ITEM = {
  id: 'post-reaction-1',
  user_id: USER_ID,
  kind: 'post',
  payload: { body: 'Reaction target post' },
  parent_id: null,
  created_at: '2026-03-06T12:00:00.000Z',
  edited_at: null,
  actor: {
    handle: 'member',
    display_name: 'Member',
    avatar: null,
  },
  like_count: 0,
  love_count: 0,
  inspiration_count: 0,
  care_count: 0,
  laughing_count: 0,
  rage_count: 0,
  viewer_reaction: null,
  comment_count: 0,
};

test.describe('Feed reaction picker', () => {
  test('uses the shared emoji tray, stays open across hover, and shows the post menu', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.stack ?? error.message);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const text = message.text();
        // Supabase realtime websocket failures are non-fatal for this UI test.
        if (
          text.includes('/realtime/v1/websocket') &&
          text.includes('ERR_NAME_NOT_RESOLVED')
        ) {
          return;
        }
        pageErrors.push(text);
      }
    });

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubAppSurface(page);

    const fulfillFeedList = async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [FEED_ITEM] }),
      });
    };

    await page.route('**/api/feeds', fulfillFeedList);
    await page.route('**/api/feeds?**', fulfillFeedList);

    const feedResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/feeds') &&
        response.request().method() === 'GET',
      { timeout: 20_000 },
    );

    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await feedResponse;
    await page.waitForTimeout(500);

    if (
      await page
        .getByText('[SYSTEM_HALT]')
        .isVisible()
        .catch(() => false)
    ) {
      throw new Error(
        `Feed surface crashed while mounting reaction bar:\n${pageErrors.join('\n\n')}`,
      );
    }

    try {
      await page
        .getByText('Reaction target post')
        .waitFor({ state: 'visible', timeout: 20_000 });
    } catch {
      const bodyText = await page.locator('body').innerText();
      throw new Error(
        `Feed item did not render.\nErrors:\n${pageErrors.join('\n\n')}\n\nBody:\n${bodyText}`,
      );
    }

    const reactButton = page.getByRole('button', { name: 'React' }).first();
    await expect(reactButton).toBeVisible();
    await expect(reactButton).toHaveCSS('color', 'rgba(255, 255, 255, 0.65)');
    await reactButton.scrollIntoViewIfNeeded();

    const postOptionsButton = page.getByRole('button', {
      name: 'Post options',
    });
    await expect(postOptionsButton).toBeVisible();
    await postOptionsButton.click();
    await expect(page.getByRole('menuitem', { name: 'Save' })).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Copy link' }),
    ).toBeVisible();
    await page.mouse.click(0, 0);

    await reactButton.hover({ force: true });
    let usedFocusFallback = false;
    if ((await reactButton.getAttribute('aria-expanded')) !== 'true') {
      await reactButton.focus();
      usedFocusFallback = true;
    }

    const laughButton = page.getByRole('button', { name: 'Laugh' });
    const surprisedButton = page.getByRole('button', { name: 'Surprised' });
    const prayerButton = page.getByRole('button', { name: 'Prayer Hands' });

    await expect(laughButton).toBeVisible({ timeout: 1000 });
    await expect(surprisedButton).toBeVisible();
    await expect(prayerButton).toBeVisible();

    await laughButton.hover({ force: true });
    await expect(laughButton).toBeVisible();
    await expect(laughButton).toContainText('😂');
    await expect(surprisedButton).toContainText('😮');
    await expect(prayerButton).toContainText('🙏');

    if (usedFocusFallback) {
      await page.mouse.click(0, 0);
    } else {
      await page.mouse.move(0, 0);
    }
    await expect(laughButton).toBeHidden({ timeout: 1500 });
  });
});
