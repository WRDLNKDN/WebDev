/**
 * @vitest-environment jsdom
 */
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../../pages/home/Home';

vi.mock('../../context/FeatureFlagsContext', () => ({
  useMarketingHomeMode: () => true,
  useProductionComingSoonMode: () => true,
}));

vi.mock('../../lib/auth/getSessionWithTimeout', () => ({
  getSessionWithTimeout: vi.fn().mockResolvedValue({
    data: { session: null },
    error: null,
  }),
}));

vi.mock('../../lib/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      setSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

describe('Home (production coming-soon + marketing flags)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        /* Skip hero video in tests (no HTMLMediaElement.play implementation). */
        matches:
          String(query).includes('prefers-reduced-motion') &&
          String(query).includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback) =>
      window.setTimeout(
        () => cb({ didTimeout: false, timeRemaining: () => 5 }),
        0,
      ),
    );
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows COMING SOON hero and still mounts marketing sections', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <Home />
        </MemoryRouter>,
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    expect(
      container.querySelector(
        '[data-testid="production-coming-soon-hero-copy"]',
      ),
    ).toBeTruthy();
    expect(container.textContent).toContain('COMING SOON!!');
    expect(container.textContent).toContain('What Makes This Different');
    expect(container.textContent).toContain('How It Works');
    expect(container.textContent).toContain('Community in Motion');
    expect(container.textContent).not.toContain('Join Us');
  });
});
