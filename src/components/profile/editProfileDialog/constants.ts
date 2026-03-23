import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import {
  FORM_DIALOG_SX,
  FORM_SECTION_PANEL_SX,
  dialogPaperSxFromTheme,
} from '../../../lib/ui/formSurface';

// Brand colors matching the profile editor visual system.
export const GRADIENT_START = '#00C4CC';
export const GRADIENT_END = '#FF22C9';
export const AVATAR_GRADIENT = `linear-gradient(135deg, ${GRADIENT_START} 0%, ${GRADIENT_END} 100%)`;
export const PURPLE_ACCENT = '#B366FF';
export const DARK_BG = '#1a1a1f';
export const INPUT_BG = '#28282d';
export const BORDER_COLOR = 'rgba(156,187,217,0.18)';

export const GLASS_MODAL = {
  ...FORM_DIALOG_SX,
  maxWidth: '540px',
  width: '100%',
};

export function getGlassModalSx(theme: Theme) {
  return dialogPaperSxFromTheme(theme, {
    maxWidth: '540px',
    width: '100%',
  });
}

export const SECTION_PANEL_SX = FORM_SECTION_PANEL_SX;

export const INPUT_HEIGHT = 32;
export const INPUT_PADDING = '4px 12px';

export const HANDLE_CHECK_DEBOUNCE_MS = 400;

export const INPUT_STYLES = {
  '& .MuiFilledInput-root': {
    bgcolor: INPUT_BG,
    borderRadius: '8px',
    border: `1px solid ${BORDER_COLOR}`,
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: INPUT_HEIGHT,
    '&:hover': {
      bgcolor: 'rgba(50, 50, 55, 0.9)',
      borderColor: 'rgba(156,187,217,0.26)',
    },
    '&.Mui-focused': {
      bgcolor: 'rgba(50, 50, 55, 0.95)',
      borderColor: GRADIENT_START,
    },
    '&:before, &:after': { display: 'none' },
  },
  '& .MuiFilledInput-input': { padding: INPUT_PADDING },
  '& .MuiSelect-select': {
    padding: `${INPUT_PADDING} !important`,
    minHeight: 'unset !important',
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1.2,
    boxSizing: 'border-box',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
    '& .MuiFormLabel-asterisk': {
      color: '#f44336',
    },
  },
  '& .MuiInputBase-input': {
    color: 'white',
    fontSize: '0.95rem',
  },
  '& input[aria-hidden="true"]': {
    opacity: 0,
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    margin: 0,
    padding: 0,
    pointerEvents: 'none',
  },
  '& .MuiFormHelperText-root': {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    mt: 0.75,
    ml: 0,
  },
};

/** Theme-aware filled inputs for Edit Profile (light vs dark). */
export function getInputStyles(theme: Theme) {
  if (theme.palette.mode !== 'light') {
    return INPUT_STYLES;
  }
  const border = theme.palette.divider;
  const hoverBg = alpha(theme.palette.common.black, 0.04);
  const focusBg = theme.palette.background.paper;
  return {
    ...INPUT_STYLES,
    '& .MuiFilledInput-root': {
      ...INPUT_STYLES['& .MuiFilledInput-root'],
      bgcolor: hoverBg,
      border: `1px solid ${border}`,
      '&:hover': {
        bgcolor: alpha(theme.palette.common.black, 0.06),
        borderColor: border,
      },
      '&.Mui-focused': {
        bgcolor: focusBg,
        borderColor: theme.palette.primary.main,
      },
    },
    '& .MuiInputLabel-root': {
      ...INPUT_STYLES['& .MuiInputLabel-root'],
      color: theme.palette.text.secondary,
    },
    '& .MuiInputBase-input': {
      ...INPUT_STYLES['& .MuiInputBase-input'],
      color: theme.palette.text.primary,
    },
    '& .MuiFormHelperText-root': {
      ...INPUT_STYLES['& .MuiFormHelperText-root'],
      color: theme.palette.text.secondary,
    },
    '& .MuiAutocomplete-input': {
      color: theme.palette.text.primary,
    },
  };
}

export const getSubIndustryPlaceholder = (
  hasPrimaryIndustry: boolean,
  selectedCount: number,
): string => {
  if (!hasPrimaryIndustry) return 'Select an industry first';
  if (selectedCount > 0) return '';
  return 'Sub-Industry';
};

export const safeStr = (val: unknown, fallback: string = ''): string => {
  if (typeof val === 'string') return val;
  return fallback;
};
