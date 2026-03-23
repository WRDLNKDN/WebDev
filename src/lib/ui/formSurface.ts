import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export const FORM_ACCENT_GRADIENT =
  'linear-gradient(90deg, #3884D2 0%, #4DD166 50%, #A744C2 100%)';

export const FORM_DIALOG_SX = {
  bgcolor: '#111827',
  backgroundImage: 'linear-gradient(rgba(56,132,210,0.12), rgba(5,7,15,0))',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(156,187,217,0.26)',
  color: '#FFFFFF',
  borderRadius: 1.5,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: FORM_ACCENT_GRADIENT,
    zIndex: 1,
  },
} as const;

export const FORM_SECTION_PANEL_SX = {
  p: { xs: 1.5, md: 1.75 },
  border: '1px solid rgba(156,187,217,0.26)',
  borderRadius: 1.25,
  bgcolor: 'rgba(56,132,210,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(141,188,229,0.12)',
} as const;

export const FORM_SECTION_HEADING_SX = {
  fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
  letterSpacing: 0.25,
  fontSize: '0.78rem',
  color: 'text.secondary',
  textTransform: 'uppercase',
  lineHeight: 1.2,
} as const;

export const FORM_OUTLINED_FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    color: '#FFFFFF',
    bgcolor: 'rgba(56,132,210,0.10)',
    borderRadius: 1.5,
    '& fieldset': { borderColor: 'rgba(156,187,217,0.30)' },
    '&:hover fieldset': { borderColor: 'rgba(141,188,229,0.50)' },
    '&.Mui-focused fieldset': { borderColor: '#3884D2' },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.6)',
    '&.Mui-focused': { color: '#3884D2' },
    '& .MuiFormLabel-asterisk': {
      color: '#f44336',
    },
  },
  '& .MuiFormHelperText-root': {
    color: 'rgba(255,255,255,0.5)',
    ml: 0,
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(141,188,229,0.42)',
    opacity: 1,
  },
} as const;

export const FORM_FILTER_SELECT_SX = {
  borderRadius: 2,
  bgcolor: 'rgba(56,132,210,0.10)',
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 600,
  fontSize: '0.875rem',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(156,187,217,0.30)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(141,188,229,0.50)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#3884D2',
    borderWidth: '1.5px',
  },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.45)' },
} as const;

/** Directory-style sort Select and similar: dark tokens or readable light surfaces. */
export function filterSelectSxFromTheme(theme: Theme): Record<string, unknown> {
  if (theme.palette.mode !== 'light') {
    return { ...FORM_FILTER_SELECT_SX };
  }
  return {
    borderRadius: 2,
    bgcolor: alpha(theme.palette.primary.main, 0.06),
    color: theme.palette.text.primary,
    fontWeight: 600,
    fontSize: '0.875rem',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.divider,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: alpha(theme.palette.primary.main, 0.45),
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.main,
      borderWidth: '1.5px',
    },
    '& .MuiSelect-icon': { color: theme.palette.text.secondary },
  };
}

/** Glass / form dialogs: dark tokens by default; light mode uses paper + readable text. */
export function dialogPaperSxFromTheme(
  theme: Theme,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  if (theme.palette.mode !== 'light') {
    return { ...FORM_DIALOG_SX, ...extra };
  }
  return {
    ...FORM_DIALOG_SX,
    bgcolor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    backgroundImage: `linear-gradient(${alpha(theme.palette.primary.main, 0.08)}, transparent)`,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[16],
    ...extra,
  };
}

export function sectionPanelSxFromTheme(theme: Theme): Record<string, unknown> {
  if (theme.palette.mode !== 'light') {
    return { ...FORM_SECTION_PANEL_SX };
  }
  return {
    ...FORM_SECTION_PANEL_SX,
    bgcolor: alpha(theme.palette.primary.main, 0.05),
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.main, 0.1)}`,
  };
}

/** Menus, Poppers, and autocomplete panels: near-opaque surface for dark; paper + divider in light. */
export function denseMenuPaperSxFromTheme(
  theme: Theme,
): Record<string, unknown> {
  const isLight = theme.palette.mode === 'light';
  return {
    bgcolor: isLight ? theme.palette.background.paper : 'rgba(30,30,30,0.98)',
    border: `1px solid ${isLight ? theme.palette.divider : 'rgba(156,187,217,0.26)'}`,
  };
}

export function outlinedFieldSxFromTheme(
  theme: Theme,
): Record<string, unknown> {
  if (theme.palette.mode !== 'light') {
    return { ...FORM_OUTLINED_FIELD_SX };
  }
  return {
    '& .MuiOutlinedInput-root': {
      color: theme.palette.text.primary,
      bgcolor: alpha(theme.palette.primary.main, 0.04),
      borderRadius: 1.5,
      '& fieldset': { borderColor: theme.palette.divider },
      '&:hover fieldset': {
        borderColor: alpha(theme.palette.primary.main, 0.45),
      },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
    },
    '& .MuiInputLabel-root': {
      color: theme.palette.text.secondary,
      '&.Mui-focused': { color: theme.palette.primary.main },
      '& .MuiFormLabel-asterisk': {
        color: theme.palette.error.main,
      },
    },
    '& .MuiFormHelperText-root': {
      color: theme.palette.text.secondary,
      ml: 0,
    },
    '& .MuiInputBase-input::placeholder': {
      color: alpha(theme.palette.text.secondary, 0.85),
      opacity: 1,
    },
  };
}
