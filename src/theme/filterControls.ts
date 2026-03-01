/**
 * Shared filter bar styling: consistent dropdown/input/button sizes and
 * Select text overflow so labels don't overlap the dropdown arrow.
 * Use in Directory, Admin moderation pages, and other filter UIs.
 */

import type { SelectProps } from '@mui/material/Select';

export const FILTER_CONTROL_WIDTH = 200;
export const FILTER_CONTROL_MIN_HEIGHT = 40;

const selectInputInnerSx = {
  minHeight: FILTER_CONTROL_MIN_HEIGHT,
  paddingLeft: 14,
  paddingRight: '36px !important' as const,
  textOverflow: 'ellipsis' as const,
  overflow: 'hidden' as const,
  whiteSpace: 'nowrap' as const,
  maxWidth: '100%',
  boxSizing: 'border-box' as const,
};

/** FormControl sx for Select: same width as filter buttons, min height 40, text truncates with ellipsis. */
export const filterSelectSx = {
  width: { xs: '100%', md: FILTER_CONTROL_WIDTH },
  minWidth: { xs: 0, md: FILTER_CONTROL_WIDTH },
  flexShrink: 0,
  '& .MuiSelect-select': selectInputInnerSx,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.23)',
  },
};

/** Menu props for directory/filter Selects: menu width and option text truncation. */
export const filterSelectMenuProps: SelectProps['MenuProps'] = {
  PaperProps: {
    sx: {
      minWidth: FILTER_CONTROL_WIDTH,
      maxWidth: 360,
      borderRadius: 2,
      mt: 1,
      '& .MuiMenuItem-root': {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        py: 1,
        px: 2,
      },
    },
  },
  MenuListProps: {
    sx: { py: 0 },
  },
};

/** Spread this into FormControl sx to fix Select text overlap/ellipsis at any width. */
export const filterSelectInputSx = {
  '& .MuiSelect-select': selectInputInnerSx,
};

/** FormControl sx for filter Selects with fixed width (e.g. admin 180px). */
export function filterSelectSxCustomWidth(
  width: number | { xs?: string; sm?: number; md?: number },
): Record<string, unknown> {
  const w =
    typeof width === 'number'
      ? { xs: '100%' as const, md: width }
      : { xs: width.xs ?? '100%', md: width.md ?? width.sm };
  return {
    minWidth: w,
    width: w,
    '& .MuiSelect-select': selectInputInnerSx,
  };
}
