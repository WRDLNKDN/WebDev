import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { seedSignedInSession, USER_ID } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';
import {
  E2E_PROJECT_SOURCE_FILE_PUBLIC_URL,
  type PortfolioE2eItem,
} from './portfolioEditStubs';

const DEFAULT_CREATED = new Date('2026-01-02T00:00:00.000Z').toISOString();

const E2E_ITEM_BASE: PortfolioE2eItem = {
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
  overrides: Record<string, unknown>,
): PortfolioE2eItem {
  return { ...E2E_ITEM_BASE, ...overrides } as PortfolioE2eItem;
}

export async function gotoDashboardExpectAppMain(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('app-main')).toBeVisible({
    timeout: 25_000,
  });
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
