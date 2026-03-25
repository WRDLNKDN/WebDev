import type { Page } from '@playwright/test';

export { fulfillPostgrest, parseEqParam } from './postgrestFulfill';

export async function readDashboardOrder(page: Page): Promise<string[]> {
  return page
    .locator('main button[aria-label^="Edit project "]')
    .evaluateAll((els) =>
      els.map((el) =>
        (el.getAttribute('aria-label') || '').replace(/^Edit project\s+/, ''),
      ),
    );
}

export async function readProfileOrder(page: Page): Promise<string[]> {
  return page.locator('main img[alt$="Artifact"]').evaluateAll((els) =>
    els
      .map((el) => (el as HTMLImageElement).alt.trim())
      .filter(Boolean)
      .slice(0, 10),
  );
}
