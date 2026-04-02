import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Link, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { LinkPreviewData } from '../../lib/linkPreview';
import {
  createNormalizedLinkAsset,
  getNormalizedAssetThumbnailUrl,
} from '../../lib/media/assets';
import { InlineImageRenderer } from './AssetThumbnail';

export type LinkPreviewPayload = LinkPreviewData;

function linkPreviewDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function linkPreviewPaperSx(variant: 'feed' | 'chat'): SxProps<Theme> {
  const isChat = variant === 'chat';
  return {
    display: 'flex',
    flexDirection: isChat ? 'column' : { xs: 'column', sm: 'row' },
    overflow: 'hidden',
    borderRadius: isChat ? 2 : 1.5,
    borderColor: isChat ? 'transparent' : 'divider',
    bgcolor: isChat
      ? (theme: Theme) =>
          alpha(
            theme.palette.common.black,
            theme.palette.mode === 'light' ? 0.04 : 0.12,
          )
      : undefined,
    boxShadow: isChat ? 'none' : undefined,
    '&:hover': {
      borderColor: isChat
        ? (theme: Theme) => alpha(theme.palette.primary.main, 0.35)
        : 'primary.main',
      bgcolor: 'action.hover',
    },
  };
}

function linkPreviewImageSx(variant: 'feed' | 'chat'): SxProps<Theme> {
  const isChat = variant === 'chat';
  return {
    width: isChat ? '100%' : { xs: '100%', sm: 120 },
    minWidth: isChat ? 0 : { sm: 120 },
    height: isChat ? 120 : { xs: 140, sm: 120 },
    maxHeight: isChat ? 200 : undefined,
    objectFit: 'cover',
    bgcolor: 'action.hover',
  };
}

export const LinkPreviewCard = ({
  preview,
  onDismiss,
  variant = 'feed',
}: {
  preview: LinkPreviewPayload;
  onDismiss?: () => void;
  variant?: 'feed' | 'chat';
}) => {
  const asset = createNormalizedLinkAsset({
    url: preview.url,
    preview,
  });
  const thumbnailUrl = getNormalizedAssetThumbnailUrl(asset);
  const showThumbnail = variant === 'feed' || Boolean(preview.image?.trim());

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'block',
        mt: variant === 'chat' ? 0 : 1.5,
      }}
    >
      {onDismiss ? (
        <IconButton
          size="small"
          aria-label="Dismiss link preview"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDismiss();
          }}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'action.hover' },
            '&:focus': { bgcolor: 'background.paper' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      ) : null}
      <Link
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        underline="none"
        sx={{ display: 'block' }}
      >
        <Paper
          variant="outlined"
          elevation={0}
          sx={linkPreviewPaperSx(variant)}
        >
          {showThumbnail ? (
            <InlineImageRenderer
              src={thumbnailUrl}
              alt=""
              objectFit="cover"
              sx={linkPreviewImageSx(variant)}
            />
          ) : null}
          <Box
            sx={{ p: variant === 'chat' ? 1.15 : 1.5, flex: 1, minWidth: 0 }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={600}
              sx={{
                color: 'text.primary',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {asset.title || linkPreviewDomain(preview.url)}
            </Typography>
            {asset.description ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.25,
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
              >
                {asset.description}
              </Typography>
            ) : null}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: 'block' }}
            >
              {asset.provider || linkPreviewDomain(preview.url)}
            </Typography>
          </Box>
        </Paper>
      </Link>
    </Box>
  );
};
