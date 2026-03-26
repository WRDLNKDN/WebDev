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
      'feed',
      'directory',
      'chat',
      'profile',
      'events',
      'store',
    ]);
  });

  it('declares GlobalNavAuthenticatedPrimary blocks in canonical key order', () => {
    const src = readFileSync(componentPath, 'utf8');
    const feed = src.indexOf('key="global-nav-feed"');
    const directory = src.indexOf('key="global-nav-directory"');
    const chat = src.indexOf('key="global-nav-chat"');
    const profile = src.indexOf('key="global-nav-profile"');
    const events = src.indexOf('key="global-nav-events"');
    const store = src.indexOf('key="global-nav-store"');
    expect(feed).toBeGreaterThan(-1);
    expect(directory).toBeGreaterThan(-1);
    expect(chat).toBeGreaterThan(-1);
    expect(profile).toBeGreaterThan(-1);
    expect(events).toBeGreaterThan(-1);
    expect(feed).toBeLessThan(directory);
    expect(directory).toBeLessThan(chat);
    expect(chat).toBeLessThan(profile);
    expect(profile).toBeLessThan(events);
    expect(events).toBeLessThan(store);
  });
});
