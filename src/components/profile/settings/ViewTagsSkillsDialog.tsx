import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PsychologyIcon from '@mui/icons-material/Psychology';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { shouldCloseDialogFromReason } from '../../../lib/ui/dialogFormUtils';
import { mergeFullScreenDialogPaperSx } from '../../../lib/ui/fullScreenDialogSx';

export interface ViewTagsSkillsDialogProps {
  open: boolean;
  onClose: () => void;
  /** e.g. tagline or short builder tags text */
  tagline?: string;
  /** Builder tags as list (if we have multiple) */
  builderTags?: string[];
  /** Skills from nerd_creds.skills */
  skills?: string[];
}

export const ViewTagsSkillsDialog = ({
  open,
  onClose,
  tagline,
  builderTags = [],
  skills = [],
}: ViewTagsSkillsDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const hasTags = Boolean(tagline?.trim()) || builderTags.length > 0;
  const hasSkills = skills.length > 0;

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (shouldCloseDialogFromReason(reason)) onClose();
      }}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      aria-label="Tags & Skills"
      PaperProps={{
        sx: mergeFullScreenDialogPaperSx(fullScreen, {}),
      }}
    >
      <Tooltip title="Close">
        <span>
          <IconButton
            aria-label="Close"
            onClick={onClose}
            size="small"
            sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </span>
      </Tooltip>
      <DialogTitle sx={{ pr: 6, pb: 0.5 }}>Tags & Skills</DialogTitle>
      <DialogContent
        sx={{
          pt: 1.5,
          pb: fullScreen
            ? 'calc(12px + env(safe-area-inset-bottom, 0px))'
            : undefined,
        }}
      >
        <Stack spacing={3}>
          {hasTags || hasSkills ? (
            <>
              {(hasTags && (
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <LocalOfferIcon color="primary" fontSize="small" />
                    <Typography variant="overline" color="text.secondary">
                      Builder Tags
                    </Typography>
                  </Stack>
                  {tagline?.trim() && (
                    <Typography variant="body1">{tagline.trim()}</Typography>
                  )}
                  {builderTags.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {builderTags.map((tag) => (
                        <Typography
                          key={tag}
                          variant="body2"
                          sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            bgcolor: 'rgba(255,193,7,0.12)',
                            border: '1px solid rgba(255,193,7,0.3)',
                          }}
                        >
                          {tag}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Stack>
              )) ||
                null}
              {(hasSkills && (
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PsychologyIcon color="secondary" fontSize="small" />
                    <Typography variant="overline" color="text.secondary">
                      Skills
                    </Typography>
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {skills.map((skill) => (
                      <Typography
                        key={skill}
                        variant="body2"
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: 'rgba(236,64,122,0.12)',
                          border: '1px solid rgba(236,64,122,0.3)',
                        }}
                      >
                        {skill}
                      </Typography>
                    ))}
                  </Stack>
                </Stack>
              )) ||
                null}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No tags or skills added yet.
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
