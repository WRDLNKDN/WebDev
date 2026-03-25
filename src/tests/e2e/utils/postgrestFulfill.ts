import type { Route } from '@playwright/test';

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
