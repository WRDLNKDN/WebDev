// src/theme.ts
import { createTheme } from '@mui/material/styles';

const customTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Blue with high contrast on white
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f50057', // Pink with high contrast
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
    text: {
      primary: '#000000', // Black for primary text
      secondary: '#424242', // Dark gray for secondary text
      disabled: '#9e9e9e', // Gray for disabled text
    },
    error: {
      main: '#d32f2f', // Red for errors
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f57c00', // Orange for warnings
      contrastText: '#000000',
    },
    info: {
      main: '#0288d1', // Blue for info
      contrastText: '#ffffff',
    },
    success: {
      main: '#388e3c', // Green for success
      contrastText: '#ffffff',
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
            outline: `2px solid ${'#1976d2'}`,
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
              borderColor: '#1976d2',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1976d2',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#424242',
          '&.Mui-focused': {
            color: '#1976d2',
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          color: '#666666',
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#1976d2',
          textDecoration: 'underline',
          '&:hover': {
            textDecoration: 'underline',
          },
          '&:focus': {
            outline: `2px solid ${'#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:focus': {
            backgroundColor: '#e3f2fd',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:focus': {
            backgroundColor: '#e3f2fd',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          '&:focus': {
            outline: `2px solid ${'#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#424242',
          color: '#ffffff',
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
          backgroundColor: '#ffffff',
        },
      },
    },
  },
});

export default customTheme;
