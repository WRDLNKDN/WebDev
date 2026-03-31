/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouterLinkPrefetch } from '../../components/routing/RouterLinkPrefetch';
import * as routePrefetch from '../../lib/routing/routePrefetch';

describe('RouterLinkPrefetch', () => {
  beforeEach(() => {
    vi.spyOn(routePrefetch, 'prefetchChunksForPath').mockImplementation(
      () => {},
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls prefetchChunksForPath on mouse enter', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouterLinkPrefetch to="/feed">Feed</RouterLinkPrefetch>
      </MemoryRouter>,
    );

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Feed' }));

    expect(routePrefetch.prefetchChunksForPath).toHaveBeenCalledWith('/feed');
  });

  it('calls prefetchChunksForPath on focus', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RouterLinkPrefetch to="/directory">Directory</RouterLinkPrefetch>
      </MemoryRouter>,
    );

    fireEvent.focus(screen.getByRole('link', { name: 'Directory' }));

    expect(routePrefetch.prefetchChunksForPath).toHaveBeenCalledWith(
      '/directory',
    );
  });
});
