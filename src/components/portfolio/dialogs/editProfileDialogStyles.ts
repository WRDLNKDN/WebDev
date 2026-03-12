export const GRADIENT_START = '#00C4CC';
export const GRADIENT_END = '#FF22C9';
export const AVATAR_GRADIENT = `linear-gradient(135deg, ${GRADIENT_START} 0%, ${GRADIENT_END} 100%)`;
export const PURPLE_ACCENT = '#B366FF';
export const DARK_BG = '#1a1a1f';
export const INPUT_BG = '#28282d';
export const BORDER_COLOR = 'rgba(156,187,217,0.18)';

export const GLASS_MODAL = {
  bgcolor: DARK_BG,
  backdropFilter: 'blur(20px)',
  border: `1px solid ${BORDER_COLOR}`,
  color: 'white',
  borderRadius: 3,
  position: 'relative',
  overflow: 'visible',
  boxShadow: '0 24px 48px rgba(0,0,0,0.9)',
  maxWidth: '540px',
  width: '100%',
};

export const INPUT_STYLES = {
  '& .MuiFilledInput-root': {
    bgcolor: INPUT_BG,
    borderRadius: '8px',
    border: `1px solid ${BORDER_COLOR}`,
    paddingTop: '8px',
    paddingBottom: '8px',
    minHeight: '48px',
    '&:hover': {
      bgcolor: 'rgba(50, 50, 55, 0.9)',
      borderColor: 'rgba(156,187,217,0.26)',
    },
    '&.Mui-focused': {
      bgcolor: 'rgba(50, 50, 55, 0.95)',
      borderColor: PURPLE_ACCENT,
    },
    '&:before, &:after': { display: 'none' },
  },
  '& .MuiFilledInput-input': { padding: '12px 14px' },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
  },
  '& .MuiInputBase-input': { color: 'white', fontSize: '0.95rem' },
  '& .MuiFormHelperText-root': {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    mt: 0.5,
  },
};
