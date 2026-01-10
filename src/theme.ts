// src/theme.ts
import { createTheme } from '@mui/material/styles';

const customTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#42a5f5', // Bright blue with WCAG AA contrast on dark background
      contrastText: '#000000',
    },
    secondary: {
      main: '#ec407a', // Bright pink with WCAG AA contrast
      contrastText: '#000000',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#e0e0e0', // Light gray for primary text (WCAG AA: 7.2:1)
      secondary: '#a0a0a0', // Medium gray for secondary text (WCAG AA: 4.7:1)
      disabled: '#757575', // Medium gray for disabled text
    },
    error: {
      main: '#ef5350', // Light red for errors (WCAG AA)
      contrastText: '#000000',
    },
    warning: {
      main: '#ffb74d', // Light orange for warnings (WCAG AA)
      contrastText: '#000000',
    },
    info: {
      main: '#29b6f6', // Light cyan for info (WCAG AA)
      contrastText: '#000000',
    },
    success: {
      main: '#66bb6a', // Light green for success (WCAG AA)
      contrastText: '#000000',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h1: {
      fontSize: '2rem', // 32px
      fontWeight: 300,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.75rem', // 28px
      fontWeight: 300,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem', // 24px
      fontWeight: 400,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem', // 20px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    h5: {
      fontSize: '1.125rem', // 18px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem', // 16px
      fontWeight: 500,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem', // 16px
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.43,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.875rem', // 14px
    },
    caption: {
      fontSize: '0.75rem', // 12px, but ensure contrast
      lineHeight: 1.66,
    },
    overline: {
      fontSize: '0.75rem', // 12px
      textTransform: 'uppercase',
      lineHeight: 2.66,
    },
  },
  components: {
    MuiContainer: {
      defaultProps: {
        disableGutters: true,
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 1,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 500,
          '&:focus': {
            outline: `2px solid ${'#42a5f5'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#42a5f5',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#42a5f5',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#a0a0a0',
          '&.Mui-focused': {
            color: '#42a5f5',
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          color: '#909090',
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#42a5f5',
          textDecoration: 'underline',
          '&:hover': {
            textDecoration: 'underline',
          },
          '&:focus': {
            outline: `2px solid ${'#42a5f5'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#42a5f5'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#42a5f5'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#42a5f5'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:focus': {
            backgroundColor: '#2a2a2a',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:focus': {
            backgroundColor: '#2a2a2a',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#42a5f5'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#42a5f5'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#42a5f5'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#42a5f5'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#2a2a2a',
          color: '#e0e0e0',
          fontSize: '0.75rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
        },
      },
    },
  },
});

export default customTheme;
