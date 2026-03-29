import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLOBAL_NAV_AUTHENTICATED_PRIMARY_ORDER } from '../../lib/navigation/globalNav';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.resolve(
  __dirname,
  '../../components/layout/navbar/GlobalNavAuthenticatedPrimary.tsx',
);

describe('global navigation governance (IA)', () => {
  it('exports canonical authenticated primary order', () => {
    expect([...GLOBAL_NAV_AUTHENTICATED_PRIMARY_ORDER]).toEqual([
      'chat',
      'directory',
      'events',
      'feed',
      'profile',
      'store',
    ]);
  });

  it('declares GlobalNavAuthenticatedPrimary blocks in canonical key order', () => {
    const src = readFileSync(componentPath, 'utf8');
    const chat = src.indexOf('key="global-nav-chat"');
    const directory = src.indexOf('key="global-nav-directory"');
    const events = src.indexOf('key="global-nav-events"');
    const feed = src.indexOf('key="global-nav-feed"');
    const profile = src.indexOf('key="global-nav-profile"');
    const store = src.indexOf('key="global-nav-store"');
    expect(chat).toBeGreaterThan(-1);
    expect(directory).toBeGreaterThan(-1);
    expect(events).toBeGreaterThan(-1);
    expect(feed).toBeGreaterThan(-1);
    expect(profile).toBeGreaterThan(-1);
    expect(chat).toBeLessThan(directory);
    expect(directory).toBeLessThan(events);
    expect(events).toBeLessThan(feed);
    expect(feed).toBeLessThan(profile);
    expect(profile).toBeLessThan(store);
  });
});
