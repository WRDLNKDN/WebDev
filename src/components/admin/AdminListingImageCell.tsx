import { Box, TableCell, Typography } from '@mui/material';

const PLACEHOLDER_SX = {
  width: 48,
  height: 32,
  borderRadius: 0.5,
  bgcolor: 'action.hover',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const IMG_SX = {
  width: 48,
  height: 32,
  objectFit: 'cover',
  borderRadius: 0.5,
  border: '1px solid',
  borderColor: 'divider',
} as const;

/** Thumbnail or placeholder for admin partner / advertiser listing tables. */
export const AdminListingImageCell = ({
  imageUrl,
}: {
  imageUrl: string | null | undefined;
}) => (
  <TableCell sx={{ width: 56, py: 0.5 }}>
    {imageUrl ? (
      <Box component="img" src={imageUrl} alt="" sx={IMG_SX} />
    ) : (
      <Box sx={PLACEHOLDER_SX}>
        <Typography variant="caption" color="text.disabled">
          —
        </Typography>
      </Box>
    )}
  </TableCell>
);
