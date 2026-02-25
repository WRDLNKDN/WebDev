/**
 * Shared join flow styles (MUI sx). Replaces join.css and step-specific CSS.
 */

export const signupPaper = {
  p: { xs: 3, md: 4 },
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
} as const;

export const signupMain = {
  minHeight: '100vh',
  py: 6,
  px: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
} as const;

export const signupProgressWrapper = {
  width: '100%',
  maxWidth: 900,
  mb: 4,
} as const;

export const signupStepLabel = {
  fontWeight: 700,
  mb: 1,
} as const;

export const signupStepSubtext = {
  color: 'rgba(255,255,255,0.95)',
} as const;

export const signupLink = {
  color: 'primary.main',
  textDecoration: 'underline',
} as const;

export const signupBackButton = {
  alignSelf: 'flex-start',
} as const;

// WelcomeStep
export const welcomeStepTitle = {
  fontWeight: 800,
  mb: 1,
} as const;

export const welcomeStepSubtext = {
  color: 'rgba(255,255,255,0.95)',
} as const;

export const welcomeStepDescription = {
  color: 'rgba(255,255,255,0.96)',
} as const;

// JoinProgress
export const signupProgress = {
  width: '100%',
  mb: 4,
} as const;

export const signupProgressStepLabel = {
  ml: 1,
  color: 'rgba(255,255,255,0.95)',
  fontSize: '0.875rem',
} as const;

export const signupProgressFooter = {
  mt: 2,
  textAlign: 'center',
  '& span': { color: 'rgba(255,255,255,0.95)', fontSize: '0.875rem' },
} as const;

// IdentityStep
export const identityStepChecking = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  justifyContent: 'center',
  py: 4,
} as const;

export const identityStepInfoBox = {
  p: 2,
  bgcolor: 'rgba(255,255,255,0.06)',
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'rgba(255,255,255,0.12)',
} as const;

export const identityStepBtn = {
  textTransform: 'none' as const,
  fontWeight: 600,
  justifyContent: 'flex-start',
  py: 1.5,
  px: 2,
};

export const identityStepBtnGoogle = {
  ...identityStepBtn,
  borderColor: 'rgba(66, 133, 244, 0.5)',
  color: '#4285f4',
  '&:hover': {
    borderColor: '#4285f4',
    bgcolor: 'rgba(66, 133, 244, 0.08)',
  },
};

export const identityStepBtnMicrosoft = {
  ...identityStepBtn,
  borderColor: 'rgba(0, 120, 212, 0.5)',
  color: '#0078d4',
  '&:hover': {
    borderColor: '#0078d4',
    bgcolor: 'rgba(0, 120, 212, 0.08)',
  },
};

// ProfileStep
export const profileStep = {
  maxWidth: 600,
  mx: 'auto',
} as const;

export const profileStepTitle = {
  fontWeight: 700,
  mb: 1,
  color: 'white',
} as const;

export const profileStepSubtext = {
  color: 'rgba(255,255,255,0.96)',
} as const;

export const profileStepAlert = {
  bgcolor: 'rgba(211, 47, 47, 0.15)',
  border: '1px solid',
  borderColor: 'rgba(211, 47, 47, 0.3)',
  color: 'rgba(255,255,255,0.9)',
  '& .MuiAlert-icon': { color: '#f44336' },
} as const;

export const profileStepTextField = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    bgcolor: 'rgba(0,0,0,0.3)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#4caf50' },
    '&.Mui-error fieldset': { borderColor: '#f44336' },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.96)',
    '&.Mui-focused': { color: '#4caf50' },
    '&.Mui-error': { color: '#f44336' },
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(255,255,255,0.9)',
    opacity: 1,
  },
  '& .MuiFormHelperText-root': {
    color: 'rgba(255,255,255,0.95)',
    '&.Mui-error': { color: '#f44336' },
  },
} as const;

export const profileStepTipBox = {
  p: 2,
  bgcolor: 'rgba(33, 150, 243, 0.1)',
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'rgba(33, 150, 243, 0.2)',
} as const;

export const profileStepTipText = {
  color: 'rgba(255,255,255,0.96)',
} as const;

export const profileStepButtonRow = {
  pt: 2,
} as const;

export const profileStepBackButton = {
  '&:disabled': {
    borderColor: 'rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.4)',
  },
} as const;

export const profileStepSubmitButton = {
  flex: 1,
  bgcolor: '#4caf50',
  color: '#fff',
  fontSize: '1.05rem',
  '&:hover': { bgcolor: '#45a049' },
  '&:disabled': {
    bgcolor: 'rgba(76, 175, 80, 0.3)',
    color: 'rgba(255,255,255,0.5)',
  },
} as const;

// ValuesStep
export const valuesStepSectionTitle = {
  mb: 1,
  fontWeight: 600,
} as const;

export const valuesStepSectionSubtext = {
  mb: 2,
  color: 'rgba(255,255,255,0.95)',
} as const;

export const valuesStepButtonRow = {
  pt: 2,
} as const;

export const valuesStepContinueButton = {
  flex: 1,
} as const;

// ReviewStep
export const reviewStepTitle = {
  fontWeight: 800,
} as const;

export const reviewStepSubtext = {
  color: 'rgba(255,255,255,0.95)',
} as const;

export const reviewStepSection = {
  p: 2,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  '& + &': { mt: 2 },
} as const;

export const reviewStepSectionTitle = {
  fontWeight: 700,
  mb: 1,
} as const;
