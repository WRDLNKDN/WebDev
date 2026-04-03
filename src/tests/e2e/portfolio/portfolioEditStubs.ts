import type { Page } from '@playwright/test';
import { USER_ID } from '../utils/auth';
import { fulfillPostgrest, parseEqParam } from '../utils/postgrestFulfill';

/** Stable public URL for file-backed portfolio rows in E2E (matches storage bucket layout). */
export const E2E_PROJECT_SOURCE_FILE_PUBLIC_URL =
  'https://example.supabase.co/storage/v1/object/public/project-sources/user-1/project-source-123.pdf';

/** Dashboard member row reused across portfolio edit / accessibility E2E stubs. */
export const PORTFOLIO_E2E_MEMBER_PROFILE: Record<string, unknown> = {
  id: USER_ID,
  handle: 'member',
  display_name: 'Member',
  status: 'approved',
  join_reason: ['networking'],
  participation_style: ['builder'],
  policy_version: '1.0',
  industry: 'Technology and Software',
  secondary_industry: null,
  tagline: 'Builder',
  avatar: null,
  socials: [],
  nerd_creds: { skills: ['Testing'] },
  resume_url: null,
};

export type PortfolioE2eItem = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  image_url: string | null;
  project_url: string;
  tech_stack: string[];
  is_highlighted: boolean;
  created_at: string;
  sort_order: number;
  normalized_url?: string | null;
  embed_url?: string | null;
  resolved_type?: string | null;
  thumbnail_url?: string | null;
  thumbnail_status?: string | null;
};

type BuildPortfolioE2eItemInput = {
  id: string;
  title: string;
  createdAt: string;
  sortOrder: number;
  description?: string;
  imageUrl?: string;
  projectUrl?: string;
  techStack?: string[];
  normalizedUrl?: string | null;
  embedUrl?: string | null;
  resolvedType?: string | null;
  thumbnailUrl?: string | null;
  thumbnailStatus?: string | null;
  isHighlighted?: boolean;
  ownerId?: string;
};

export function buildPortfolioE2eItem(
  input: BuildPortfolioE2eItemInput,
): PortfolioE2eItem {
  const slug = input.id.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return {
    id: input.id,
    owner_id: input.ownerId ?? USER_ID,
    title: input.title,
    description: input.description ?? `${input.title} description`,
    image_url: input.imageUrl ?? `https://example.com/${slug}.png`,
    project_url: input.projectUrl ?? `https://example.com/${slug}.pdf`,
    tech_stack: input.techStack ?? ['Case Study'],
    is_highlighted: input.isHighlighted ?? false,
    created_at: new Date(input.createdAt).toISOString(),
    sort_order: input.sortOrder,
    normalized_url: input.normalizedUrl ?? `https://example.com/${slug}.pdf`,
    embed_url: input.embedUrl ?? null,
    resolved_type: input.resolvedType ?? 'pdf',
    thumbnail_url: input.thumbnailUrl ?? null,
    thumbnail_status: input.thumbnailStatus ?? null,
  };
}

export type PortfolioDashboardPatchMode =
  | { kind: 'merge' }
  | {
      kind: 'mergeAndCapture';
      captured: { current: Record<string, unknown> | null };
    }
  | {
      kind: 'failPatch';
      counter: { n: number };
      shouldFail?: (
        projectId: string | null,
        payload: Record<string, unknown>,
      ) => boolean;
    };

const DEFAULT_PORTFOLIO_PATCH_MODE: PortfolioDashboardPatchMode = {
  kind: 'merge',
};

/**
 * Stubs share token, profile-by-handle, profiles, and portfolio_items routes
 * the way portfolio dashboard edit tests expect.
 */
export async function stubPortfolioProfileRoutes(
  page: Page,
  profile: Record<string, unknown> = PORTFOLIO_E2E_MEMBER_PROFILE,
  profilesMode: 'restful' | 'alwaysPostgrest' = 'restful',
): Promise<void> {
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

  await page.route(
    '**/rest/v1/rpc/get_own_profile_by_handle*',
    async (route) => {
      await fulfillPostgrest(route, [profile]);
    },
  );

  await page.route('**/rest/v1/profiles*', async (route) => {
    if (profilesMode === 'alwaysPostgrest') {
      await fulfillPostgrest(route, [profile]);
      return;
    }
    if (route.request().method() === 'GET') {
      await fulfillPostgrest(route, [profile]);
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

export async function stubPortfolioDashboardRestRoutes(
  page: Page,
  mutableItems: PortfolioE2eItem[],
  patchMode?: PortfolioDashboardPatchMode,
  profile: Record<string, unknown> = PORTFOLIO_E2E_MEMBER_PROFILE,
  profilesMode: 'restful' | 'alwaysPostgrest' = 'restful',
): Promise<void> {
  const resolvedPatchMode = patchMode ?? DEFAULT_PORTFOLIO_PATCH_MODE;
  await stubPortfolioProfileRoutes(page, profile, profilesMode);

  await page.route('**/rest/v1/portfolio_items*', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await fulfillPostgrest(route, [...mutableItems]);
      return;
    }

    if (method === 'PATCH') {
      const projectId = parseEqParam(route.request().url(), 'id');
      const payload = route.request().postDataJSON() as Record<string, unknown>;

      if (resolvedPatchMode.kind === 'failPatch') {
        const shouldFail =
          resolvedPatchMode.shouldFail?.(projectId, payload) ?? true;
        if (!shouldFail) {
          const index = mutableItems.findIndex((item) => item.id === projectId);
          if (index < 0) {
            await route.fulfill({ status: 404, body: '{}' });
            return;
          }
          mutableItems[index] = { ...mutableItems[index], ...payload };
          await fulfillPostgrest(route, mutableItems[index]);
          return;
        }
        resolvedPatchMode.counter.n += 1;
        await route.fulfill({ status: 500, body: '{}' });
        return;
      }

      if (resolvedPatchMode.kind === 'mergeAndCapture') {
        resolvedPatchMode.captured.current = payload;
      }

      const index = mutableItems.findIndex((item) => item['id'] === projectId);
      if (index < 0) {
        await route.fulfill({ status: 404, body: '{}' });
        return;
      }

      mutableItems[index] = { ...mutableItems[index], ...payload };
      await fulfillPostgrest(route, mutableItems[index]);
      return;
    }

    await route.fulfill({ status: 204, body: '' });
  });
}
