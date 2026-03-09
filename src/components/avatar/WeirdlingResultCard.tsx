import {
  CheckCircle as SuccessIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Fade,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import type { WeirdlingResponse } from './weirdlingTypes';

type WeirdlingResultCardProps = {
  result: WeirdlingResponse;
  selectedName: string | null;
  saveStatus: 'idle' | 'saving' | 'saved';
  successBorderColor: string;
  onSelectName: (name: string) => void;
  onSave: () => void;
};

export const WeirdlingResultCard = ({
  result,
  selectedName,
  saveStatus,
  successBorderColor,
  onSelectName,
  onSave,
}: WeirdlingResultCardProps) => {
  return (
    <Fade in>
      <Card
        sx={{
          border: `2px solid ${successBorderColor}`,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <CardContent>
          <Stack spacing={3}>
            <Box
              sx={{
                width: '100%',
                aspectRatio: '1/1',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {result.prediction.output[0] ? (
                <Box
                  component="img"
                  src={result.prediction.output[0]}
                  alt="Generated weirdling"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <Skeleton variant="rectangular" width="100%" height="100%" />
              )}
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom color="text.primary">
                Identity Detected. Select Designation:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {result.names.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    onClick={() => onSelectName(name)}
                    color={selectedName === name ? 'success' : 'default'}
                    variant={selectedName === name ? 'filled' : 'outlined'}
                    clickable
                    sx={{
                      fontSize: '0.9rem',
                      py: 2.5,
                      px: 1,
                      borderRadius: '24px',
                      borderWidth: selectedName === name ? 0 : 1,
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {selectedName && (
              <Fade in>
                <Button
                  fullWidth
                  variant="contained"
                  color={saveStatus === 'saved' ? 'success' : 'primary'}
                  onClick={onSave}
                  disabled={saveStatus !== 'idle'}
                  startIcon={
                    saveStatus === 'saved' ? <SuccessIcon /> : <SaveIcon />
                  }
                  sx={{ py: 1.5, fontWeight: 700 }}
                >
                  {saveStatus === 'saved'
                    ? 'IDENTITY SECURED'
                    : `CONFIRM: ${selectedName}`}
                </Button>
              </Fade>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  );
};
