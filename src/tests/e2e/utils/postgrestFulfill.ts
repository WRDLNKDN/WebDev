import type { Route } from '@playwright/test';

const PGRST_OBJECT_JSON = 'application/vnd.pgrst.object+json';

/** Accept header check without a Playwright `Route` (e.g. `stubAppSurface`). */
export function acceptWantsPgrstObjectJson(
  accept: string | undefined,
): boolean {
  return Boolean(accept?.includes(PGRST_OBJECT_JSON));
}

export function wantsPgrstObjectResponse(route: Route): boolean {
  return acceptWantsPgrstObjectJson(route.request().headers()['accept']);
}

export function parseEqParam(url: string, key: string): string | null {
  const raw = new URL(url).searchParams.get(key);
  return raw?.replace(/^eq\./, '') ?? null;
}

export async function fulfillPostgrest(
  route: Route,
  rowOrRows: unknown,
): Promise<void> {
  const isSingle = wantsPgrstObjectResponse(route);
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
