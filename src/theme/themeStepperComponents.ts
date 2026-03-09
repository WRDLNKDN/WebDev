import { PALETTE } from './themeConstants';

export const THEME_STEPPER_COMPONENTS = {
  MuiStepLabel: {
    styleOverrides: {
      label: {
        color: 'rgba(255,255,255,0.92)',
        '&.Mui-active': {
          color: '#ffffff',
          fontWeight: 700,
        },
        '&.Mui-completed': {
          color: 'rgba(255,255,255,0.97)',
          fontWeight: 600,
        },
      },
    },
  },
  MuiStepIcon: {
    styleOverrides: {
      root: {
        color: 'rgba(255,255,255,0.55)',
        '&.Mui-active': {
          color: PALETTE.primary.main,
        },
        '&.Mui-completed': {
          color: PALETTE.success.main,
        },
      },
      text: {
        fill: '#121212',
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
};
