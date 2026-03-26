import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { signupLink } from '../../../theme/joinStyles';
import { BRAND_COLORS } from '../../../theme/themeConstants';

const consentCheckboxSx = {
  color: 'rgba(255,255,255,0.55)',
  '&.Mui-checked': { color: BRAND_COLORS.purple },
} as const;

type IdentityConsentSectionProps = {
  termsAccepted: boolean;
  guidelinesAccepted: boolean;
  loading: boolean;
  onTermsAcceptedChange: (checked: boolean) => void;
  onGuidelinesAcceptedChange: (checked: boolean) => void;
};

export const IdentityConsentSection = ({
  termsAccepted,
  guidelinesAccepted,
  loading,
  onTermsAcceptedChange,
  onGuidelinesAcceptedChange,
}: IdentityConsentSectionProps) => (
  <>
    <Typography
      variant="subtitle2"
      sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
    >
      Before entering, please confirm:
    </Typography>
    <Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={termsAccepted}
            onChange={(e) => onTermsAcceptedChange(e.target.checked)}
            disabled={loading}
            sx={consentCheckboxSx}
          />
        }
        label={
          <Typography variant="body2" component="span" sx={{ m: 0 }}>
            I agree to the{' '}
            <Typography
              component="a"
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              sx={signupLink}
            >
              Terms of Service
            </Typography>
          </Typography>
        }
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={guidelinesAccepted}
            onChange={(e) => onGuidelinesAcceptedChange(e.target.checked)}
            disabled={loading}
            sx={consentCheckboxSx}
          />
        }
        label={
          <Typography variant="body2" component="span" sx={{ m: 0 }}>
            I agree to follow the{' '}
            <Typography
              component="a"
              href="/guidelines"
              target="_blank"
              rel="noopener noreferrer"
              sx={signupLink}
            >
              Community Guidelines
            </Typography>
          </Typography>
        }
      />
    </Box>
  </>
);
