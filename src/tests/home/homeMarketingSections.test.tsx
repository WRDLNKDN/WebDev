import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StaticRouter } from 'react-router-dom';
import { HowItWorks } from '../../components/home/HowItWorks';
import { WhatMakesDifferent } from '../../components/home/WhatMakesDifferent';

void React;

describe('Home marketing sections (static copy)', () => {
  it('WhatMakesDifferent renders expected headings and values copy', () => {
    const markup = renderToStaticMarkup(<WhatMakesDifferent />);
    expect(markup).toContain('What Makes This Different');
    expect(markup).toContain('Values and intent');
    expect(markup).toContain('How participation works');
    expect(markup).toContain(
      'WRDLNKDN is built around shared values and clear intent',
    );
  });

  it('HowItWorks renders steps with join/directory/feed links', () => {
    const markup = renderToStaticMarkup(
      <StaticRouter location="/">
        <HowItWorks />
      </StaticRouter>,
    );
    expect(markup).toContain('How It Works');
    expect(markup).toContain('Join with Google or Microsoft');
    expect(markup).toContain('Create your Showcase');
    expect(markup).toContain('Discover and Connect');
    expect(markup).toContain('href="/join"');
    expect(markup).toContain('href="/directory"');
    expect(markup).toContain('href="/feed"');
  });
});
