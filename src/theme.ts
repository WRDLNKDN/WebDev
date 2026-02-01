import { createTheme } from '@mui/material/styles';

// HUMAN OS COLOR PALETTE (Dark Mode Verified)
const PALETTE = {
  mode: 'dark' as const,
  primary: {
    main: '#42a5f5', // WCAG AA Safe on #121212
    light: '#90caf9',
    dark: '#1565c0',
    contrastText: '#000000',
  },
  secondary: {
    main: '#ec407a', // Pink is valid for accents
    contrastText: '#000000',
  },
  background: {
    default: '#121212', // Standard Dark Mode base
    paper: '#1e1e1e', // Slightly elevated surface
  },
  text: {
    primary: '#ffffff', // 21:1 Contrast
    secondary: '#e0e0e0', // 16:1 Contrast (Bumped from grey.500)
    disabled: '#9e9e9e',
  },
  error: {
    main: '#ef5350',
    contrastText: '#000000',
  },
  warning: {
    main: '#ffb74d',
    contrastText: '#000000',
  },
  success: {
    main: '#66bb6a',
    contrastText: '#000000',
  },
  info: {
    main: '#29b6f6',
    contrastText: '#000000',
  },
};

// SECTION 508 / WCAG FOCUS STYLE
// "The Blue Halo" - High visibility focus ring for keyboard users
const FOCUS_RING = {
  outline: '3px solid #90caf9',
  outlineOffset: '2px',
};

const theme = createTheme({
  palette: PALETTE,

  // TYPOGRAPHY: The "Brand vs Utility" Protocol
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 16, // Mobile-First readability base
    htmlFontSize: 16,
    h1: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle1: { fontFamily: '"Poppins", sans-serif', fontWeight: 500 },
    subtitle2: { fontFamily: '"Poppins", sans-serif', fontWeight: 500 },
    button: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 600,
      textTransform: 'none',
    },
    body1: { fontSize: '1rem', lineHeight: 1.6 }, // 16px - Optimal reading
    body2: { fontSize: '0.875rem', lineHeight: 1.5 }, // 14px - Utilities
    caption: { fontSize: '0.75rem', lineHeight: 1.5 }, // 12px - Disclaimers
  },

  // COMPONENT OVERRIDES: The Compliance Engine
  components: {
    // 1. GLOBAL RESET
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#6b6b6b #2b2b2b',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: '#2b2b2b',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#6b6b6b',
            minHeight: 24,
            border: '3px solid #2b2b2b',
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus':
            {
              backgroundColor: '#959595',
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
          '&:focus-visible': FOCUS_RING,
        },
        containedPrimary: {
          '&:hover': { backgroundColor: '#1565c0' }, // Clear hover state
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': FOCUS_RING,
          // Ensure visual bounds match touch target
          padding: 12,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#90caf9',
          textDecoration: 'underline', // Crucial for color-blind users (Use of Color rule)
          textUnderlineOffset: '4px',
          '&:hover': { color: '#42a5f5' },
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
            color: '#a0a0a0', // Fixes default low contrast placeholders
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
          color: '#e0e0e0', // Readable label
          '&.Mui-focused': { color: '#42a5f5' },
        },
        // MERGE: Nick's Asterisk Style (Mapped to OUR Palette)
        asterisk: {
          color: PALETTE.error.main,
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem', // Ensure error text isn't microscopic
          color: '#e0e0e0',
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
        icon: { color: '#e0e0e0' },
      },
    },

    // 4. SURFACES (Cards, Dialogs, Menus)
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
          border: '1px solid rgba(255, 255, 255, 0.12)', // Visual definition for low vision
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
          minHeight: 48, // WCAG Touch Target
          '&:focus-visible': { backgroundColor: 'rgba(66, 165, 245, 0.12)' },
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
        },
      },
    },

    // 5. DATA DISPLAY (Chips, Tables, Alerts)
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          height: 32,
          '&:focus-visible': FOCUS_RING,
        },
        label: { fontWeight: 500 },
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
          '&:focus-visible': FOCUS_RING,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#424242',
          color: '#ffffff',
          fontSize: '0.875rem',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },

    // 6. MERGE: Nick's Stepper Logic (Updated to use OUR Palette)
    // Signup stepper readability on dark background
    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: 'rgba(255,255,255,0.70)',
          '&.Mui-active': {
            color: '#ffffff',
            fontWeight: 700,
          },
          '&.Mui-completed': {
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 600,
          },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.35)',
          '&.Mui-active': {
            color: PALETTE.primary.main, // Mapped to our Blue
          },
          '&.Mui-completed': {
            color: PALETTE.success.main, // Mapped to our Green
          },
        },
        text: {
          fill: '#121212', // Matches our Background Dark
          fontWeight: 800,
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: 'rgba(255,255,255,0.18)',
        },
      },
    },
  },
});

export default theme;
