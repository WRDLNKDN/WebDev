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
      // Close / dismiss (and legacy delete/remove/trash) chrome: see createAppTheme → dismissIconButtonChrome in theme.ts.
      root: {
        '&:focus-visible': FOCUS_RING,
        overflow: 'visible',
        padding: 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        '& .MuiSvgIcon-root': {
          flexShrink: 0,
          display: 'block',
        },
      },
      sizeSmall: {
        padding: 8,
        '& .MuiSvgIcon-root': {
          fontSize: '1.25rem',
        },
      },
    },
  },
  MuiLink: {
    styleOverrides: {
      root: {
        color: '#8DBCE5',
        textDecoration: 'none',
        '&:hover': { color: '#3884D2' },
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
          borderColor: '#8DBCE5',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#3884D2',
          borderWidth: 2,
        },
      },
      notchedOutline: {
        borderColor: 'rgba(156,187,217,0.34)',
      },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        color: '#e8e8e8',
        '&.Mui-focused': { color: '#3884D2' },
        '& .MuiFormLabel-asterisk': { color: PALETTE.error.main },
        '&.Mui-focused .MuiFormLabel-asterisk': { color: PALETTE.error.main },
        '&.Mui-error .MuiFormLabel-asterisk': { color: PALETTE.error.main },
      },
      asterisk: {
        color: PALETTE.error.main,
      },
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      root: {
        '&.Mui-focused .MuiFormLabel-asterisk': {
          color: PALETTE.error.main,
        },
      },
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
    defaultProps: {
      scroll: 'paper',
      fullWidth: true,
    },
    styleOverrides: {
      root: {
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(4,10,25,0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        },
      },
      paper: {
        borderRadius: 16,
        border: '1px solid rgba(156,187,217,0.22)',
        backgroundImage:
          'linear-gradient(180deg, rgba(10,18,32,0.98), rgba(7,15,28,0.98))',
        boxShadow:
          '0 28px 64px rgba(1, 6, 18, 0.48), inset 0 1px 0 rgba(255,255,255,0.05)',
        maxHeight: 'min(880px, calc(100dvh - 32px))',
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(141,188,229,0.14)',
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '24px',
        '&.MuiDialogContent-dividers': {
          borderTop: '1px solid rgba(141,188,229,0.14)',
          borderBottom: '1px solid rgba(141,188,229,0.14)',
        },
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '16px 24px 24px',
        gap: 12,
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        border: '1px solid rgba(156,187,217,0.22)',
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
        '&.MuiChip-deletable': {
          paddingRight: 4,
          borderColor: 'rgba(173,203,255,0.2)',
          boxShadow:
            '0 8px 18px rgba(4,10,25,0.18), inset 0 1px 0 rgba(56,132,210,0.14)',
        },
      },
      label: { fontWeight: 500 },
      deleteIcon: {
        marginRight: 4,
        marginLeft: 8,
        color: '#f5f9ff',
        fontSize: '1rem',
        borderRadius: 12,
        padding: 4,
        background:
          'linear-gradient(180deg, rgba(118,137,190,0.18) 0%, rgba(92,109,163,0.16) 100%)',
        border: '1px solid rgba(173,203,255,0.22)',
        boxShadow:
          '0 10px 18px rgba(4,10,25,0.26), inset 0 1px 0 rgba(156,187,217,0.26)',
        transition:
          'color 120ms ease, background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
        '&:hover': {
          color: '#FFFFFF',
          background:
            'linear-gradient(180deg, rgba(128,149,206,0.22) 0%, rgba(98,118,177,0.2) 100%)',
          borderColor: 'rgba(191,219,254,0.4)',
          boxShadow:
            '0 12px 24px rgba(4,10,25,0.3), 0 0 12px rgba(96,208,255,0.16)',
          transform: 'scale(1.04)',
        },
      },
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
        color: '#FFFFFF',
        fontSize: '0.875rem',
        border: '1px solid rgba(156,187,217,0.22)',
      },
    },
  },
  ...THEME_STEPPER_COMPONENTS,
};
