import { expect, test, type Route } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

const FEED_ITEM = {
  id: 'post-reaction-1',
  user_id: 'another-user',
  kind: 'post',
  payload: { body: 'Reaction target post' },
  parent_id: null,
  created_at: '2026-03-06T12:00:00.000Z',
  edited_at: null,
  actor: {
    handle: 'member',
    display_name: 'Member',
    avatar: null,
    bio: 'Senior Engineering Manager',
  },
  like_count: 1,
  love_count: 1,
  inspiration_count: 1,
  care_count: 0,
  laughing_count: 0,
  rage_count: 0,
  viewer_reaction: null,
  comment_count: 0,
  viewer_saved: false,
};

const REPOST_ITEM = {
  id: 'post-repost-1',
  user_id: 'viewer-user',
  kind: 'repost',
  payload: {
    original_id: 'original-post-9',
    snapshot: {
      body: 'Original post body for repost preview',
      created_at: '2026-03-05T10:00:00.000Z',
      actor_handle: 'original-author',
      actor_display_name: 'Original Author',
      actor_avatar: null,
    },
  },
  parent_id: null,
  created_at: '2026-03-06T12:05:00.000Z',
  edited_at: null,
  actor: {
    handle: 'viewer',
    display_name: 'Viewer Member',
    avatar: null,
    bio: null,
  },
  like_count: 0,
  love_count: 0,
  inspiration_count: 0,
  care_count: 0,
  laughing_count: 0,
  rage_count: 0,
  viewer_reaction: null,
  comment_count: 0,
  viewer_saved: false,
};

const ORIGINAL_POST_ITEM = {
  id: 'original-post-9',
  user_id: 'original-user',
  kind: 'post',
  payload: { body: 'Original post body for repost preview' },
  parent_id: null,
  created_at: '2026-03-05T10:00:00.000Z',
  edited_at: null,
  actor: {
    handle: 'original-author',
    display_name: 'Original Author',
    avatar: null,
    bio: 'Original poster bio',
  },
  like_count: 0,
  love_count: 0,
  inspiration_count: 0,
  care_count: 0,
  laughing_count: 0,
  rage_count: 0,
  viewer_reaction: null,
  comment_count: 0,
  viewer_saved: false,
};

// Browser serialization of computed color can differ (e.g. spaces in rgb/rgba).
const MUTED_COLOR = /rgba?\s*\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.65\s*\)/;
const FOCUS_COLOR = /rgb\s*\(\s*141\s*,\s*188\s*,\s*229\s*\)/;

test.describe('Feed reaction picker', () => {
  test('uses the shared emoji tray, stays open across hover, and keeps action colors muted until hover or selection', async ({
    page,
    browserName,
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

    const submittedReactions: string[] = [];
    const fulfillFeedList = async (route: Route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as {
          kind?: string;
          type?: string;
        };
        if (body.kind === 'reaction' && body.type) {
          submittedReactions.push(body.type);
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { ok: true } }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [REPOST_ITEM, FEED_ITEM, ORIGINAL_POST_ITEM],
        }),
      });
    };

    await page.route('**/api/feeds', fulfillFeedList);
    await page.route('**/api/feeds?**', fulfillFeedList);
    await page.route('**/api/feeds/items/**/save', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });
    await page.route('**/api/feeds/items/**/reaction', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });
    await page.route('**/api/feeds/items', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { ok: true } }),
      });
    });

    const feedResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/feeds') &&
        response.request().method() === 'GET',
      { timeout: 20_000 },
    );

    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await feedResponse;
    // Under parallel workers the feed shell can paint before action-bar styles settle.
    await page.waitForTimeout(900);

    if (
      await page
        .getByTestId('error-boundary-fallback')
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

    const originalCard = page
      .locator('section')
      .filter({ hasText: 'Reaction target post' })
      .first();
    const repostCard = page
      .locator('section')
      .filter({ hasText: 'Original post body for repost preview' })
      .first();
    const reactButton = originalCard.getByRole('button', { name: 'React' });
    const commentButton = originalCard.getByRole('button', {
      name: 'Comment',
    });
    const repostButton = originalCard.getByRole('button', { name: 'Repost' });
    const sendButton = originalCard.getByRole('button', { name: 'Send' });
    const saveButton = originalCard.getByRole('button', { name: 'Save' });
    await expect(page.getByText('Senior Engineering Manager')).toBeVisible();
    await expect(repostCard.getByText(/^Original Post$/)).toHaveCount(0);
    await expect(
      repostCard.getByRole('link', { name: 'Original Author' }).first(),
    ).toBeVisible();
    await expect(
      repostCard.getByRole('button', { name: 'View Original Post' }),
    ).toBeVisible();
    await repostCard
      .getByRole('button', { name: 'View Original Post' })
      .click();
    await expect(page.locator('#post-original-post-9')).toHaveAttribute(
      'data-feed-post-highlighted',
      'true',
    );
    await expect(reactButton).toBeVisible();
    await expect(reactButton).toHaveCSS('color', MUTED_COLOR);
    await expect(commentButton).toHaveCSS('color', MUTED_COLOR);
    await expect(repostButton).toHaveCSS('color', MUTED_COLOR);
    await expect(sendButton).toHaveCSS('color', MUTED_COLOR);
    await expect(saveButton).toHaveCSS('color', MUTED_COLOR);
    await reactButton.scrollIntoViewIfNeeded();

    await commentButton.hover();
    if (browserName !== 'firefox') {
      await expect(commentButton).toHaveCSS('color', FOCUS_COLOR);
    }
    await repostButton.hover();
    if (browserName !== 'firefox') {
      await expect(repostButton).toHaveCSS('color', FOCUS_COLOR);
    }
    await sendButton.hover();
    if (browserName !== 'firefox') {
      await expect(sendButton).toHaveCSS('color', FOCUS_COLOR);
    }
    await saveButton.hover();
    if (browserName !== 'firefox') {
      await expect(saveButton).toHaveCSS('color', FOCUS_COLOR);
    }

    const postOptionsButton = originalCard.getByRole('button', {
      name: 'Post options',
    });
    await expect(postOptionsButton).toBeVisible();
    await postOptionsButton.click();
    await expect(page.getByRole('menuitem', { name: 'Save' })).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Copy link to post' }),
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: /Not interested/i }),
    ).toBeVisible();
    await page.mouse.click(0, 0);

    await reactButton.hover({ force: true });
    await expect(reactButton).toHaveCSS('color', FOCUS_COLOR);
    let usedFocusFallback = false;
    if ((await reactButton.getAttribute('aria-expanded')) !== 'true') {
      await reactButton.focus();
      usedFocusFallback = true;
    }

    const laughButton = originalCard.getByRole('button', { name: 'Laugh' });
    const surprisedButton = originalCard.getByRole('button', {
      name: 'Surprised',
    });
    const prayerButton = originalCard.getByRole('button', {
      name: 'Prayer Hands',
    });
    const rageButton = originalCard.getByRole('button', { name: 'Rage' });

    await reactButton.click();
    await expect(laughButton).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1200);
    await expect(reactButton).toHaveAttribute('aria-expanded', 'true');
    await expect(laughButton).toBeVisible();
    await expect(laughButton).toContainText('😂');
    await expect(surprisedButton).toContainText('😮');
    await expect(prayerButton).toContainText('🙏');
    await laughButton.click();
    await expect(reactButton).toHaveCSS('color', FOCUS_COLOR);
    await expect(originalCard.getByText('4 reactions')).toBeVisible();
    await expect(originalCard.getByLabel('React')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await saveButton.click();
    await expect(saveButton).toHaveCSS('color', FOCUS_COLOR);
    await expect(saveButton).toContainText('Saved');

    await repostButton.click();
    const repostMenuItem = page.getByRole('menuitem', {
      name: 'Repost',
      exact: true,
    });
    await expect(repostMenuItem).toBeVisible();
    await repostMenuItem.click();
    await expect(originalCard.getByText('Reposted')).toBeVisible({
      timeout: 10_000,
    });

    await sendButton.click();
    await page.getByRole('button', { name: 'Copy link' }).click();
    const sentButton = originalCard.getByRole('button', { name: 'Sent' });
    await expect(sentButton).toHaveCSS('color', FOCUS_COLOR);
    await expect(sentButton).toHaveAttribute('aria-pressed', 'true');
    await expect(sentButton).toContainText('Sent');

    if (usedFocusFallback) {
      await page.mouse.click(0, 0);
    } else {
      await page.mouse.move(0, 0);
    }
    await expect(laughButton).toBeHidden({ timeout: 4000 });

    await reactButton.click();
    await expect(rageButton).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1200);
    await expect(reactButton).toHaveAttribute('aria-expanded', 'true');
    await rageButton.click();
    await expect(rageButton).toBeHidden({ timeout: 4000 });
    await expect(originalCard.getByText('4 reactions')).toBeVisible();
    expect(submittedReactions).toEqual(['laughing', 'rage']);
  });
});
