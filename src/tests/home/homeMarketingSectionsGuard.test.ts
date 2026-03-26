import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const homeSourcePath = path.resolve(__dirname, '../../pages/home/Home.tsx');
const cssPath = path.resolve(
  __dirname,
  '../../components/home/homeLanding.css',
);

describe('Home marketing sections (source contract)', () => {
  it('renders WhatMakesDifferent / HowItWorks outside productionComingSoon gate', () => {
    const src = readFileSync(homeSourcePath, 'utf8');
    expect(src).toContain('<WhatMakesDifferent />');
    expect(src).toContain('<HowItWorks />');
    /* Sections must not be wrapped in productionComingSoon ? null — only hero Join vs COMING SOON is gated. */
    expect(src).not.toContain(`productionComingSoon ? null : (
        <>
          <WhatMakesDifferent`);
    expect(src).toMatch(
      /Marketing sections:[\s\S]*<WhatMakesDifferent \/>[\s\S]*<HowItWorks \/>/,
    );
  });
});

describe('Home hero CSS (mobile + centering contract)', () => {
  it('keeps intro hero safe-area padding and mobile type scale', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toContain(
      '.home-landing__hero:not(.home-landing__hero--compact)',
    );
    expect(css).toContain('safe-area-inset-left');
    expect(css).toContain('@media (max-width: 767.98px)');
    expect(css).toMatch(/\.home-landing__title[\s\S]*clamp\(2rem/);
  });
});
