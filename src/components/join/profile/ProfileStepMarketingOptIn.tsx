import { Checkbox, FormControlLabel, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type ProfileStepMarketingOptInProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export const ProfileStepMarketingOptIn = ({
  checked,
  disabled = false,
  onChange,
}: ProfileStepMarketingOptInProps) => {
  return (
    <FormControlLabel
      sx={{ alignSelf: 'flex-start', alignItems: 'flex-start' }}
      control={
        <Checkbox
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          size="small"
          sx={{
            mt: '-2px',
            color: 'rgba(255,255,255,0.3)',
            '&.Mui-checked': { color: '#38bdf8' },
            p: '6px',
          }}
        />
      }
      label={
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}
        >
          Send me occasional WRDLNKDN emails (product updates, events, community
          news). Optional.{' '}
          <Link
            component={RouterLink}
            to="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#38bdf8',
              textDecorationColor: 'rgba(56,189,248,0.4)',
            }}
          >
            Privacy
          </Link>{' '}
          and{' '}
          <Link
            component={RouterLink}
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#38bdf8',
              textDecorationColor: 'rgba(56,189,248,0.4)',
            }}
          >
            Terms
          </Link>
          .
        </Typography>
      }
    />
  );
};
