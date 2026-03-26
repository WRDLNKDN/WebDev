import {
  Box,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { BRAND_COLORS } from '../../../theme/themeConstants';

type ProfileStepMarketingOptInProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

const linkSx = {
  color: BRAND_COLORS.purple,
  fontWeight: 600,
  textDecoration: 'underline',
  textDecorationColor: 'rgba(167,68,194,0.55)',
  textUnderlineOffset: 3,
  '&:hover': {
    color: '#c084fc',
    textDecorationColor: 'rgba(192,132,252,0.8)',
  },
} as const;

export const ProfileStepMarketingOptIn = ({
  checked,
  disabled = false,
  onChange,
}: ProfileStepMarketingOptInProps) => {
  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: 2,
        border: '1px solid rgba(156,187,217,0.28)',
        bgcolor: 'rgba(16,20,36,0.96)',
        px: { xs: 1, sm: 1.5 },
        py: { xs: 0.85, sm: 1.35 },
      }}
    >
      <FormControlLabel
        disabled={disabled}
        sx={{
          alignItems: 'flex-start',
          m: 0,
          width: '100%',
          cursor: disabled ? 'default' : 'pointer',
          '& .MuiFormControlLabel-label': {
            width: '100%',
            ml: 0,
          },
        }}
        control={
          <Checkbox
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            size="medium"
            inputProps={{
              'aria-describedby': 'profile-marketing-opt-in-meta',
            }}
            sx={{
              alignSelf: 'flex-start',
              mt: { xs: 0, sm: 0.25 },
              mr: { xs: 1, sm: 1.25 },
              ml: { xs: -0.25, sm: -0.5 },
              p: { xs: 0.75, sm: 0.75 },
              color: 'rgba(200,214,235,0.55)',
              '&.Mui-checked': { color: BRAND_COLORS.purple },
            }}
          />
        }
        label={
          <Stack
            spacing={{ xs: 0.35, sm: 0.65 }}
            sx={{ pt: { xs: 0.1, sm: 0.35 }, pr: 0.5 }}
          >
            <Typography
              component="span"
              sx={{
                display: 'block',
                fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                fontWeight: 600,
                lineHeight: { xs: 1.3, sm: 1.35 },
                color: 'rgba(248,250,252,0.96)',
                letterSpacing: '0.01em',
              }}
            >
              Get product updates and community news
            </Typography>
            <Typography
              id="profile-marketing-opt-in-meta"
              component="span"
              variant="caption"
              sx={{
                display: 'block',
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                lineHeight: { xs: 1.4, sm: 1.45 },
                color: 'rgba(226,232,240,0.72)',
              }}
            >
              Optional
              <Box
                component="span"
                sx={{ mx: 0.5, color: 'rgba(148,163,184,0.9)' }}
              >
                •
              </Box>
              <Link
                component={RouterLink}
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                sx={linkSx}
                onClick={(e) => e.stopPropagation()}
              >
                Privacy
              </Link>
              <Box
                component="span"
                sx={{ mx: 0.5, color: 'rgba(148,163,184,0.9)' }}
              >
                •
              </Box>
              <Link
                component={RouterLink}
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                sx={linkSx}
                onClick={(e) => e.stopPropagation()}
              >
                Terms
              </Link>
            </Typography>
          </Stack>
        }
      />
    </Box>
  );
};
