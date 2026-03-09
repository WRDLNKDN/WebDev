import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures';
import { seedSignedInSession } from '../utils/auth';
import { stubAppSurface } from '../utils/stubAppSurface';

/**
 * Project route sweep accessibility (WCAG 2a/2aa/21aa).
 * Referenced in docs/accessibility/AAA_BACKLOG.md and AGENTIC_PROTOCOL.
 */
/** Routes outside Layout (e.g. /join) use a different main container testid. */
const PUBLIC_MAIN_SELECTOR: Record<string, string> = {
  '/join': 'join-scroll-container',
};
const DEFAULT_MAIN_SELECTOR = 'app-main';

test.describe('Accessibility - route sweep (public)', () => {
  const publicRoutes = [
    { path: '/', name: 'Landing' },
    { path: '/join', name: 'Join' },
    { path: '/about', name: 'About' },
    { path: '/terms', name: 'Terms' },
    { path: '/admin', name: 'Admin gate' },
  ];

  for (const { path, name } of publicRoutes) {
    test(`${name} (${path}) has no WCAG 2a/2aa/21aa violations`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      // Join is lazy-loaded; wait for load so the chunk is fetched before asserting
      const waitUntil = path === '/join' ? 'load' : 'domcontentloaded';
      await page.goto(path, { waitUntil });
      const mainTestId = PUBLIC_MAIN_SELECTOR[path] ?? DEFAULT_MAIN_SELECTOR;
      await expect(page.getByTestId(mainTestId)).toBeVisible({
        timeout: 45_000,
      });

      const results = await new AxeBuilder({ page })
        .include(`[data-testid="${mainTestId}"]`)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('Accessibility - route sweep (authenticated)', () => {
  const authRoutes = [
    { path: '/feed', name: 'Feed' },
    { path: '/directory', name: 'Directory' },
  ];

  for (const { path, name } of authRoutes) {
    test(`${name} (${path}) has no WCAG 2a/2aa/21aa violations`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const { stubAdminRpc } = await seedSignedInSession(page.context());
      await stubAdminRpc(page);
      await stubAppSurface(page);

      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('app-main')).toBeVisible({
        timeout: 45_000,
      });

      const results = await new AxeBuilder({ page })
        .include('[data-testid="app-main"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
