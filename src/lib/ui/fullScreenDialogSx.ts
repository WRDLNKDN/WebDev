import type { SxProps, Theme } from '@mui/material/styles';

/** Bottom-sheet style when `Dialog` uses `fullScreen` on narrow viewports. */
export const fullScreenSheetPaperSx: SxProps<Theme> = {
  m: 0,
  borderRadius: '16px 16px 0 0',
  maxHeight: 'min(90dvh, 100%)',
};

export function mergeFullScreenDialogPaperSx(
  fullScreen: boolean,
  base: SxProps<Theme>,
): SxProps<Theme> {
  if (!fullScreen) return base;
  return (
    Array.isArray(base)
      ? [...base, fullScreenSheetPaperSx]
      : [base, fullScreenSheetPaperSx]
  ) as SxProps<Theme>;
}

/** Extra bottom padding above the home indicator on notched phones. */
export function dialogActionsSafeAreaSx(
  fullScreen: boolean,
  base: SxProps<Theme> = {},
): SxProps<Theme> {
  if (!fullScreen) return base;
  const flat =
    base && typeof base === 'object' && !Array.isArray(base) && base !== null
      ? (base as Record<string, unknown>)
      : {};
  return {
    ...flat,
    pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    flexWrap: 'wrap',
    gap: 1,
  };
}
