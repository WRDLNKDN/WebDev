import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Paper, Typography } from '@mui/material';
import { CANDY_HAZARD, DASHED_CARD_NEUTRAL } from '../../theme/candyStyles';

interface CompactAddCardProps {
  /** 'hazard' = red dashed (default), 'neutral' = dark gray dashed (Portfolio) */
  variant?: 'hazard' | 'neutral';
  label: string;
  onClick?: () => void;
  /** When set, renders an invisible file input; click opens file picker */
  accept?: string;
  onFileSelect?: (file: File) => void;
}

export const CompactAddCard = ({
  variant = 'hazard',
  label,
  onClick,
  accept,
  onFileSelect,
}: CompactAddCardProps) => {
  const isFileInput = Boolean(accept && onFileSelect);
  const isNeutral = variant === 'neutral';

  const content = (
    <Paper
      component={isFileInput ? 'label' : 'div'}
      onClick={
        isFileInput
          ? undefined
          : (e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.blur();
              onClick?.();
            }
      }
      sx={{
        ...(isNeutral ? DASHED_CARD_NEUTRAL : CANDY_HAZARD),
        minHeight: { xs: 80, md: 100 },
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isFileInput || onClick ? 'pointer' : 'default',
      }}
    >
      {isNeutral ? (
        <AddIcon sx={{ fontSize: { xs: 28, md: 40 }, mb: 1, color: 'white' }} />
      ) : (
        <AddCircleOutlineIcon sx={{ fontSize: 36, mb: 1 }} />
      )}
      <Typography
        variant="subtitle2"
        fontWeight={700}
        letterSpacing={0.5}
        sx={{
          ...(isNeutral ? { color: 'white' } : {}),
          fontSize: { xs: '0.7rem', md: 'inherit' },
        }}
      >
        {isNeutral ? label : `+ ${label}`}
      </Typography>
      {isFileInput && onFileSelect && (
        <input
          type="file"
          hidden
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
        />
      )}
    </Paper>
  );

  return content;
};
