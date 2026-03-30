import type { BrowserContext, Page } from '@playwright/test';
import { seedSignedInSession } from './auth';
import { stubAppSurface } from './stubAppSurface';

/**
 * Signed-in session + baseline REST stubs used by many dashboard E2E specs.
 */
export async function prepareSignedInDashboardSurface(
  page: Page,
  context: BrowserContext,
  options: { handle?: string } = {},
): Promise<void> {
  const { stubAdminRpc } = await seedSignedInSession(context, {
    handle: options.handle ?? 'member',
  });
  await stubAdminRpc(page);
  await stubAppSurface(page);
}
