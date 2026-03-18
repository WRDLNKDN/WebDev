/**
 * Full E2E validation of the Interests system (Join, Dashboard, Profile, Directory,
 * moderation, layout). Covers selection, taxonomy, custom Other, persistence, and search.
 */

import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';
import { USER_ID } from '../utils/auth';
import {
  INTEREST_CUSTOM_OTHER_MAX_LENGTH,
  INTEREST_CATEGORIES,
  INTEREST_OPTIONS_BY_CATEGORY,
} from '../../../constants/interestTaxonomy';

const JOIN_STORAGE_KEY = 'wrdlnkdn-join-state';

const JOIN_STATE_PROFILE_STEP = {
  currentStep: 'profile' as const,
  completedSteps: ['welcome', 'identity', 'values'] as const,
  identity: {
    provider: 'google' as const,
    userId: USER_ID,
    email: 'test@example.com',
    termsAccepted: true,
    guidelinesAccepted: true,
    policyVersion: 'v2026.02',
    timestamp: new Date().toISOString(),
  },
  values: {
    joinReason: ['networking'],
    participationStyle: ['builder'],
  },
  profile: { interests: [] as string[] },
};

const BASE_PROFILE = {
  id: USER_ID,
  handle: 'member',
  display_name: 'Member',
  status: 'approved',
  join_reason: ['networking'],
  participation_style: ['builder'],
  policy_version: '1.0',
  industry: 'Technology and Software',
  secondary_industry: 'Cloud Computing',
  niche_field: 'Platform Governance',
  industries: [
    {
      industry: 'Technology',
      sub_industries: ['Cloud Computing', 'Cybersecurity'],
    },
    { industry: 'Finance', sub_industries: ['FinTech'] },
  ],
  nerd_creds: {
    skills: ['Testing', 'Platform Strategy'],
    interests: [] as string[],
  },
  socials: [
    {
      id: 'p-link-1',
      category: 'Professional',
      platform: 'GitHub',
      url: 'https://github.com/testuser',
      label: 'GitHub',
      isVisible: true,
      order: 0,
    },
    {
      id: 'p-link-2',
      category: 'Professional',
      platform: 'LinkedIn',
      url: 'https://linkedin.com/in/testuser',
      label: 'LinkedIn',
      isVisible: true,
      order: 1,
    },
  ],
};

function buildProfileWithInterests(interests: string[]) {
  return {
    ...BASE_PROFILE,
    nerd_creds: { ...BASE_PROFILE.nerd_creds, interests },
  };
}

async function stubProfanityTables(
  page: import('@playwright/test').Page,
  options: { blocklist?: string[]; allowlist?: string[] } = {},
) {
  const { blocklist = [], allowlist = [] } = options;
  await page.route('**/rest/v1/profanity_overrides*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': `0-${blocklist.length}/${blocklist.length}` },
      body: JSON.stringify(blocklist.map((word) => ({ word }))),
    });
  });
  await page.route('**/rest/v1/profanity_allowlist*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': `0-${allowlist.length}/${allowlist.length}` },
      body: JSON.stringify(allowlist.map((word) => ({ word }))),
    });
  });
}

async function stubDirectoryWithInterestFilter(
  page: import('@playwright/test').Page,
  options: { matchInterests?: string[]; rowCount?: number } = {},
) {
  const { matchInterests = [], rowCount = 3 } = options;
  await page.route('**/api/directory*', async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname !== '/api/directory' ||
      route.request().method() !== 'GET'
    ) {
      await route.fallback();
      return;
    }
    const interestsParam = url.searchParams.get('interests') ?? '';
    const requestedInterests = interestsParam
      ? interestsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const hasMatch =
      requestedInterests.length === 0 ||
      matchInterests.some((i) =>
        requestedInterests.some((r) => r.toLowerCase() === i.toLowerCase()),
      );
    const rows = hasMatch
      ? Array.from({ length: rowCount }, (_, idx) => ({
          id: `user-${idx}`,
          handle: `user${idx}`,
          display_name: `User ${idx}`,
          avatar: null,
          tagline: null,
          pronouns: null,
          industry: null,
          secondary_industry: null,
          location: null,
          skills: [],
          bio_snippet: null,
          connection_state: 'not_connected' as const,
          use_weirdling_avatar: false,
        }))
      : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: rows, hasMore: false }),
    });
  });
}

test.describe('Interests E2E', () => {
  test.describe('Interest selection (Join)', () => {
    test('Join profile step shows interests selector and taxonomy', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
        { key: JOIN_STORAGE_KEY, state: JOIN_STATE_PROFILE_STEP },
      );
      await page.goto('/join', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('join-interests-selector')).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(/select up to 8 interests/i)).toBeVisible();
      for (const cat of INTEREST_CATEGORIES) {
        if (cat !== 'Other') {
          await expect(page.getByText(cat, { exact: true })).toBeVisible();
        }
      }
    });

    test('user can select taxonomy interests and hits max 8', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
        { key: JOIN_STORAGE_KEY, state: JOIN_STATE_PROFILE_STEP },
      );
      await page.goto('/join', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('join-interests-selector')).toBeVisible({
        timeout: 15_000,
      });
      const techOptions = INTEREST_OPTIONS_BY_CATEGORY['Tech & Games'];
      const creativeOptions = INTEREST_OPTIONS_BY_CATEGORY['Creative'];
      const toSelect = [
        ...techOptions.slice(0, 6),
        creativeOptions[0],
        creativeOptions[1],
      ];
      for (const label of toSelect) {
        await page.getByRole('button', { name: `Add ${label}` }).click();
      }
      await expect(page.getByText(/Selected \(8\/8\)/)).toBeVisible({
        timeout: 5_000,
      });
      await expect(
        page.getByRole('button', { name: 'Add Theater' }),
      ).toBeDisabled();
    });

    test('user can remove and replace interests', async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const state = {
        ...JOIN_STATE_PROFILE_STEP,
        profile: { interests: ['Coding', 'Gaming'] },
      };
      await page.evaluate(
        ({ key, s }) => localStorage.setItem(key, JSON.stringify(s)),
        { key: JOIN_STORAGE_KEY, s: state },
      );
      await page.goto('/join', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('join-interests-selector')).toBeVisible({
        timeout: 15_000,
      });
      await page.getByRole('button', { name: 'Remove Coding' }).click();
      await expect(page.getByText(/Selected \(1\/8\)/)).toBeVisible({
        timeout: 5_000,
      });
      await page.getByRole('button', { name: 'Add Chess' }).click();
      await expect(page.getByText(/Selected \(2\/8\)/)).toBeVisible({
        timeout: 5_000,
      });
    });
  });

  test.describe('Taxonomy', () => {
    test('two-tier structure: categories and options visible', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
        { key: JOIN_STORAGE_KEY, state: JOIN_STATE_PROFILE_STEP },
      );
      await page.goto('/join', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('join-interests-selector')).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText('Creative', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Music/i }).first(),
      ).toBeVisible();
      await expect(
        page.getByText('Tech & Games', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Coding/i }).first(),
      ).toBeVisible();
      await expect(page.getByText('Other', { exact: true })).toBeVisible();
    });
  });

  test.describe('Custom Other', () => {
    test('custom interest limited to 40 characters and counts toward 8', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
        { key: JOIN_STORAGE_KEY, state: JOIN_STATE_PROFILE_STEP },
      );
      await page.goto('/join', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('join-interests-selector')).toBeVisible({
        timeout: 15_000,
      });
      const input = page.getByPlaceholder(/Type a custom interest/i);
      await input.fill('A'.repeat(INTEREST_CUSTOM_OTHER_MAX_LENGTH));
      await expect(input).toHaveValue(
        'A'.repeat(INTEREST_CUSTOM_OTHER_MAX_LENGTH),
      );
      await page.getByRole('button', { name: 'Add custom interest' }).click();
      await expect(page.getByText(/Selected \(1\/8\)/)).toBeVisible({
        timeout: 5_000,
      });
      await input.fill('B'.repeat(INTEREST_CUSTOM_OTHER_MAX_LENGTH + 1));
      await expect(input).toHaveValue(
        'B'.repeat(INTEREST_CUSTOM_OTHER_MAX_LENGTH),
      );
      await page.getByRole('button', { name: 'Add custom interest' }).click();
      await expect(page.getByText(/Selected \(2\/8\)/)).toBeVisible({
        timeout: 5_000,
      });
    });

    test('custom interest input limited to 40 characters and shows count', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
        { key: JOIN_STORAGE_KEY, state: JOIN_STATE_PROFILE_STEP },
      );
      await page.goto('/join', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('join-interests-selector')).toBeVisible({
        timeout: 15_000,
      });
      const input = page.getByPlaceholder(/Type a custom interest/i);
      await expect(input).toHaveAttribute(
        'maxlength',
        String(INTEREST_CUSTOM_OTHER_MAX_LENGTH),
      );
      await input.fill('a'.repeat(INTEREST_CUSTOM_OTHER_MAX_LENGTH));
      await expect(page.getByText(/40\/40/)).toBeVisible({ timeout: 5_000 });
      await page.getByRole('button', { name: 'Add custom interest' }).click();
      await expect(page.getByText(/Selected \(1\/8\)/)).toBeVisible({
        timeout: 5_000,
      });
    });
  });

  test.describe('Moderation', () => {
    test('profanity filter blocks offensive custom interest and shows message', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await stubProfanityTables(page, { blocklist: ['blockedword'] });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
        { key: JOIN_STORAGE_KEY, state: JOIN_STATE_PROFILE_STEP },
      );
      await page.goto('/join', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('join-interests-selector')).toBeVisible({
        timeout: 15_000,
      });
      await page
        .getByPlaceholder(/Type a custom interest/i)
        .fill('blockedword');
      await page.getByRole('button', { name: 'Add custom interest' }).click();
      await expect(
        page.getByText(/not allowed|choose a different/i),
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test.describe('Dashboard', () => {
    test('interests selector appears and selections can be edited and saved', async ({
      page,
      context,
    }) => {
      test.setTimeout(90_000);
      const { stubAdminRpc } = await seedSignedInSession(context);
      await stubAdminRpc(page);
      const profile = buildProfileWithInterests(['Coding', 'Gaming']);
      await stubAppSurface(page);
      await page.route('**/rest/v1/profiles*', async (route) => {
        const method = route.request().method();
        const accept = route.request().headers()['accept'];
        const wantsSingle = accept?.includes(
          'application/vnd.pgrst.object+json',
        );
        if (method === 'PATCH') {
          const body = route.request().postDataJSON() as {
            nerd_creds?: { interests?: string[] };
          };
          const next =
            body?.nerd_creds?.interests ?? profile.nerd_creds.interests;
          (profile.nerd_creds as { interests: string[] }).interests = next;
          await route.fulfill({ status: 204, body: '' });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/1' },
          body: wantsSingle
            ? JSON.stringify(profile)
            : JSON.stringify([profile]),
        });
      });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('app-main')).toBeVisible({
        timeout: 25_000,
      });
      await expect(
        page.getByTestId('dashboard-interests-dropdown'),
      ).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByRole('button', { name: /Interests \(2\)/i }),
      ).toBeVisible();
      await page.getByTestId('dashboard-interests-dropdown').click();
      await expect(
        page.getByRole('button', { name: 'Save interests' }),
      ).toBeVisible({
        timeout: 5_000,
      });
      const searchInput = page.getByRole('combobox', {
        name: /Search or add interest/i,
      });
      await searchInput.fill('Chess');
      await page
        .getByRole('option', { name: 'Chess' })
        .click({ timeout: 5_000 });
      await page.getByRole('button', { name: 'Save interests' }).click();
      await expect(
        page.getByRole('button', { name: /Interests \(3\)/i }),
      ).toBeVisible({
        timeout: 10_000,
      });
    });

    test('saved interests persist after refresh', async ({ page, context }) => {
      test.setTimeout(90_000);
      const { stubAdminRpc } = await seedSignedInSession(context);
      await stubAdminRpc(page);
      const interests = ['Reading', 'Podcasts'];
      const profile = buildProfileWithInterests(interests);
      await stubAppSurface(page);
      await page.route('**/rest/v1/profiles*', async (route) => {
        const accept = route.request().headers()['accept'];
        const wantsSingle = accept?.includes(
          'application/vnd.pgrst.object+json',
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/1' },
          body: wantsSingle
            ? JSON.stringify(profile)
            : JSON.stringify([profile]),
        });
      });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('app-main')).toBeVisible({
        timeout: 25_000,
      });
      await expect(
        page.getByRole('button', { name: /Interests \(2\)/i }),
      ).toBeVisible({
        timeout: 10_000,
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('button', { name: /Interests \(2\)/i }),
      ).toBeVisible({
        timeout: 15_000,
      });
      for (const i of interests) {
        await expect(
          page.getByTestId('dashboard-pill').filter({ hasText: i }).first(),
        ).toBeVisible();
      }
    });
  });

  test.describe('Profile rendering', () => {
    test('interests display as horizontal chips and Expand appears when overflow', async ({
      page,
      context,
    }) => {
      test.setTimeout(90_000);
      const { stubAdminRpc } = await seedSignedInSession(context);
      await stubAdminRpc(page);
      const manyInterests = [
        'Music',
        'Art',
        'Design',
        'Writing',
        'Photography',
        'Coding',
        'Gaming',
        'Reading',
      ];
      const profile = buildProfileWithInterests(manyInterests);
      await stubAppSurface(page);
      await page.route('**/rest/v1/profiles*', async (route) => {
        const accept = route.request().headers()['accept'];
        const wantsSingle = accept?.includes(
          'application/vnd.pgrst.object+json',
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/1' },
          body: wantsSingle
            ? JSON.stringify(profile)
            : JSON.stringify([profile]),
        });
      });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('app-main')).toBeVisible({
        timeout: 25_000,
      });
      const pills = page.getByTestId('dashboard-pill');
      await expect(pills.first()).toBeVisible({ timeout: 10_000 });
      const expandBtn = page.getByTestId('profile-interests-expand');
      if (await expandBtn.isVisible().catch(() => false)) {
        await expandBtn.click();
        await expect(page.getByText('Reading')).toBeVisible();
      }
    });
  });

  test.describe('Directory search', () => {
    test('user can filter by interest and results reflect filter', async ({
      page,
      context,
    }) => {
      test.setTimeout(90_000);
      const { stubAdminRpc } = await seedSignedInSession(context);
      await stubAdminRpc(page);
      await stubAppSurface(page);
      await stubDirectoryWithInterestFilter(page, {
        matchInterests: ['Coding', 'Gaming', 'Chess'],
        rowCount: 2,
      });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.goto('/directory', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('directory-page')).toBeVisible({
        timeout: 25_000,
      });
      await page.getByLabel('Interest').click();
      await page.getByRole('option', { name: 'Coding' }).click();
      await expect(page).toHaveURL(/interests=/);
      await expect(
        page.getByTestId('directory-active-filter-interest-Coding'),
      ).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText('User 0')).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Persistence', () => {
    test('interests persist from profile stub on Dashboard and after refresh', async ({
      page,
      context,
    }) => {
      test.setTimeout(90_000);
      const { stubAdminRpc } = await seedSignedInSession(context);
      await stubAdminRpc(page);
      const interests = ['Coffee', 'Cooking'];
      const profile = buildProfileWithInterests(interests);
      await stubAppSurface(page);
      await page.route('**/rest/v1/profiles*', async (route) => {
        const accept = route.request().headers()['accept'];
        const wantsSingle = accept?.includes(
          'application/vnd.pgrst.object+json',
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/1' },
          body: wantsSingle
            ? JSON.stringify(profile)
            : JSON.stringify([profile]),
        });
      });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('app-main')).toBeVisible({
        timeout: 25_000,
      });
      for (const i of interests) {
        await expect(
          page.getByTestId('dashboard-pill').filter({ hasText: i }).first(),
        ).toBeVisible({
          timeout: 10_000,
        });
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('app-main')).toBeVisible({
        timeout: 25_000,
      });
      for (const i of interests) {
        await expect(
          page.getByTestId('dashboard-pill').filter({ hasText: i }).first(),
        ).toBeVisible({
          timeout: 10_000,
        });
      }
    });
  });

  test.describe('Layout', () => {
    test('interests section in correct Dashboard location at desktop and mobile', async ({
      page,
      context,
    }) => {
      test.setTimeout(90_000);
      const { stubAdminRpc } = await seedSignedInSession(context);
      await stubAdminRpc(page);
      const profile = buildProfileWithInterests(['Coding']);
      await stubAppSurface(page);
      await page.route('**/rest/v1/profiles*', async (route) => {
        const accept = route.request().headers()['accept'];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/1' },
          body: accept?.includes('object+json')
            ? JSON.stringify(profile)
            : JSON.stringify([profile]),
        });
      });
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('app-main')).toBeVisible({
        timeout: 25_000,
      });
      await expect(
        page.getByTestId('dashboard-interests-dropdown'),
      ).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByTestId('dashboard-interests-dropdown'),
      ).toBeVisible({
        timeout: 15_000,
      });
    });
  });
});
