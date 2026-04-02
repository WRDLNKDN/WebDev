import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { readDashboardOrder } from '../utils/portfolioPlaywrightHelpers';
import { stubAppSurface } from '../utils/stubAppSurface';
import {
  E2E_PROJECT_SOURCE_FILE_PUBLIC_URL,
  buildPortfolioE2eItem,
  type PortfolioE2eItem,
} from './portfolioEditStubs';

const DEFAULT_CREATED = new Date('2026-01-02T00:00:00.000Z').toISOString();

const E2E_ITEM_BASE: Omit<
  PortfolioE2eItem,
  'title' | 'description' | 'project_url'
> = {
  id: 'project-1',
  owner_id: USER_ID,
  image_url: null,
  tech_stack: ['Case Study'],
  is_highlighted: false,
  created_at: DEFAULT_CREATED,
  sort_order: 0,
  embed_url: null,
  thumbnail_url: null,
};

/** Dashboard portfolio edit tests: signed-in member + stubs. */
export async function seedPortfolioEditMemberSession(
  page: Page,
  context: BrowserContext,
) {
  const { stubAdminRpc } = await seedSignedInSession(context, {
    handle: 'member',
  });
  await stubAdminRpc(page);
  await stubAppSurface(page);
}

/** Merge overrides onto the standard single-project row shape. */
export function e2ePortfolioDashboardItem(
  overrides: Partial<PortfolioE2eItem> &
    Pick<PortfolioE2eItem, 'title' | 'description' | 'project_url'>,
): PortfolioE2eItem {
  return { ...E2E_ITEM_BASE, ...overrides };
}

export async function gotoDashboardExpectAppMain(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('app-main')).toBeVisible({
    timeout: 25_000,
  });
}

export const E2E_PORTFOLIO_REORDER_INITIAL_ORDER = [
  'Alpha Artifact',
  'Beta Artifact',
  'Gamma Artifact',
] as const;

export const E2E_PORTFOLIO_REORDER_REORDERED_ORDER = [
  'Gamma Artifact',
  'Alpha Artifact',
  'Beta Artifact',
] as const;

export function e2ePortfolioReorderItems(): PortfolioE2eItem[] {
  return [
    buildPortfolioE2eItem({
      id: 'project-1',
      title: 'Alpha Artifact',
      createdAt: '2026-01-02T00:00:00.000Z',
      sortOrder: 0,
      ownerId: USER_ID,
    }),
    buildPortfolioE2eItem({
      id: 'project-2',
      title: 'Beta Artifact',
      createdAt: '2026-01-03T00:00:00.000Z',
      sortOrder: 1,
      ownerId: USER_ID,
    }),
    buildPortfolioE2eItem({
      id: 'project-3',
      title: 'Gamma Artifact',
      createdAt: '2026-01-04T00:00:00.000Z',
      sortOrder: 2,
      ownerId: USER_ID,
    }),
  ];
}

export async function expectDashboardPortfolioOrder(
  page: Page,
  expectedTitles: readonly string[],
  timeout = 30_000,
): Promise<void> {
  await expect
    .poll(() => readDashboardOrder(page), { timeout })
    .toEqual([...expectedTitles]);
}

export async function gotoDashboardAndExpectPortfolioOrder(
  page: Page,
  expectedTitles: readonly string[],
  timeout = 30_000,
): Promise<void> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('app-main')).toBeVisible({
    timeout: 40_000,
  });
  await expectDashboardPortfolioOrder(page, expectedTitles, timeout);
}

export async function moveProjectUp(
  page: Page,
  projectTitle: string,
  times = 1,
): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await page.getByLabel(`Move project ${projectTitle} up`).click();
  }
}

export const E2E_LEGACY_ARTIFACT_FIELDS = {
  title: 'Legacy Artifact',
  description: 'Old dashboard description.',
  project_url: 'https://example.com/legacy-artifact.pdf',
  normalized_url: 'https://example.com/legacy-artifact.pdf',
  resolved_type: 'pdf',
  thumbnail_status: 'failed',
} as const;

export const E2E_STORED_FILE_ARTIFACT_FIELDS = {
  title: 'Stored Artifact',
  description: 'Uploaded file backed project.',
} as const;

export function e2eLegacyPdfPortfolioItem(): PortfolioE2eItem {
  return e2ePortfolioDashboardItem({ ...E2E_LEGACY_ARTIFACT_FIELDS });
}

export function e2eStoredFilePortfolioItem(): PortfolioE2eItem {
  return e2ePortfolioDashboardItem({
    ...E2E_STORED_FILE_ARTIFACT_FIELDS,
    project_url: E2E_PROJECT_SOURCE_FILE_PUBLIC_URL,
    normalized_url: E2E_PROJECT_SOURCE_FILE_PUBLIC_URL,
    resolved_type: 'pdf',
    thumbnail_status: 'generated',
  });
}
