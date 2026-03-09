import { Box, Button, Stack, Typography } from '@mui/material';

const ICON_ACCEPT = '.png,.svg,image/png,image/svg+xml';

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
    <Typography variant="subtitle2" sx={{ mb: 1 }}>
      Upload Your Icon or Logo *
    </Typography>
    <Typography variant="caption" color="text.secondary" component="div">
      PNG or SVG preferred. Max 5MB. Transparent background and square format
      recommended.
    </Typography>
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{ mt: 1, flexWrap: 'wrap' }}
    >
      <Button
        variant="outlined"
        component="label"
        size="small"
        disabled={submitting}
      >
        {iconFile ? 'Change file' : 'Choose file'}
        <input
          ref={iconInputRef}
          type="file"
          accept={ICON_ACCEPT}
          hidden
          onChange={onFileChange}
        />
      </Button>
      {iconFile ? (
        <>
          <Typography variant="body2">
            {iconFile.name} ({(iconFile.size / 1024).toFixed(1)} KB)
          </Typography>
          <Button
            size="small"
            color="secondary"
            onClick={onClear}
            disabled={submitting}
          >
            Remove
          </Button>
        </>
      ) : null}
    </Stack>
    {fieldError ? (
      <Typography
        variant="caption"
        color="error.main"
        sx={{ display: 'block', mt: 1 }}
      >
        {fieldError}
      </Typography>
    ) : null}
    {iconPreview ? (
      <Box
        component="img"
        src={iconPreview}
        alt="Selected advertiser icon preview"
        sx={{
          mt: 2,
          width: 96,
          height: 96,
          objectFit: 'contain',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: 1,
        }}
      />
    ) : null}
  </Box>
);
