export const FORM_ACCENT_GRADIENT =
  'linear-gradient(90deg, #00C4CC 0%, #7D2AE8 50%, #FF22C9 100%)';

export const FORM_DIALOG_SX = {
  bgcolor: '#141414',
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: 1.5,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: FORM_ACCENT_GRADIENT,
    zIndex: 1,
  },
} as const;

export const FORM_SECTION_PANEL_SX = {
  p: { xs: 1.5, md: 1.75 },
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 1.25,
  bgcolor: 'rgba(255,255,255,0.03)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
} as const;

export const FORM_SECTION_HEADING_SX = {
  fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
  letterSpacing: 0.25,
  fontSize: '0.78rem',
  color: 'text.secondary',
  textTransform: 'uppercase',
  lineHeight: 1.2,
} as const;

export const FORM_OUTLINED_FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    bgcolor: 'rgba(255,255,255,0.04)',
    borderRadius: 1.5,
    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#00C4CC' },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.6)',
    '&.Mui-focused': { color: '#00C4CC' },
  },
  '& .MuiFormHelperText-root': {
    color: 'rgba(255,255,255,0.5)',
    ml: 0,
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(255,255,255,0.25)',
    opacity: 1,
  },
} as const;

export const FORM_FILTER_SELECT_SX = {
  borderRadius: 2,
  bgcolor: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 600,
  fontSize: '0.875rem',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.15)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#00C4CC',
    borderWidth: '1.5px',
  },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.45)' },
} as const;
