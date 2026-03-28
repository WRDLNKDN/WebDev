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
  const layout = docked
    ? {
        primaryText: 'rgba(252,250,255,0.96)',
        secondaryText: 'rgba(220,207,248,0.82)',
        alignItems: 'flex-start' as const,
        justifyContent: 'flex-start' as const,
        gap: 1.5,
        px: 2,
        py: 2.5,
        textAlign: 'left' as const,
        iconSize: 48,
        iconRadius: 1.75,
        iconFontSize: 24,
        maxCopyWidth: 280,
        actionsMaxWidth: 280,
        titleVariant: 'subtitle1' as const,
        buttonSize: 'small' as const,
        title: 'Choose a chat to jump back in.',
        description:
          'Your active thread will stay here while the rest of the app remains visible.',
        showOverline: false,
        containerSx: {
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.2)} 0%, ${alpha(theme.palette.background.default, 0.92)} 100%)`,
        },
      }
    : {
        primaryText: theme.palette.text.primary,
        secondaryText: theme.palette.text.secondary,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: 2.5,
        px: 3,
        py: 4,
        textAlign: 'center' as const,
        iconSize: 72,
        iconRadius: 2.5,
        iconFontSize: 36,
        maxCopyWidth: 420,
        actionsMaxWidth: 400,
        titleVariant: 'h5' as const,
        buttonSize: 'medium' as const,
        title: 'Pick a conversation or start one that actually matters.',
        description:
          'Direct messages stay quick; groups help when you need more weirdlings in the loop.',
        showOverline: true,
        containerSx: {},
      };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: layout.alignItems,
        justifyContent: layout.justifyContent,
        flexDirection: 'column',
        gap: layout.gap,
        px: layout.px,
        py: layout.py,
        textAlign: layout.textAlign,
        minHeight: 0,
        ...layout.containerSx,
      }}
    >
      <Box
        sx={{
          width: layout.iconSize,
          height: layout.iconSize,
          borderRadius: layout.iconRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.14),
          border: `1px solid ${alpha(theme.palette.primary.light, 0.28)}`,
          color: 'primary.light',
        }}
        aria-hidden
      >
        <ForumOutlinedIcon sx={{ fontSize: layout.iconFontSize }} />
      </Box>
      <Box sx={{ maxWidth: layout.maxCopyWidth }}>
        {layout.showOverline ? (
          <Typography
            variant="overline"
            sx={{
              letterSpacing: 2,
              color: layout.secondaryText,
              display: 'block',
              mb: 0.75,
            }}
          >
            Your inbox
          </Typography>
        ) : null}
        <Typography
          variant={layout.titleVariant}
          component="p"
          sx={{ fontWeight: 700, mb: 0.75, color: layout.primaryText }}
        >
          {layout.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{ mb: 0.5, color: layout.secondaryText }}
        >
          {layout.description}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' },
          width: { xs: '100%', sm: 'auto' },
          maxWidth: layout.actionsMaxWidth,
        }}
      >
        <Button
          size={layout.buttonSize}
          variant="contained"
          onClick={onStartDm}
          sx={{ width: { xs: '100%', sm: 'auto' }, textTransform: 'none' }}
        >
          New 1:1 chat
        </Button>
        <Button
          size={layout.buttonSize}
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
