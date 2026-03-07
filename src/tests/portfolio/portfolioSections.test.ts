import { describe, expect, it } from 'vitest';
import {
  UNCATEGORIZED_PORTFOLIO_SECTION,
  buildPortfolioCategorySections,
  portfolioCategoryToSectionTestId,
} from '../../lib/portfolio/portfolioSections';
import type { PortfolioItem } from '../../types/portfolio';

const makeProject = (
  id: string,
  categories: string[],
  title: string = `Project ${id}`,
): PortfolioItem => ({
  id,
  owner_id: 'owner-1',
  title,
  description: null,
  image_url: null,
  project_url: 'https://example.com',
  tech_stack: categories,
  created_at: '2026-01-01T00:00:00.000Z',
});

describe('buildPortfolioCategorySections', () => {
  it('groups projects into category sections and keeps project order', () => {
    const projects = [
      makeProject('p1', ['Case Study', 'DevOps']),
      makeProject('p2', ['DevOps']),
      makeProject('p3', ['UI/UX']),
    ];

    const sections = buildPortfolioCategorySections(projects);

    expect(sections.map((s) => s.category)).toEqual([
      'Case Study',
      'DevOps',
      'UI/UX',
    ]);
    expect(sections[1]?.projects.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('orders sections by first artifact appearance', () => {
    const sections = buildPortfolioCategorySections([
      makeProject('p1', ['Data']),
      makeProject('p2', ['Case Study', 'DevOps']),
      makeProject('p3', ['Case Study']),
    ]);

    expect(sections.map((s) => s.category)).toEqual([
      'Data',
      'Case Study',
      'DevOps',
    ]);
    expect(sections[1]?.projects.map((p) => p.id)).toEqual(['p2', 'p3']);
  });

  it('creates an Uncategorized section for projects without categories', () => {
    const sections = buildPortfolioCategorySections([
      makeProject('p1', []),
      makeProject('p2', ['Data']),
    ]);

    expect(sections.map((s) => s.category)).toEqual([
      UNCATEGORIZED_PORTFOLIO_SECTION,
      'Data',
    ]);
    expect(sections[0]?.projects.map((p) => p.id)).toEqual(['p1']);
  });

  it('builds stable section test ids', () => {
    expect(portfolioCategoryToSectionTestId('Case Study')).toBe(
      'portfolio-section-case-study',
    );
    expect(portfolioCategoryToSectionTestId('AI/ML')).toBe(
      'portfolio-section-ai-ml',
    );
  });
});
