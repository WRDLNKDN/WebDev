import { Box, Button, Stack, Typography } from '@mui/material';

const ICON_ACCEPT = '.png,.svg,image/png,image/svg+xml';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AdvertiseIconFieldProps = {
  iconFile: File | null;
  iconPreview: string | null;
  iconInputRef: React.RefObject<HTMLInputElement | null>;
  fieldError?: string;
  submitting: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
};

export const AdvertiseIconField = ({
  iconFile,
  iconPreview,
  iconInputRef,
  fieldError,
  submitting,
  onFileChange,
  onClear,
}: AdvertiseIconFieldProps) => (
  <Box>
    <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
      Upload Your Icon or Logo *
    </Typography>
    <Typography
      variant="caption"
      color="text.secondary"
      component="div"
      sx={{ mb: 1.5, display: 'block', lineHeight: 1.5 }}
    >
      PNG or SVG preferred. Max 5MB. Transparent background and square format
      recommended.
    </Typography>

    <Box
      sx={{
        border: '1px solid',
        borderColor: fieldError ? 'error.main' : 'divider',
        borderRadius: 2,
        bgcolor: (t) =>
          t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'action.hover',
        p: 2,
      }}
    >
      {!iconFile ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 100,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1.5,
            bgcolor: (t) =>
              t.palette.mode === 'dark'
                ? 'rgba(0,0,0,0.2)'
                : 'background.paper',
          }}
        >
          <Button
            variant="outlined"
            component="label"
            size="medium"
            disabled={submitting}
          >
            Choose file
            <input
              ref={iconInputRef}
              type="file"
              accept={ICON_ACCEPT}
              hidden
              onChange={onFileChange}
            />
          </Button>
        </Box>
      ) : (
        <Stack
          direction="row"
          spacing={2}
          alignItems="flex-start"
          sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
        >
          <Box
            sx={{
              flexShrink: 0,
              width: 96,
              height: 96,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {iconPreview ? (
              <Box
                component="img"
                src={iconPreview}
                alt=""
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            ) : null}
          </Box>

          <Stack
            spacing={1.25}
            sx={{
              flex: 1,
              minWidth: 0,
              alignSelf: 'center',
              py: { xs: 0, sm: 0.5 },
            }}
          >
            <Button
              variant="outlined"
              component="label"
              size="small"
              disabled={submitting}
              sx={{ alignSelf: 'flex-start' }}
            >
              Change file
              <input
                ref={iconInputRef}
                type="file"
                accept={ICON_ACCEPT}
                hidden
                onChange={onFileChange}
              />
            </Button>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                wordBreak: 'break-word',
                lineHeight: 1.4,
              }}
            >
              <Box
                component="span"
                sx={{ fontWeight: 500, color: 'text.primary' }}
              >
                {iconFile.name}
              </Box>
              <Box component="span" sx={{ display: 'block', mt: 0.25 }}>
                {formatFileSize(iconFile.size)}
              </Box>
            </Typography>
            <Button
              variant="text"
              size="small"
              color="secondary"
              onClick={onClear}
              disabled={submitting}
              sx={{
                alignSelf: 'flex-start',
                mt: -0.5,
                textTransform: 'none',
                fontWeight: 600,
                px: 0,
                minWidth: 0,
              }}
            >
              Remove file
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>

    {fieldError ? (
      <Typography
        variant="caption"
        color="error"
        sx={{ display: 'block', mt: 1 }}
      >
        {fieldError}
      </Typography>
    ) : null}
  </Box>
);
