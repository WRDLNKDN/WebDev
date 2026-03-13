import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DirectoryEmptyState } from '../../components/directory/DirectoryEmptyState';

void React;

describe('DirectoryEmptyState', () => {
  it('renders signed-in search recovery copy and clear-filters action', () => {
    const markup = renderToStaticMarkup(
      <DirectoryEmptyState
        hasActiveFilters
        isSearchActive
        onClearFilters={vi.fn()}
      />,
    );

    expect(markup).toContain('No members found');
    expect(markup).toContain(
      'No members match your search or filters. Try adjusting your search terms or clear one or more filters.',
    );
    expect(markup).toContain('Clear filters');
    expect(markup).not.toContain('Join the Community');
    expect(markup).not.toContain('/join');
  });

  it('renders filter-only recovery copy without join call-to-action', () => {
    const markup = renderToStaticMarkup(
      <DirectoryEmptyState hasActiveFilters onClearFilters={vi.fn()} />,
    );

    expect(markup).toContain('No members found');
    expect(markup).toContain(
      'No members match your filters. Try adjusting or clearing a filter.',
    );
    expect(markup).toContain('Clear filters');
    expect(markup).not.toContain('Join the Community');
  });

  it('hides the clear-filters action when there are no active filters', () => {
    const markup = renderToStaticMarkup(
      <DirectoryEmptyState hasActiveFilters={false} />,
    );

    expect(markup).toContain('No results');
    expect(markup).toContain('The directory is empty.');
    expect(markup).not.toContain('Clear filters');
    expect(markup).not.toContain('Join the Community');
  });
});
