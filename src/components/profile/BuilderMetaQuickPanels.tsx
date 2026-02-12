import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { GLASS_CARD } from '../../theme/candyStyles';

interface QuickPanelProps {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}

const QUICK_PANEL_INNER = {
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.08)',
  bgcolor: 'rgba(0,0,0,0.2)',
  p: 3,
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  textAlign: 'center' as const,
};

const QuickPanel = ({ icon, title, subtitle, action }: QuickPanelProps) => (
  <Paper
    elevation={0}
    sx={{
      ...QUICK_PANEL_INNER,
    }}
  >
    {icon && (
      <Box sx={{ fontSize: 40, color: 'primary.main', mb: 1 }}>{icon}</Box>
    )}
    <Typography
      variant="subtitle1"
      fontWeight={700}
      sx={{ mb: subtitle ? 0.5 : 2 }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {subtitle}
      </Typography>
    )}
    {action}
  </Paper>
);

interface BuilderMetaQuickPanelsProps {
  onManageLinks: () => void;
  onManageSkills?: () => void;
}

export const BuilderMetaQuickPanels = ({
  onManageLinks,
  onManageSkills,
}: BuilderMetaQuickPanelsProps) => (
  <Paper
    elevation={0}
    sx={{
      ...GLASS_CARD,
      p: 3,
      mb: 4,
    }}
  >
    <Typography
      variant="overline"
      sx={{
        display: 'block',
        mb: 2,
        letterSpacing: 2,
        color: 'text.secondary',
        fontWeight: 600,
      }}
    >
      BUILDER META QUICK PANELS
    </Typography>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={3}
      sx={{ flexWrap: 'wrap' }}
    >
      <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
        <QuickPanel
          title="Links"
          subtitle=""
          action={
            <Button
              size="small"
              variant="outlined"
              onClick={onManageLinks}
              sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              Manage Links
            </Button>
          }
        />
      </Box>
      <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
        <QuickPanel
          title="Skills"
          subtitle=""
          action={
            <Button
              size="small"
              variant="outlined"
              onClick={onManageSkills ?? (() => {})}
              sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              Manage Skills
            </Button>
          }
        />
      </Box>
    </Stack>
  </Paper>
);
