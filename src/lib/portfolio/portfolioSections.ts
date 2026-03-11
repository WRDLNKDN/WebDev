import type { PortfolioItem } from '../../types/portfolio';
import { getPrimaryProjectCategory } from './categoryUtils';

export const UNCATEGORIZED_PORTFOLIO_SECTION = 'Uncategorized';

export type PortfolioCategorySection = {
  category: string;
  projects: PortfolioItem[];
};

/**
 * Group projects by category so Portfolio Showcase can render category sections.
 * Fallback for legacy rows: if tech_stack still contains multiple values, only
 * the first normalized category is used until the row is migrated or resaved.
 * Section order follows the first artifact appearance so saved artifact order
 * controls render priority on profile pages.
 */
export const buildPortfolioCategorySections = (
  projects: PortfolioItem[],
): PortfolioCategorySection[] => {
  const sectionsByKey = new Map<string, PortfolioCategorySection>();

  for (const project of projects) {
    const primaryCategory = getPrimaryProjectCategory(project.tech_stack);
    const sectionNames = primaryCategory
      ? [primaryCategory]
      : [UNCATEGORIZED_PORTFOLIO_SECTION];

    for (const category of sectionNames) {
      const key = category.toLowerCase();
      const existing = sectionsByKey.get(key);
      if (existing) {
        existing.projects.push(project);
        continue;
      }
      sectionsByKey.set(key, { category, projects: [project] });
    }
  }

  return Array.from(sectionsByKey.values());
};

export const portfolioCategoryToSectionTestId = (category: string): string =>
  `portfolio-section-${category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
