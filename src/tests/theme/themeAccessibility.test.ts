import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { createAppTheme } from '../../theme/theme';
import { THEME_PRESETS, type AppThemeId } from '../../theme/themeConstants';

const THEME_IDS = Object.keys(THEME_PRESETS) as AppThemeId[];

function expectContrastAtLeast(
  foreground: string,
  background: string,
  minimum: number,
  context: string,
) {
  const contrast = getContrastRatio(foreground, background);
  expect(
    contrast,
    `${context} contrast ${contrast.toFixed(2)} should be >= ${minimum}`,
  ).toBeGreaterThanOrEqual(minimum);
}

describe('theme accessibility guardrails', () => {
  it.each(THEME_IDS)(
    '%s provides readable text and intent colors',
    (themeId) => {
      const theme = createAppTheme(themeId);
      const { palette } = theme;

      expectContrastAtLeast(
        palette.text.primary,
        palette.background.default,
        7,
        `${themeId} primary text on default background`,
      );
      expectContrastAtLeast(
        palette.text.secondary,
        palette.background.default,
        4.5,
        `${themeId} secondary text on default background`,
      );
      expectContrastAtLeast(
        palette.primary.contrastText,
        palette.primary.main,
        4.5,
        `${themeId} primary action`,
      );
      expectContrastAtLeast(
        palette.secondary.contrastText,
        palette.secondary.main,
        4.5,
        `${themeId} secondary action`,
      );
      expectContrastAtLeast(
        palette.error.contrastText,
        palette.error.main,
        4.5,
        `${themeId} error action`,
      );
      expectContrastAtLeast(
        palette.warning.contrastText,
        palette.warning.main,
        4.5,
        `${themeId} warning action`,
      );
      expectContrastAtLeast(
        palette.success.contrastText,
        palette.success.main,
        4.5,
        `${themeId} success action`,
      );
      expectContrastAtLeast(
        palette.info.contrastText,
        palette.info.main,
        4.5,
        `${themeId} info action`,
      );
    },
  );
});
