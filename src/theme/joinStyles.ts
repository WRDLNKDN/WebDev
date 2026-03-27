/**
 * Shared join flow styles (MUI sx). Replaces join.css and step-specific CSS.
 */

import { ACTION_COLORS, BRAND_COLORS } from './themeConstants';

export const signupPaper = {
  p: { xs: 1, sm: 1.75, md: 2.5 },
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
} as const;

export const signupMain = {
  minHeight: '100dvh',
  py: 2,
  px: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
} as const;

export const signupProgressWrapper = {
  width: '100%',
  maxWidth: 900,
  mb: 1.5,
} as const;

export const signupStepLabel = {
  fontWeight: 700,
  mb: 0.5,
} as const;

export const signupStepSubtext = {
  color: 'rgba(255,255,255,0.97)', // AAA 7:1 on dark overlay
} as const;

export const signupLink = {
  color: BRAND_COLORS.purple,
  textDecoration: 'underline',
} as const;

export const signupBackButton = {
  alignSelf: 'flex-start',
} as const;

// WelcomeStep
export const welcomeStepTitle = {
  fontWeight: 800,
  mb: 0.5,
} as const;

export const welcomeStepSubtext = {
  color: 'rgba(255,255,255,0.97)',
} as const;

export const welcomeStepDescription = {
  color: 'rgba(255,255,255,0.98)',
} as const;

// JoinProgress
export const signupProgress = {
  width: '100%',
  mb: 1.5,
} as const;

export const signupProgressStepLabel = {
  ml: 1,
  color: 'rgba(255,255,255,0.97)',
  fontSize: '0.875rem',
} as const;

export const signupProgressFooter = {
  mt: 1,
  textAlign: 'center',
  '& span': { color: 'rgba(255,255,255,0.97)', fontSize: '0.875rem' },
} as const;

// IdentityStep
export const identityStepChecking = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  justifyContent: 'center',
  py: 2,
} as const;

export const identityStepInfoBox = {
  p: 1.5,
  bgcolor: 'rgba(56,132,210,0.14)',
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'rgba(156,187,217,0.26)',
} as const;

/** OAuth security note: informational only, not button-like */
export const identityStepOAuthNote = {
  mt: 1.5,
  py: 1,
  px: 0,
  bgcolor: 'transparent',
  border: 'none',
  color: 'rgba(220, 186, 238, 0.96)',
  fontWeight: 700,
  fontSize: '0.8125rem',
} as const;

export const identityStepBtn = {
  textTransform: 'none' as const,
  fontWeight: 600,
  justifyContent: 'flex-start',
  py: 1,
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
  mb: 0.5,
  color: 'white',
} as const;

export const profileStepSubtext = {
  color: 'rgba(255,255,255,0.97)',
} as const;

export const profileStepAlert = {
  bgcolor: 'rgba(211, 47, 47, 0.15)',
  border: '1px solid',
  borderColor: 'rgba(211, 47, 47, 0.3)',
  color: 'rgba(255,255,255,0.97)',
  '& .MuiAlert-icon': { color: '#f44336' },
} as const;

export const profileStepTextField = {
  '& .MuiOutlinedInput-root': {
    color: '#FFFFFF',
    bgcolor: 'rgba(0,0,0,0.3)',
    '& fieldset': { borderColor: 'rgba(141,188,229,0.38)' },
    '&:hover fieldset': { borderColor: 'rgba(141,188,229,0.50)' },
    '&.Mui-focused fieldset': { borderColor: '#A744C2' },
    '&.Mui-error fieldset': { borderColor: '#f44336' },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,0.96)',
    fontWeight: 600,
    fontSize: '0.9375rem',
    '&.Mui-focused': { color: '#A744C2' },
    '&.Mui-error': { color: '#f44336' },
    '& .MuiFormLabel-asterisk': {
      color: ACTION_COLORS.error,
    },
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(255,255,255,0.92)',
    opacity: 1,
  },
  '& .MuiFormHelperText-root': {
    color: 'rgba(255,255,255,0.97)',
    '&.Mui-error': { color: '#f44336' },
  },
} as const;

export const profileStepTipBox = {
  p: 1.5,
  bgcolor: 'rgba(33, 150, 243, 0.1)',
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'rgba(33, 150, 243, 0.2)',
} as const;

export const profileStepTipText = {
  color: 'rgba(255,255,255,0.97)',
} as const;

export const profileStepButtonRow = {
  pt: 1.5,
  justifyContent: 'space-between',
  alignItems: { xs: 'stretch', sm: 'center' },
} as const;

export const profileStepBackButton = {
  '&:disabled': {
    borderColor: 'rgba(141,188,229,0.42)',
    color: 'rgba(255,255,255,0.72)', // AAA: readable disabled state
  },
} as const;

export const profileStepSubmitButton = {
  flex: '0 1 auto',
  minWidth: 160,
  py: 1.25,
  px: 3,
  fontSize: '1rem',
  fontWeight: 600,
  bgcolor: '#A744C2',
  color: '#FFFFFF',
  '&:hover': { bgcolor: '#8C39A3' },
  '&:disabled': {
    bgcolor: 'rgba(167, 68, 194, 0.35)',
    color: 'rgba(255,255,255,0.78)', // AAA: readable disabled
  },
} as const;

// ValuesStep
export const valuesStepSectionTitle = {
  mb: 0.5,
  fontWeight: 600,
} as const;

export const valuesStepSectionSubtext = {
  mb: 1,
  color: 'rgba(255,255,255,0.97)',
} as const;

export const valuesStepButtonRow = {
  pt: 1,
  pb: 0.5,
  justifyContent: 'space-between',
  alignItems: { xs: 'stretch', sm: 'center' },
} as const;

export const valuesStepContinueButton = {
  flex: '0 1 auto',
} as const;

/** Primary CTA (Launch, Continue, Create profile, Browse all, OAuth-adjacent). */
export const joinFlowPrimaryButtonSx = {
  minHeight: 44,
  textTransform: 'none' as const,
  fontWeight: 700,
  fontSize: { xs: '0.9375rem', sm: '0.95rem' },
  px: { xs: 2, sm: 2.5 },
  py: { xs: 0.85, sm: 1.125 },
  borderRadius: 2,
  bgcolor: BRAND_COLORS.purple,
  color: '#FFFFFF',
  border: 'none',
  boxShadow: '0 2px 12px rgba(167,68,194,0.38)',
  '&:hover:not(:disabled)': {
    bgcolor: '#9534b0',
    boxShadow: '0 4px 16px rgba(167,68,194,0.48)',
  },
  '&.Mui-disabled': {
    bgcolor: 'rgba(90,90,110,0.4)',
    color: 'rgba(255,255,255,0.5)',
    boxShadow: 'none',
  },
} as const;

/** Secondary / Back — same visual family as primary, outlined purple. */
export const joinFlowSecondaryButtonSx = {
  minHeight: 44,
  textTransform: 'none' as const,
  fontWeight: 600,
  fontSize: '0.875rem',
  px: { xs: 1.5, sm: 2 },
  py: { xs: 0.85, sm: 1.125 },
  borderRadius: 2,
  color: '#FFFFFF',
  border: '2px solid rgba(167,68,194,0.85)',
  bgcolor: 'rgba(167,68,194,0.12)',
  '&:hover': {
    bgcolor: 'rgba(167,68,194,0.22)',
    borderColor: BRAND_COLORS.purple,
  },
  '&.Mui-disabled': {
    borderColor: 'rgba(156,187,217,0.28)',
    color: 'rgba(255,255,255,0.38)',
    bgcolor: 'rgba(255,255,255,0.04)',
  },
} as const;

/** Interest toggle pills on Join profile (compact Launch-style toggles). */
export const joinFlowInterestPillIdleSx = {
  minHeight: 36,
  minWidth: 36,
  textTransform: 'none' as const,
  fontWeight: 600,
  fontSize: '0.8125rem',
  px: 1.25,
  py: 0.5,
  borderRadius: 99,
  flexShrink: 0,
  border: '2px solid rgba(167,68,194,0.7)',
  color: 'rgba(255,255,255,0.95)',
  bgcolor: 'rgba(167,68,194,0.1)',
  '&:hover:not(:disabled)': {
    bgcolor: 'rgba(167,68,194,0.2)',
    borderColor: BRAND_COLORS.purple,
  },
} as const;

export const joinFlowInterestPillSelectedSx = {
  minHeight: 36,
  minWidth: 36,
  textTransform: 'none' as const,
  fontWeight: 600,
  fontSize: '0.8125rem',
  px: 1.25,
  py: 0.5,
  borderRadius: 99,
  flexShrink: 0,
  border: 'none',
  color: '#FFFFFF',
  bgcolor: BRAND_COLORS.purple,
  boxShadow: '0 2px 8px rgba(167,68,194,0.35)',
  '&:hover:not(:disabled)': {
    bgcolor: '#9534b0',
  },
} as const;

// ReviewStep
export const reviewStepTitle = {
  fontWeight: 800,
} as const;

export const reviewStepSubtext = {
  color: 'rgba(255,255,255,0.97)',
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
