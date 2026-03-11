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
};

test.describe('Feed reaction picker', () => {
  test('stays stable on click and persists Laugh and Rage in the post summary', async ({
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
    await expect(page.getByText('Senior Engineering Manager')).toBeVisible();
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
      page.getByRole('menuitem', { name: 'Copy link to post' }),
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: /Not interested/i }),
    ).toBeVisible();
    await page.mouse.click(0, 0);

    const laughButton = page.getByRole('button', { name: 'Laugh' });
    const sadButton = page.getByRole('button', { name: 'Sad' });

    await reactButton.click();
    await expect(laughButton).toBeVisible({ timeout: 1000 });
    await page.waitForTimeout(700);
    await expect(reactButton).toHaveAttribute('aria-expanded', 'true');
    await expect(laughButton).toBeVisible();
    await laughButton.click();
    await expect(laughButton).toBeHidden({ timeout: 1500 });
    await expect(page.getByText('4 reactions')).toBeVisible();
    await expect(
      page
        .locator('span[aria-hidden="true"]')
        .filter({ hasText: '😂' })
        .first(),
    ).toBeVisible();

    await reactButton.click();
    await expect(sadButton).toBeVisible({ timeout: 1000 });
    await page.waitForTimeout(700);
    await expect(reactButton).toHaveAttribute('aria-expanded', 'true');
    await sadButton.click();
    await expect(sadButton).toBeHidden({ timeout: 1500 });
    await expect(page.getByText('4 reactions')).toBeVisible();
    await expect(
      page
        .locator('span[aria-hidden="true"]')
        .filter({ hasText: '😢' })
        .first(),
    ).toBeVisible();
    expect(submittedReactions).toEqual(['laughing', 'rage']);
  });
});
