import { Box, Button } from '@mui/material';

const QUICK_BORDER = '#0077B5';

type QuickReactionsProps = {
  onSend: (content: string) => void;
  disabled?: boolean;
};

export const QuickReactions = ({ onSend, disabled }: QuickReactionsProps) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      px: 1.5,
      py: 1,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <Button
      type="button"
      size="small"
      onClick={() => onSend('😊')}
      disabled={disabled}
      aria-label="Send smile"
      sx={{
        minWidth: 40,
        border: `1px solid ${QUICK_BORDER}`,
        color: 'text.primary',
        bgcolor: 'transparent',
        '&:hover': {
          bgcolor: 'rgba(0,119,181,0.12)',
          borderColor: QUICK_BORDER,
        },
      }}
    >
      😊
    </Button>
    <Button
      type="button"
      size="small"
      onClick={() => onSend('👍')}
      disabled={disabled}
      aria-label="Send thumbs up"
      sx={{
        minWidth: 40,
        border: `1px solid ${QUICK_BORDER}`,
        color: 'text.primary',
        bgcolor: 'transparent',
        '&:hover': {
          bgcolor: 'rgba(0,119,181,0.12)',
          borderColor: QUICK_BORDER,
        },
      }}
    >
      👍
    </Button>
    <Button
      type="button"
      size="small"
      onClick={() => onSend('Thank you')}
      disabled={disabled}
      aria-label="Send thank you"
      sx={{
        border: `1px solid ${QUICK_BORDER}`,
        color: 'white',
        bgcolor: QUICK_BORDER,
        '&:hover': {
          bgcolor: '#006399',
          borderColor: QUICK_BORDER,
        },
      }}
    >
      Thank you
    </Button>
  </Box>
);
