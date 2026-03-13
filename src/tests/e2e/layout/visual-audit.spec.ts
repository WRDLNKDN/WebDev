import { existsSync } from 'node:fs';
import { expect, test, type Route } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

const FEED_ITEM = {
  id: 'visual-post-1',
  user_id: 'another-user',
  kind: 'post',
  payload: { body: 'Visual audit reference post for the feed surface.' },
  parent_id: null,
  created_at: '2026-03-06T12:00:00.000Z',
  edited_at: null,
  actor: {
    handle: 'member',
    display_name: 'Member',
    avatar: null,
    bio: 'Senior Engineering Manager',
  },
  like_count: 3,
  love_count: 1,
  inspiration_count: 1,
  care_count: 0,
  laughing_count: 0,
  rage_count: 0,
  viewer_reaction: 'like',
  comment_count: 2,
  viewer_saved: true,
};

async function stabilizePage(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      video {
        visibility: hidden !important;
      }
      ::-webkit-scrollbar {
        display: none !important;
      }
    `,
  });
}

function skipWhenSnapshotMissing(
  testInfo: import('@playwright/test').TestInfo,
  fileName: string,
) {
  test.skip(
    !existsSync(testInfo.snapshotPath(fileName)),
    `Missing visual baseline for ${fileName} on this platform.`,
  );
}

test.describe('Visual audit baselines', () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Visual baselines are kept in Chromium.',
    );
    const { stubAdminRpc } = await seedSignedInSession(context, {
      handle: 'member',
    });
    await stubAdminRpc(page);
    await stubAppSurface(page);
    await stabilizePage(page);
  });

  test('dashboard overview baseline', async ({ page }, testInfo) => {
    skipWhenSnapshotMissing(testInfo, 'dashboard-overview.png');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const appMain = page.getByTestId('app-main');
    await expect(appMain).toBeVisible({ timeout: 25_000 });
    await expect(appMain).toHaveScreenshot('dashboard-overview.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('feed card baseline', async ({ page }, testInfo) => {
    skipWhenSnapshotMissing(testInfo, 'feed-card-baseline.png');
    const fulfillFeedList = async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [FEED_ITEM] }),
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

    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(FEED_ITEM.payload.body)).toBeVisible({
      timeout: 20_000,
    });

    const appMain = page.getByTestId('app-main');
    await expect(appMain).toHaveScreenshot('feed-card-baseline.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('feed mobile baseline', async ({ page }, testInfo) => {
    skipWhenSnapshotMissing(testInfo, 'feed-card-mobile.png');
    const fulfillFeedList = async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [FEED_ITEM] }),
      });
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/feeds', fulfillFeedList);
    await page.route('**/api/feeds?**', fulfillFeedList);
    await page.route('**/api/feeds/items/**/save', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });
    await page.route('**/api/feeds/items/**/reaction', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(FEED_ITEM.payload.body)).toBeVisible({
      timeout: 20_000,
    });

    const appMain = page.getByTestId('app-main');
    await expect(appMain).toHaveScreenshot('feed-card-mobile.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('notifications request baseline', async ({ page }, testInfo) => {
    skipWhenSnapshotMissing(testInfo, 'dashboard-notifications-request.png');
    await page.route('**/rest/v1/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([
          {
            id: 'notification-1',
            recipient_id: '11111111-1111-4111-8111-111111111111',
            actor_id: '22222222-2222-4222-8222-222222222222',
            type: 'connection_request',
            reference_id: 'connection-request-1',
            reference_type: null,
            payload: {},
            created_at: '2026-03-10T15:00:00.000Z',
            read_at: null,
          },
        ]),
      });
    });
    await page.route('**/rest/v1/profiles*', async (route) => {
      const url = route.request().url();
      if (!url.includes('id=in.')) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([
          {
            id: '22222222-2222-4222-8222-222222222222',
            handle: 'ora',
            display_name: 'Orana Velarde',
            avatar: null,
          },
        ]),
      });
    });
    await page.route('**/rest/v1/connection_requests*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'connection-request-1', status: 'pending' },
        ]),
      });
    });

    await page.goto('/dashboard/notifications', {
      waitUntil: 'domcontentloaded',
    });
    const appMain = page.getByTestId('app-main');
    await expect(appMain).toBeVisible({ timeout: 25_000 });
    await expect(
      page.getByRole('button', { name: 'Approve connection request' }),
    ).toBeVisible({ timeout: 20_000 });

    await expect(appMain).toHaveScreenshot(
      'dashboard-notifications-request.png',
      {
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
        maxDiffPixelRatio: 0.01,
      },
    );
  });

  test('dashboard share dialog baseline', async ({ page }, testInfo) => {
    skipWhenSnapshotMissing(testInfo, 'dashboard-share-dialog.png');
    await page.route(
      '**/rest/v1/rpc/get_or_create_profile_share_token*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify('member-share-token'),
        });
      },
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 25_000,
    });

    const profileMenuButton = page.getByRole('button', {
      name: 'Profile menu',
    });
    await expect(profileMenuButton).toBeEnabled({ timeout: 20_000 });
    await profileMenuButton.click({ force: true });
    await page.getByRole('menuitem', { name: 'Share My Profile' }).click();

    const dialog = page.getByRole('dialog', { name: 'Share My Profile' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveScreenshot('dashboard-share-dialog.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('dashboard links add button baseline', async ({ page }, testInfo) => {
    skipWhenSnapshotMissing(testInfo, 'dashboard-links-add-button.png');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const linksSection = page.getByTestId('dashboard-links-section');
    await expect(linksSection).toBeVisible({
      timeout: 25_000,
    });

    await expect(
      linksSection.getByRole('button', { name: 'Add links' }),
    ).toHaveScreenshot('dashboard-links-add-button.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('public profile baseline', async ({ page }, testInfo) => {
    skipWhenSnapshotMissing(testInfo, 'public-profile-baseline.png');
    await page.route('**/rest/v1/portfolio_items*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-1/2' },
        body: JSON.stringify([
          {
            id: 'portfolio-1',
            owner_id: '11111111-1111-4111-8111-111111111111',
            title: 'Platform Migration Case Study',
            description:
              'Shipped a zero-downtime migration across three teams.',
            project_url: 'https://example.com/case-study',
            image_url: null,
            tech_stack: ['TypeScript', 'Playwright', 'Supabase'],
            is_highlighted: true,
            sort_order: 0,
            normalized_url: 'https://example.com/case-study',
            embed_url: null,
            resolved_type: 'link',
            thumbnail_url: null,
            thumbnail_status: null,
          },
          {
            id: 'portfolio-2',
            owner_id: '11111111-1111-4111-8111-111111111111',
            title: 'Design System Rollout',
            description:
              'Standardized shared UI tokens and interaction states.',
            project_url: 'https://example.com/design-system',
            image_url: null,
            tech_stack: ['React', 'MUI'],
            is_highlighted: false,
            sort_order: 1,
            normalized_url: 'https://example.com/design-system',
            embed_url: null,
            resolved_type: 'link',
            thumbnail_url: null,
            thumbnail_status: null,
          },
        ]),
      });
    });

    await page.goto('/p/h~member', { waitUntil: 'domcontentloaded' });
    const appMain = page.getByTestId('app-main');
    await expect(appMain).toBeVisible({ timeout: 25_000 });
    await expect(
      page.getByRole('heading', { name: 'Platform Migration Case Study' }),
    ).toBeVisible({ timeout: 20_000 });

    await expect(appMain).toHaveScreenshot('public-profile-baseline.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    });
  });
});
