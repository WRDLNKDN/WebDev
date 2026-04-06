import { alpha, createTheme } from '@mui/material/styles';
import {
  FONT_FAMILY,
  FOCUS_RING as DEFAULT_FOCUS_RING,
  PALETTE as DEFAULT_PALETTE,
  THEME_PRESETS,
  type AppThemeId,
} from './themeConstants';

export function createAppTheme(themeId: AppThemeId = 'dark') {
  const preset = THEME_PRESETS[themeId] ?? THEME_PRESETS.dark;
  const PALETTE = preset.palette ?? DEFAULT_PALETTE;
  const isLight = PALETTE.mode === 'light';
  const surfaceBorder = alpha(
    isLight ? '#0F172A' : '#FFFFFF',
    isLight ? 0.16 : 0.12,
  );
  const menuHoverBackground = alpha(
    PALETTE.primary.main,
    isLight ? 0.08 : 0.14,
  );
  const dismissIconBorder = surfaceBorder;
  const dismissIconBorderHover = alpha(
    isLight ? '#0F172A' : '#FFFFFF',
    isLight ? 0.24 : 0.2,
  );
  /** Dialog & panel close (X) and dismiss controls — subtle, matches light/dark (not delete/remove). */
  const dismissIconButtonChrome = {
    width: '40px !important',
    height: '40px !important',
    minWidth: '40px !important',
    padding: '0 !important',
    position: 'relative' as const,
    overflow: 'visible',
    borderRadius: '10px !important',
    color: `${alpha(PALETTE.text.primary, isLight ? 0.52 : 0.68)} !important`,
    background: 'transparent !important',
    backgroundImage: 'none !important',
    border: `1px solid ${dismissIconBorder} !important`,
    boxShadow: 'none !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    transform: 'none !important',
    transition:
      'color 120ms ease, background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
    '&::before': { display: 'none !important', content: 'none' as const },
    '&::after': { display: 'none !important', content: 'none' as const },
    '& .MuiSvgIcon-root': {
      position: 'relative' as const,
      zIndex: 1,
      fontSize: '1.375rem !important',
      display: 'block',
    },
    '&:hover': {
      transform: 'none !important',
      boxShadow: 'none !important',
      color: `${PALETTE.text.primary} !important`,
      background: `${menuHoverBackground} !important`,
      backgroundImage: 'none !important',
      borderColor: `${dismissIconBorderHover} !important`,
    },
    '&.Mui-disabled': {
      color: `${alpha(PALETTE.text.primary, 0.32)} !important`,
      borderColor: `${alpha(isLight ? '#0F172A' : '#FFFFFF', 0.1)} !important`,
      background: 'transparent !important',
    },
  };
  const alertTextColor = {
    error: isLight ? '#7F1D1D' : '#FFD6D6',
    info: isLight ? '#0C4A6E' : '#D9FFFF',
    success: isLight ? '#14532D' : '#D8FFE7',
    warning: isLight ? '#78350F' : '#FFF0C2',
  };
  const FOCUS_RING = {
    ...DEFAULT_FOCUS_RING,
    outline: `3px solid ${preset.focus}`,
  };

  const theme = createTheme({
    palette: PALETTE,

    // TYPOGRAPHY: local/system sans stack to keep the landing path fast.
    typography: {
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      htmlFontSize: 16,

      // H1: Hero Titles (Mobile: 32px -> Desktop: 72px)
      h1: {
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        lineHeight: 1.1,
        fontSize: 'clamp(2rem, 5vw + 1rem, 4.5rem)',
      },

      // H2: Section Headers (Mobile: 24px -> Desktop: 48px)
      h2: {
        fontFamily: FONT_FAMILY,
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: 'clamp(1.5rem, 4vw + 1rem, 3rem)',
      },

      // H3: Card Titles (Mobile: 20px -> Desktop: 36px)
      h3: {
        fontFamily: FONT_FAMILY,
        fontWeight: 600,
        lineHeight: 1.3,
        fontSize: 'clamp(1.25rem, 3vw + 1rem, 2.25rem)',
      },

      // H4: Subtitles (Mobile: 18px -> Desktop: 28px)
      h4: {
        fontFamily: FONT_FAMILY,
        fontWeight: 500,
        lineHeight: 1.4,
        fontSize: 'clamp(1.125rem, 2vw + 1rem, 1.75rem)',
      },

      // H5: Dense Headers
      h5: {
        fontFamily: FONT_FAMILY,
        fontWeight: 500,
        lineHeight: 1.4,
        fontSize: 'clamp(1.1rem, 1.5vw + 1rem, 1.5rem)',
      },

      // H6: Micro Headers
      h6: {
        fontFamily: FONT_FAMILY,
        fontWeight: 500,
        lineHeight: 1.5,
        fontSize: 'clamp(1rem, 1vw + 1rem, 1.25rem)',
      },

      subtitle1: { fontFamily: FONT_FAMILY, fontWeight: 500 },
      subtitle2: { fontFamily: FONT_FAMILY, fontWeight: 500 },

      button: {
        fontFamily: FONT_FAMILY,
        fontWeight: 600,
        textTransform: 'none',
      },

      // Body text scales slightly for better reading on large monitors
      body1: {
        fontFamily: FONT_FAMILY,
        fontSize: 'clamp(1rem, 0.5vw + 1rem, 1.125rem)',
        lineHeight: 1.6,
      },

      body2: {
        fontFamily: FONT_FAMILY,
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },

      caption: {
        fontFamily: FONT_FAMILY,
        fontSize: '0.75rem',
        lineHeight: 1.5,
      },

      overline: {
        fontFamily: FONT_FAMILY,
      },
    },

    // COMPONENT OVERRIDES: The Compliance Engine
    components: {
      // 1. GLOBAL RESET — single scrollbar: html/body do not scroll; #root is the scroll container (Join overrides on its page)
      MuiCssBaseline: {
        styleOverrides: {
          '@global': {
            html: {
              overflow: 'hidden',
              height: '100%',
              fontFamily: FONT_FAMILY,
              backgroundColor: PALETTE.background.default,
              color: PALETTE.text.primary,
            },
            body: {
              overflowX: 'hidden',
              overflowY: 'hidden',
              height: '100%',
              fontFamily: FONT_FAMILY,
              backgroundColor: PALETTE.background.default,
              color: PALETTE.text.primary,
            },
            // #root does not scroll; Layout and Join use their own scroll container
            '#root': {
              height: '100%',
              overflow: 'hidden',
            },
            // Single scroll container (Layout and Join use this class for scrollbar styling)
            '.app-scroll-container': {
              scrollbarColor: `${alpha(PALETTE.text.primary, 0.45)} ${alpha(
                PALETTE.background.paper,
                isLight ? 0.4 : 0.9,
              )}`,
              '&::-webkit-scrollbar': {
                backgroundColor: alpha(
                  PALETTE.background.paper,
                  isLight ? 0.4 : 0.9,
                ),
              },
              '&::-webkit-scrollbar-thumb': {
                borderRadius: 8,
                backgroundColor: alpha(PALETTE.text.primary, 0.45),
                minHeight: 24,
                border: `3px solid ${alpha(
                  PALETTE.background.paper,
                  isLight ? 0.4 : 0.9,
                )}`,
              },
              '&::-webkit-scrollbar-thumb:focus': {
                backgroundColor: alpha(PALETTE.text.primary, 0.62),
              },
            },
            'input, textarea, button, select, option, optgroup': {
              fontFamily: FONT_FAMILY,
            },
            // Global link affordance: every real anchor gets obvious hover text feedback.
            'a[href]': {
              transition:
                'color 120ms ease, text-decoration-color 120ms ease, opacity 120ms ease',
            },
            'a[href]:hover': {
              cursor: 'pointer',
            },
            'a[href]:focus-visible': {
              textDecoration: 'none',
            },
            '@media (prefers-reduced-motion: reduce)': {
              '*, *::before, *::after': {
                animationDelay: '0ms !important',
                animationDuration: '0.01ms !important',
                animationIterationCount: '1 !important',
                scrollBehavior: 'auto !important',
                transitionDelay: '0ms !important',
                transitionDuration: '0.01ms !important',
              },
            },
          },
        },
      },

      // 2. INTERACTIVE ELEMENTS (Touch Targets & Focus)
      MuiButtonBase: {
        defaultProps: {
          disableRipple: false, // Ripple is good feedback (WCAG 2.2)
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
            minHeight: 44, // WCAG 2.5.5 (Target Size)
            padding: '8px 24px',
            fontWeight: 700,
            transition:
              'color 120ms ease, background-color 120ms ease, transform 120ms ease, box-shadow 120ms ease, text-decoration-color 120ms ease',
            '&:focus-visible': FOCUS_RING,
            '&:hover': {
              textDecoration: 'none',
              boxShadow: 'none',
              transform: 'translateY(-1px)',
            },
            '&[aria-pressed="true"], &[aria-selected="true"]': {
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: 'none',
            },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': {
                transform: 'none',
              },
            },
          },
          containedPrimary: {
            '&:hover': { backgroundColor: PALETTE.primary.dark },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:focus-visible': FOCUS_RING,
            overflow: 'visible',
            // Ensure visual bounds match touch target
            padding: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition:
              'color 120ms ease, background-color 120ms ease, transform 120ms ease, box-shadow 120ms ease',
            '& .MuiSvgIcon-root': {
              flexShrink: 0,
              display: 'block',
            },
            '&:hover': {
              transform: 'scale(1.04)',
              boxShadow: 'inset 0 0 0 1px currentColor',
            },
            '&[aria-pressed="true"], &[aria-selected="true"]': {
              boxShadow: 'inset 0 0 0 2px currentColor',
              backgroundColor: 'rgba(255,255,255,0.08)',
            },
            '&[aria-label*="close" i], &[aria-label*="dismiss" i]':
              dismissIconButtonChrome,
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': {
                transform: 'none',
              },
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
            // WCAG 1.4.1 / link-in-text-block: link vs surrounding text needs ≥3:1 contrast
            // (dark: primary.light on text.primary fails in Firefox+axe; primary.dark passes).
            color: isLight ? PALETTE.primary.main : PALETTE.primary.dark,
            textDecoration: 'none',
            '&:hover': {
              color: isLight ? PALETTE.primary.dark : PALETTE.primary.main,
            },
            '&:focus-visible': {
              ...FOCUS_RING,
              borderRadius: '2px',
            },
          },
        },
      },

      // 3. FORMS & INPUTS (Labels, Borders, Errors)
      MuiInputBase: {
        styleOverrides: {
          input: {
            minHeight: 44, // Touch target safety
            '&::placeholder': {
              opacity: 1,
              color: alpha(PALETTE.text.secondary, isLight ? 0.82 : 0.92),
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: PALETTE.primary.light,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: PALETTE.primary.main,
              borderWidth: 2,
            },
          },
          notchedOutline: {
            borderColor: surfaceBorder,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: PALETTE.text.secondary,
            '&.Mui-focused': { color: PALETTE.primary.main },
            // Required * must stay error-colored when label turns primary on focus (MUI 7).
            '& .MuiFormLabel-asterisk': {
              color: PALETTE.error.main,
            },
            '&.Mui-focused .MuiFormLabel-asterisk': {
              color: PALETTE.error.main,
            },
            '&.Mui-error .MuiFormLabel-asterisk': {
              color: PALETTE.error.main,
            },
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
            fontSize: '0.875rem', // Ensure error text isn't microscopic
            color: PALETTE.text.secondary,
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            padding: 10, // Expand touch target
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
          icon: { color: PALETTE.text.secondary },
        },
      },

      // 4. SURFACES (Cards, Dialogs, Menus)
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: PALETTE.background.paper,
            color: PALETTE.text.primary,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${surfaceBorder}`, // Visual definition for low vision
            backgroundColor: PALETTE.background.paper,
            color: PALETTE.text.primary,
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
              backgroundColor: isLight
                ? alpha('#0F172A', 0.4)
                : alpha('#040A19', 0.6),
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            },
          },
          paper: {
            borderRadius: 16,
            border: `1px solid ${surfaceBorder}`,
            ...(isLight
              ? {
                  backgroundColor: PALETTE.background.paper,
                  boxShadow:
                    '0 28px 64px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                }
              : {
                  backgroundImage:
                    'linear-gradient(180deg, rgba(10,18,32,0.98), rgba(7,15,28,0.98))',
                  boxShadow:
                    '0 28px 64px rgba(1, 6, 18, 0.48), inset 0 1px 0 rgba(255,255,255,0.05)',
                }),
            maxHeight: 'min(880px, calc(100dvh - 32px))',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: '20px 24px 16px',
            borderBottom: `1px solid ${alpha(PALETTE.primary.light, 0.14)}`,
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '24px',
            '&.MuiDialogContent-dividers': {
              borderTop: `1px solid ${alpha(PALETTE.primary.light, 0.14)}`,
              borderBottom: `1px solid ${alpha(PALETTE.primary.light, 0.14)}`,
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
            border: `1px solid ${surfaceBorder}`,
            borderRadius: 8,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 48, // WCAG Touch Target
            transition:
              'background-color 120ms ease, transform 120ms ease, box-shadow 120ms ease',
            '&:focus-visible': {
              backgroundColor: alpha(PALETTE.primary.main, 0.16),
              boxShadow: 'inset 3px 0 0 currentColor',
            },
            '&:hover': {
              backgroundColor: menuHoverBackground,
              boxShadow: 'inset 3px 0 0 currentColor',
              transform: 'translateX(1px)',
            },
            '&.Mui-selected': {
              fontWeight: 700,
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
              boxShadow: 'inset 3px 0 0 currentColor',
            },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': {
                transform: 'none',
              },
            },
          },
        },
      },

      // 5. DATA DISPLAY (Chips, Tables, Alerts)
      MuiChip: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            height: 32,
            borderWidth: 2,
            transition:
              'color 120ms ease, background-color 120ms ease, transform 120ms ease, box-shadow 120ms ease',
            '&:focus-visible': FOCUS_RING,
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: 'inset 0 0 0 1px currentColor',
            },
            '&[aria-pressed="true"], &.MuiChip-filled': {
              boxShadow: 'inset 0 0 0 2px currentColor',
            },
            '&.MuiChip-deletable': {
              paddingRight: 4,
              ...(isLight
                ? {
                    borderColor: alpha(PALETTE.text.primary, 0.2),
                    boxShadow: `0 2px 8px ${alpha(PALETTE.text.primary, 0.08)}`,
                  }
                : {
                    borderColor: 'rgba(173,203,255,0.2)',
                    boxShadow:
                      '0 8px 18px rgba(4,10,25,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }),
            },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': {
                transform: 'none',
              },
            },
          },
          label: { fontWeight: 500 },
          deleteIcon: {
            marginRight: 4,
            marginLeft: 8,
            fontSize: '1rem',
            borderRadius: 12,
            padding: 4,
            transition:
              'color 120ms ease, background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
            ...(isLight
              ? {
                  color: PALETTE.text.secondary,
                  background: alpha(PALETTE.primary.main, 0.08),
                  border: `1px solid ${alpha(PALETTE.primary.main, 0.2)}`,
                  boxShadow: `0 2px 6px ${alpha(PALETTE.text.primary, 0.06)}`,
                  '&:hover': {
                    color: PALETTE.primary.dark,
                    background: alpha(PALETTE.primary.main, 0.14),
                    borderColor: alpha(PALETTE.primary.main, 0.35),
                    boxShadow: `0 4px 12px ${alpha(PALETTE.primary.main, 0.15)}`,
                    transform: 'scale(1.04)',
                  },
                }
              : {
                  color: '#f5f9ff',
                  background:
                    'linear-gradient(180deg, rgba(118,137,190,0.18) 0%, rgba(92,109,163,0.16) 100%)',
                  border: '1px solid rgba(173,203,255,0.22)',
                  boxShadow:
                    '0 10px 18px rgba(4,10,25,0.26), inset 0 1px 0 rgba(255,255,255,0.12)',
                  '&:hover': {
                    color: '#ffffff',
                    background:
                      'linear-gradient(180deg, rgba(128,149,206,0.22) 0%, rgba(98,118,177,0.2) 100%)',
                    borderColor: 'rgba(191,219,254,0.4)',
                    boxShadow:
                      '0 12px 24px rgba(4,10,25,0.3), 0 0 12px rgba(96,208,255,0.16)',
                    transform: 'scale(1.04)',
                  },
                }),
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: '0.95rem', // Readable alerts
            alignItems: 'center',
          },
          standardError: {
            backgroundColor: alpha(PALETTE.error.main, 0.12),
            color: alertTextColor.error,
            border: `1px solid ${PALETTE.error.main}`,
          },
          standardInfo: {
            backgroundColor: alpha(PALETTE.info.main, 0.12),
            color: alertTextColor.info,
            border: `1px solid ${PALETTE.info.main}`,
          },
          standardSuccess: {
            backgroundColor: alpha(PALETTE.success.main, 0.12),
            color: alertTextColor.success,
            border: `1px solid ${PALETTE.success.main}`,
          },
          standardWarning: {
            backgroundColor: alpha(PALETTE.warning.main, 0.12),
            color: alertTextColor.warning,
            border: `1px solid ${PALETTE.warning.main}`,
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
            '&:focus-visible': FOCUS_RING,
            '&.Mui-selected': {
              fontWeight: 800,
              textDecoration: 'none',
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
              borderWidth: 2,
            },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontFamily: FONT_FAMILY,
            fontSize: '0.875rem',
            ...(isLight
              ? {
                  backgroundColor: PALETTE.text.primary,
                  color: PALETTE.background.paper,
                  border: `1px solid ${alpha(PALETTE.text.primary, 0.2)}`,
                }
              : {
                  backgroundColor: '#424242',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.1)',
                }),
          },
        },
      },

      // 6. MERGE: Nick's Stepper Logic (Updated to use OUR Palette)
      MuiStepLabel: {
        styleOverrides: {
          label: {
            color: isLight ? PALETTE.text.secondary : 'rgba(255,255,255,0.92)',
            '&.Mui-active': {
              color: isLight ? PALETTE.text.primary : '#ffffff',
              fontWeight: 700,
            },
            '&.Mui-completed': {
              color: isLight ? PALETTE.text.primary : 'rgba(255,255,255,0.97)',
              fontWeight: 600,
            },
          },
        },
      },
      MuiStepIcon: {
        styleOverrides: {
          root: {
            color: isLight
              ? alpha(PALETTE.text.primary, 0.5)
              : 'rgba(255,255,255,0.55)',
            '&.Mui-active': {
              color: PALETTE.primary.main,
            },
            '&.Mui-completed': {
              color: PALETTE.success.main,
            },
          },
          text: {
            fill: isLight ? PALETTE.background.paper : '#121212',
            fontWeight: 800,
          },
        },
      },
      MuiStepConnector: {
        styleOverrides: {
          line: {
            borderColor: isLight
              ? alpha(PALETTE.text.primary, 0.2)
              : 'rgba(255,255,255,0.18)',
          },
        },
      },
    },
  });

  return theme;
}

const theme = createAppTheme();
export default theme;
export { FONT_FAMILY };
