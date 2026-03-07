import { expect, test, type Route } from './fixtures';
import { seedSignedInSession, USER_ID } from './utils/auth';
import { stubAppSurface } from './utils/stubAppSurface';

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
  test('opens on hover and uses the correct Care/Happy colors', async ({
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
    await reactButton.scrollIntoViewIfNeeded();
    await reactButton.hover({ force: true });
    let usedFocusFallback = false;
    if ((await reactButton.getAttribute('aria-expanded')) !== 'true') {
      await reactButton.focus();
      usedFocusFallback = true;
    }

    const careButton = page.getByRole('button', { name: 'Care' });
    const happyButton = page.getByRole('button', { name: 'Happy' });

    await expect(careButton).toBeVisible({ timeout: 1000 });
    await expect(happyButton).toBeVisible();

    await expect(careButton).toHaveAttribute('data-reaction-color', '#9c27b0');
    await expect(happyButton).toHaveAttribute('data-reaction-color', '#66bb6a');

    if (usedFocusFallback) {
      await page.mouse.click(0, 0);
    } else {
      await page.mouse.move(0, 0);
    }
    await expect(careButton).toBeHidden({ timeout: 1500 });
  });
});
