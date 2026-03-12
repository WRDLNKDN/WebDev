export const BRAND_COLORS = {
  redOrange: '#E13D2D',
  orange: '#EE9932',
  yellow: '#FFFF4C',
  green: '#4DD166',
  blue: '#3884D2',
  purple: '#A744C2',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const ACTION_COLORS = {
  primary: BRAND_COLORS.blue,
  primaryHover: '#2D6FAD',
  primaryDisabled: '#9CBBD9',
  secondary: BRAND_COLORS.purple,
  secondaryHover: '#8C39A3',
  secondaryDisabled: '#D3B0DB',
  success: BRAND_COLORS.green,
  successHover: '#40AE55',
  successDisabled: '#A6E2B2',
  warning: BRAND_COLORS.orange,
  warningHover: '#D0852B',
  warningDisabled: '#E6C7A2',
  error: BRAND_COLORS.redOrange,
  errorHover: '#BF3426',
  errorDisabled: '#E09F98',
} as const;

export const SURFACE_COLORS = {
  canvas: '#05070F',
  canvasRaised: '#0B1220',
  paper: '#111827',
  panel: '#182235',
  panelBorder: 'rgba(156, 187, 217, 0.22)',
  panelBorderStrong: 'rgba(156, 187, 217, 0.34)',
} as const;

export const TEXT_COLORS = {
  primary: '#FFFFFF',
  secondary: 'rgba(255,255,255,0.88)',
  muted: 'rgba(255,255,255,0.72)',
  disabled: 'rgba(156,187,217,0.72)',
  link: '#8DBCE5',
  linkHover: BRAND_COLORS.blue,
} as const;

export type AppThemeId = 'light' | 'ocean' | 'forest' | 'space';

type ThemePalette = {
  mode: 'light' | 'dark';
  primary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  background: {
    default: string;
    paper: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  error: {
    main: string;
    dark: string;
    contrastText: string;
  };
  warning: {
    main: string;
    dark: string;
    contrastText: string;
  };
  success: {
    main: string;
    dark: string;
    contrastText: string;
  };
  info: {
    main: string;
    dark: string;
    contrastText: string;
  };
};

export const INTERACTION_COLORS = {
  muted: TEXT_COLORS.muted,
  react: BRAND_COLORS.green,
  comment: BRAND_COLORS.blue,
  repost: BRAND_COLORS.purple,
  send: BRAND_COLORS.blue,
  save: BRAND_COLORS.yellow,
  care: BRAND_COLORS.orange,
  love: BRAND_COLORS.redOrange,
  focus: '#8DBCE5',
} as const;

export const PALETTE: ThemePalette = {
  mode: 'dark' as const,
  primary: {
    main: ACTION_COLORS.primary,
    light: '#8DBCE5',
    dark: ACTION_COLORS.primaryHover,
    contrastText: BRAND_COLORS.black,
  },
  secondary: {
    main: ACTION_COLORS.secondary,
    light: '#CB8FDB',
    dark: ACTION_COLORS.secondaryHover,
    contrastText: BRAND_COLORS.black,
  },
  background: {
    default: SURFACE_COLORS.canvas,
    paper: SURFACE_COLORS.paper,
  },
  text: {
    primary: TEXT_COLORS.primary,
    secondary: TEXT_COLORS.secondary,
    disabled: TEXT_COLORS.disabled,
  },
  error: {
    main: ACTION_COLORS.error,
    dark: ACTION_COLORS.errorHover,
    contrastText: BRAND_COLORS.black,
  },
  warning: {
    main: ACTION_COLORS.warning,
    dark: ACTION_COLORS.warningHover,
    contrastText: BRAND_COLORS.black,
  },
  success: {
    main: ACTION_COLORS.success,
    dark: ACTION_COLORS.successHover,
    contrastText: BRAND_COLORS.black,
  },
  info: {
    main: ACTION_COLORS.primary,
    dark: ACTION_COLORS.primaryHover,
    contrastText: BRAND_COLORS.black,
  },
};

export const THEME_PRESETS: Record<
  AppThemeId,
  {
    id: AppThemeId;
    label: string;
    description: string;
    palette: ThemePalette;
    focus: string;
    gradient: string;
  }
> = {
  light: {
    id: 'light',
    label: 'Light',
    description: 'Bright panels, softer contrast, and clean daylight surfaces.',
    palette: {
      mode: 'light',
      primary: {
        main: '#2563EB',
        light: '#60A5FA',
        dark: '#1D4ED8',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#DB2777',
        light: '#F472B6',
        dark: '#BE185D',
        contrastText: '#ffffff',
      },
      background: {
        default: '#E8EEF7',
        paper: '#FFFFFF',
      },
      text: {
        primary: '#111827',
        secondary: '#334155',
        disabled: '#64748B',
      },
      error: {
        main: '#DC2626',
        dark: '#991B1B',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#D97706',
        dark: '#92400E',
        contrastText: '#111827',
      },
      success: {
        main: '#059669',
        dark: '#047857',
        contrastText: '#111827',
      },
      info: {
        main: '#075985',
        dark: '#0C4A6E',
        contrastText: '#ffffff',
      },
    },
    focus: '#2563EB',
    gradient: 'linear-gradient(135deg, #f8fbff 0%, #d8e8ff 100%)',
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep blue glass, neon surf accents, and cooler contrast.',
    palette: {
      mode: 'dark',
      primary: {
        main: '#38BDF8',
        light: '#7DD3FC',
        dark: '#0284C7',
        contrastText: '#03131D',
      },
      secondary: {
        main: '#2DD4BF',
        light: '#5EEAD4',
        dark: '#0F766E',
        contrastText: '#03131D',
      },
      background: {
        default: '#06141F',
        paper: '#0C2433',
      },
      text: {
        primary: '#F3FBFF',
        secondary: '#C8E6F0',
        disabled: '#6B93A6',
      },
      error: {
        main: '#FB7185',
        dark: '#BE123C',
        contrastText: '#03131D',
      },
      warning: {
        main: '#FBBF24',
        dark: '#B45309',
        contrastText: '#03131D',
      },
      success: {
        main: '#34D399',
        dark: '#047857',
        contrastText: '#03131D',
      },
      info: {
        main: '#38BDF8',
        dark: '#0369A1',
        contrastText: '#03131D',
      },
    },
    focus: '#38BDF8',
    gradient: 'linear-gradient(135deg, #071b29 0%, #0f4c75 100%)',
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    description: 'Mossy dark surfaces, emerald actions, and calmer contrast.',
    palette: {
      mode: 'dark',
      primary: {
        main: '#34D399',
        light: '#6EE7B7',
        dark: '#059669',
        contrastText: '#03110A',
      },
      secondary: {
        main: '#84CC16',
        light: '#A3E635',
        dark: '#4D7C0F',
        contrastText: '#03110A',
      },
      background: {
        default: '#0A130D',
        paper: '#16261A',
      },
      text: {
        primary: '#F3FFF6',
        secondary: '#D0E7D6',
        disabled: '#7F9B86',
      },
      error: {
        main: '#F87171',
        dark: '#B91C1C',
        contrastText: '#03110A',
      },
      warning: {
        main: '#FACC15',
        dark: '#A16207',
        contrastText: '#03110A',
      },
      success: {
        main: '#34D399',
        dark: '#047857',
        contrastText: '#03110A',
      },
      info: {
        main: '#22C55E',
        dark: '#166534',
        contrastText: '#03110A',
      },
    },
    focus: '#34D399',
    gradient: 'linear-gradient(135deg, #0b170f 0%, #214d33 100%)',
  },
  space: {
    id: 'space',
    label: 'Space',
    description: 'High-contrast midnight chrome with cosmic violet accents.',
    palette: {
      mode: 'dark',
      primary: {
        main: '#A78BFA',
        light: '#C4B5FD',
        dark: '#7C3AED',
        contrastText: '#090611',
      },
      secondary: {
        main: '#F472B6',
        light: '#F9A8D4',
        dark: '#DB2777',
        contrastText: '#090611',
      },
      background: {
        default: '#090611',
        paper: '#171127',
      },
      text: {
        primary: '#FCFAFF',
        secondary: '#DCCFF8',
        disabled: '#8E7DAE',
      },
      error: {
        main: '#FB7185',
        dark: '#BE123C',
        contrastText: '#090611',
      },
      warning: {
        main: '#F59E0B',
        dark: '#B45309',
        contrastText: '#090611',
      },
      success: {
        main: '#22C55E',
        dark: '#15803D',
        contrastText: '#090611',
      },
      info: {
        main: '#818CF8',
        dark: '#4338CA',
        contrastText: '#090611',
      },
    },
    focus: '#A78BFA',
    gradient: 'linear-gradient(135deg, #080613 0%, #24163f 100%)',
  },
};

export const FOCUS_RING = {
  outline: `3px solid ${INTERACTION_COLORS.focus}`,
  outlineOffset: '2px',
};

export const FONT_FAMILY =
  '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
