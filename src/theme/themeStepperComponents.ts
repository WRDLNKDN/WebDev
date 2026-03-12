import { PALETTE } from './themeConstants';

export const THEME_STEPPER_COMPONENTS = {
  MuiStepLabel: {
    styleOverrides: {
      label: {
        color: 'rgba(255,255,255,0.92)',
        '&.Mui-active': {
          color: '#FFFFFF',
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
        fill: '#05070F',
        fontWeight: 800,
      },
    },
  },
  MuiStepConnector: {
    styleOverrides: {
      line: {
        borderColor: 'rgba(141,188,229,0.34)',
      },
    },
  },
};
