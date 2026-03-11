import { FONT_FAMILY, FOCUS_RING, PALETTE } from './themeConstants';
import { THEME_STEPPER_COMPONENTS } from './themeStepperComponents';

export const THEME_COMPONENTS = {
  MuiCssBaseline: {
    styleOverrides: {
      '@global': {
        html: {
          overflow: 'hidden',
          height: '100%',
          fontFamily: FONT_FAMILY,
        },
        body: {
          overflowX: 'hidden',
          overflowY: 'hidden',
          height: '100%',
          fontFamily: FONT_FAMILY,
        },
        '#root': {
          height: '100%',
          overflow: 'hidden',
        },
        '.app-scroll-container': {
          scrollbarColor: '#6b6b6b #2b2b2b',
          '&::-webkit-scrollbar': {
            backgroundColor: '#2b2b2b',
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#6b6b6b',
            minHeight: 24,
            border: '3px solid #2b2b2b',
          },
          '&::-webkit-scrollbar-thumb:focus': {
            backgroundColor: '#959595',
          },
        },
        'input, textarea, button, select, option, optgroup': {
          fontFamily: FONT_FAMILY,
        },
        'a[href]': {
          transition:
            'color 120ms ease, text-decoration-color 120ms ease, opacity 120ms ease',
        },
        'a[href]:hover': {
          textDecoration: 'underline !important',
          textUnderlineOffset: '3px',
          textDecorationThickness: '2px',
          cursor: 'pointer',
        },
        'a[href]:focus-visible': {
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        },
      },
    },
  },
  MuiButtonBase: {
    defaultProps: {
      disableRipple: false,
    },
    styleOverrides: {
      root: {
        '&:focus-visible': FOCUS_RING,
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        minHeight: 44,
        padding: '8px 24px',
        fontWeight: 700,
        '&:focus-visible': FOCUS_RING,
      },
      containedPrimary: {
        '&:hover': { backgroundColor: '#1565c0' },
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        '&:focus-visible': FOCUS_RING,
        padding: 12,
      },
    },
  },
  MuiLink: {
    styleOverrides: {
      root: {
        color: '#90caf9',
        textDecoration: 'underline',
        textUnderlineOffset: '4px',
        '&:hover': { color: '#42a5f5' },
        '&:focus-visible': {
          ...FOCUS_RING,
          borderRadius: '2px',
        },
      },
    },
  },
  MuiInputBase: {
    styleOverrides: {
      input: {
        minHeight: 44,
        '&::placeholder': {
          opacity: 1,
          color: '#bdbdbd',
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: '#90caf9',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#42a5f5',
          borderWidth: 2,
        },
      },
      notchedOutline: {
        borderColor: 'rgba(255, 255, 255, 0.23)',
      },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        color: '#e8e8e8',
        '&.Mui-focused': { color: '#42a5f5' },
      },
      asterisk: {
        color: PALETTE.error.main,
      },
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      asterisk: {
        color: PALETTE.error.main,
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
        color: '#e8e8e8',
      },
    },
  },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        padding: 10,
        '&:focus-visible': FOCUS_RING,
      },
    },
  },
  MuiRadio: {
    styleOverrides: {
      root: {
        padding: 10,
        '&:focus-visible': FOCUS_RING,
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      switchBase: {
        '&:focus-visible': FOCUS_RING,
      },
      track: {
        opacity: 0.5,
        backgroundColor: '#9e9e9e',
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      icon: { color: '#e8e8e8' },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.12)',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        minHeight: 48,
        '&:focus-visible': { backgroundColor: 'rgba(66, 165, 245, 0.12)' },
        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
        height: 32,
        borderWidth: 2,
        '&:focus-visible': FOCUS_RING,
      },
      label: { fontWeight: 500 },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontSize: '0.95rem',
        alignItems: 'center',
      },
      standardError: {
        backgroundColor: 'rgba(239, 83, 80, 0.1)',
        color: '#ffcdd2',
        border: '1px solid #ef5350',
      },
      standardInfo: {
        backgroundColor: 'rgba(41, 182, 246, 0.1)',
        color: '#b3e5fc',
        border: '1px solid #29b6f6',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        minHeight: 48,
        fontSize: '1rem',
        borderBottom: '3px solid transparent',
        '&:focus-visible': FOCUS_RING,
        '&.Mui-selected': {
          fontWeight: 800,
          textDecoration: 'underline',
          textUnderlineOffset: '5px',
          borderBottomColor: PALETTE.primary.main,
        },
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: {
        height: 4,
        borderRadius: 999,
        backgroundColor: PALETTE.primary.light,
      },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        '&.Mui-selected': {
          fontWeight: 800,
          textDecoration: 'underline',
          textUnderlineOffset: '4px',
          borderWidth: 2,
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        fontFamily: FONT_FAMILY,
        backgroundColor: '#424242',
        color: '#ffffff',
        fontSize: '0.875rem',
        border: '1px solid rgba(255,255,255,0.1)',
      },
    },
  },
  ...THEME_STEPPER_COMPONENTS,
};
