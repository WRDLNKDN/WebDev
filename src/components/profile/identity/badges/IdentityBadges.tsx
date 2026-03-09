import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { Chip, Stack } from '@mui/material';

interface IdentityBadgesProps {
  onTagsClick?: () => void;
  onSkillsClick?: () => void;
}

export const IdentityBadges = ({
  onTagsClick,
  onSkillsClick,
}: IdentityBadgesProps) => {
  const onEdit = onTagsClick ?? onSkillsClick;
  return (
    <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
      <Chip
        size="small"
        icon={<LocalOfferIcon sx={{ fontSize: 16 }} />}
        label="Builder Tags"
        onClick={onTagsClick}
        clickable={Boolean(onTagsClick)}
        sx={{
          bgcolor: 'rgba(255,193,7,0.15)',
          color: 'text.primary',
          border: '1px solid rgba(255,193,7,0.35)',
          cursor: onTagsClick ? 'pointer' : 'default',
          '& .MuiChip-icon': { color: 'inherit' },
        }}
      />
      <Chip
        size="small"
        icon={<PsychologyIcon sx={{ fontSize: 16 }} />}
        label="Skills"
        onClick={onSkillsClick}
        clickable={Boolean(onSkillsClick)}
        sx={{
          bgcolor: 'rgba(236,64,122,0.15)',
          color: 'text.primary',
          border: '1px solid rgba(236,64,122,0.35)',
          cursor: onSkillsClick ? 'pointer' : 'default',
          '& .MuiChip-icon': { color: 'inherit' },
        }}
      />
      {onEdit && (
        <Chip
          size="small"
          label="Edit Profile"
          onClick={onEdit}
          clickable
          sx={{
            bgcolor: 'rgba(66,165,245,0.15)',
            color: 'primary.light',
            border: '1px solid rgba(66,165,245,0.4)',
            cursor: 'pointer',
          }}
        />
      )}
    </Stack>
  );
};
