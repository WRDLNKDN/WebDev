/**
 * Unit tests for profile links and Add Links modal fixes.
 * - Links render in Identity (collapsible); regression: LINKS header constant and visible-socials logic.
 * - Add Links modal: single "+ Add to List" label (no duplicate plus icon/text).
 */

import { describe, expect, it } from 'vitest';
import { ADD_TO_LIST_BUTTON_LABEL } from '../../components/profile/EditLinksDialog';
import { LINKS_COLLAPSIBLE_HEADER } from '../../components/profile/ProfileLinksWidget';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';

describe('EditLinksDialog Add to List button', () => {
  it('displays a single leading plus in the label', () => {
    expect(ADD_TO_LIST_BUTTON_LABEL).toBe('+ Add to List');
    expect(ADD_TO_LIST_BUTTON_LABEL.match(/\+/g)).toHaveLength(1);
  });
});

describe('ProfileLinksWidget collapsible header', () => {
  it('uses LINKS as the collapsible section header in Identity', () => {
    expect(LINKS_COLLAPSIBLE_HEADER).toBe('LINKS');
  });
});

describe('Links in Identity: hasVisibleSocialLinks', () => {
  it('returns true when at least one link has isVisible', () => {
    expect(hasVisibleSocialLinks([{ isVisible: true }])).toBe(true);
    expect(
      hasVisibleSocialLinks([{ isVisible: false }, { isVisible: true }]),
    ).toBe(true);
  });

  it('returns false when no links or none visible', () => {
    expect(hasVisibleSocialLinks([])).toBe(false);
    expect(hasVisibleSocialLinks([{ isVisible: false }])).toBe(false);
    expect(hasVisibleSocialLinks(null)).toBe(false);
    expect(hasVisibleSocialLinks(undefined)).toBe(false);
  });
});
