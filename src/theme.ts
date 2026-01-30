// src/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#05070f',
      paper: 'rgba(16, 18, 24, 0.72)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255,255,255,0.75)',
    },
    primary: {
      main: '#60a5fa',
    },
    success: {
      main: '#22c55e',
    },
    warning: {
      main: '#f59e0b',
    },
    error: {
      main: '#ef4444',
    },
  },

  typography: {
    fontFamily: [
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(','),
  },

  shape: {
    borderRadius: 16,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#05070f',
        },
      },
    },

    // Required * color
    MuiInputLabel: {
      styleOverrides: {
        asterisk: {
          color: '#ef4444',
        },
      },
    },

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
            color: '#60a5fa',
          },
          '&.Mui-completed': {
            color: '#22c55e',
          },
        },
        text: {
          fill: '#05070f',
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

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
