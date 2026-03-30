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

const mocks = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  profile: null as null | {
    display_name?: string;
    join_reason?: string;
    participation_style?: string;
  },
}));

vi.mock('../../context/FeatureFlagsContext', () => ({
  useMarketingHomeMode: () => true,
  useProductionComingSoonMode: () => false,
}));

vi.mock('../../lib/auth/getSessionWithTimeout', () => ({
  getSessionWithTimeout: vi.fn(async () => ({
    data: { session: mocks.session },
    error: null,
  })),
}));

vi.mock('../../lib/auth/supabaseClient', () => ({
  AUTH_STORAGE_KEY: 'sb-test-auth-token',
  supabase: {
    auth: {
      refreshSession: vi.fn(async () => ({ data: { session: mocks.session } })),
      setSession: vi.fn(async () => ({ data: { session: mocks.session } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: mocks.profile })),
    })),
  },
}));

import { Home } from '../../pages/home/Home';

async function mountHomeAtRoot(root: Root) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/']}>
        <Home />
      </MemoryRouter>,
    );
  });

  await act(async () => {
    await new Promise((r) => setTimeout(r, 120));
  });
}

describe('Home guest marketing video', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.session = null;
    mocks.profile = null;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
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

    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn();
      root = null;
      rootMargin = '0px';
      thresholds = [0.6];
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

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

  it('renders the video section between the two marketing sections for signed-out guests', async () => {
    await mountHomeAtRoot(root);

    const html = container.innerHTML;
    expect(html.indexOf('What Makes This Different')).toBeGreaterThan(-1);
    expect(html).toContain('See the idea in motion');
    expect(html).toContain('Play Why WRDLNKDN video');
    expect(html.indexOf('Why WRDLNKDN video')).toBeGreaterThan(
      html.indexOf('What Makes This Different'),
    );
    expect(html.indexOf('How It Works')).toBeGreaterThan(
      html.indexOf('Why WRDLNKDN video'),
    );
  });

  it('does not render the guest video for signed-in members', async () => {
    mocks.session = { user: { id: 'member-1' } };
    mocks.profile = {
      display_name: 'April',
      join_reason: 'community',
      participation_style: 'builder',
    };

    await mountHomeAtRoot(root);

    expect(container.innerHTML).not.toContain('Why WRDLNKDN video');
  });
});
