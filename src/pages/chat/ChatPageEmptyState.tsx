import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

type ChatPageEmptyStateProps = {
  onStartDm: () => void;
  onCreateGroup: () => void;
  /** `docked` = inside floating desktop panel; `page` = full mobile shell */
  variant?: 'docked' | 'page';
};

export const ChatPageEmptyState = ({
  onStartDm,
  onCreateGroup,
  variant = 'page',
}: ChatPageEmptyStateProps) => {
  const theme = useTheme();
  const docked = variant === 'docked';
  const primaryText = docked
    ? 'rgba(252,250,255,0.96)'
    : theme.palette.text.primary;
  const secondaryText = docked
    ? 'rgba(220,207,248,0.82)'
    : theme.palette.text.secondary;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2.5,
        px: 3,
        py: 4,
        textAlign: 'center',
        minHeight: 0,
        ...(docked
          ? {
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              background: `linear-gradient(165deg, ${alpha(theme.palette.primary.dark, 0.12)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 45%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
            }
          : {}),
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.14),
          border: `1px solid ${alpha(theme.palette.primary.light, 0.28)}`,
          color: 'primary.light',
        }}
        aria-hidden
      >
        <ForumOutlinedIcon sx={{ fontSize: 36 }} />
      </Box>
      <Box sx={{ maxWidth: 420 }}>
        <Typography
          variant="overline"
          sx={{
            letterSpacing: 2,
            color: secondaryText,
            display: 'block',
            mb: 0.75,
          }}
        >
          Your inbox
        </Typography>
        <Typography
          variant="h5"
          component="p"
          sx={{ fontWeight: 700, mb: 1, color: primaryText }}
        >
          Pick a conversation or start one that actually matters.
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5, color: secondaryText }}>
          Direct messages stay quick; groups help when you need more weirdlings
          in the loop.
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 1.25,
          flexDirection: { xs: 'column', sm: 'row' },
          width: { xs: '100%', sm: 'auto' },
          maxWidth: 400,
        }}
      >
        <Button
          variant="contained"
          onClick={onStartDm}
          sx={{ width: { xs: '100%', sm: 'auto' }, textTransform: 'none' }}
        >
          New 1:1 chat
        </Button>
        <Button
          variant="outlined"
          onClick={onCreateGroup}
          sx={{ width: { xs: '100%', sm: 'auto' }, textTransform: 'none' }}
        >
          New group
        </Button>
      </Box>
    </Box>
  );
};
