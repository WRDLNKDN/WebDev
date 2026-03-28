import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

type ChatPageEmptyStateProps = {
  onStartDm: () => void;
  onCreateGroup: () => void;
  /** `docked` = inside desktop dock; `page` = full mobile shell */
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
        alignItems: docked ? 'flex-start' : 'center',
        justifyContent: docked ? 'flex-start' : 'center',
        flexDirection: 'column',
        gap: docked ? 1.5 : 2.5,
        px: docked ? 2 : 3,
        py: docked ? 2.5 : 4,
        textAlign: docked ? 'left' : 'center',
        minHeight: 0,
        ...(docked
          ? {
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.2)} 0%, ${alpha(theme.palette.background.default, 0.92)} 100%)`,
            }
          : {}),
      }}
    >
      <Box
        sx={{
          width: docked ? 48 : 72,
          height: docked ? 48 : 72,
          borderRadius: docked ? 1.75 : 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.14),
          border: `1px solid ${alpha(theme.palette.primary.light, 0.28)}`,
          color: 'primary.light',
        }}
        aria-hidden
      >
        <ForumOutlinedIcon sx={{ fontSize: docked ? 24 : 36 }} />
      </Box>
      <Box sx={{ maxWidth: docked ? 280 : 420 }}>
        {!docked ? (
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
        ) : null}
        <Typography
          variant={docked ? 'subtitle1' : 'h5'}
          component="p"
          sx={{ fontWeight: 700, mb: 0.75, color: primaryText }}
        >
          {docked
            ? 'Choose a chat to jump back in.'
            : 'Pick a conversation or start one that actually matters.'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5, color: secondaryText }}>
          {docked
            ? 'Your active thread will stay here while the rest of the app remains visible.'
            : 'Direct messages stay quick; groups help when you need more weirdlings in the loop.'}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' },
          width: { xs: '100%', sm: 'auto' },
          maxWidth: docked ? 280 : 400,
        }}
      >
        <Button
          size={docked ? 'small' : 'medium'}
          variant="contained"
          onClick={onStartDm}
          sx={{ width: { xs: '100%', sm: 'auto' }, textTransform: 'none' }}
        >
          New 1:1 chat
        </Button>
        <Button
          size={docked ? 'small' : 'medium'}
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
