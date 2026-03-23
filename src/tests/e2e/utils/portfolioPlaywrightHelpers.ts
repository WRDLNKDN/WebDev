import type { Page, Route } from '@playwright/test';

export function parseEqParam(url: string, key: string): string | null {
  const raw = new URL(url).searchParams.get(key);
  return raw?.replace(/^eq\./, '') ?? null;
}

export async function fulfillPostgrest(
  route: Route,
  rowOrRows: unknown,
): Promise<void> {
  const accept = route.request().headers()['accept'] || '';
  const isSingle = accept.includes('application/vnd.pgrst.object+json');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: Array.isArray(rowOrRows)
      ? {
          'content-range': `0-${Math.max(rowOrRows.length - 1, 0)}/${rowOrRows.length}`,
        }
      : undefined,
    body: JSON.stringify(
      isSingle && Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows,
    ),
  });
}

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
