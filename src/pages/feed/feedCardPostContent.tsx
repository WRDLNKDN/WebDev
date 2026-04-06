import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AssetInlinePreview } from '../../components/media/AssetThumbnail';
import {
  createNormalizedGifAsset,
  getNormalizedAssetDisplayUrl,
  type NormalizedAsset,
} from '../../lib/media/assets';
import {
  LinkPreviewCard,
  linkifyBody,
  type LinkPreviewPayload,
} from './feedRenderUtils';
import { feedMediaBleedSx, feedMediaFlushRadiusSx } from './feedPostLayout';

type FeedCardPostContentProps = {
  isEditingPost: boolean;
  editPostDraft: string;
  setEditPostDraft: (value: string) => void;
  handleSavePostEdit: () => void | Promise<void>;
  savingPostEdit: boolean;
  setIsEditingPost: (value: boolean) => void;
  body: string;
  bodyTextWithoutGifUrls: string;
  bodyGifUrls: string[];
  openImageLightbox: (
    urlToOpen: string,
    source: 'body_gif' | 'post_attachment',
    trackAction?: 'open' | 'navigate',
  ) => void;
  linkPreview?: LinkPreviewPayload;
  isLinkPreviewDismissed: boolean;
  onDismissLinkPreview: () => void;
  postAttachmentAssets: readonly NormalizedAsset[];
  url: string | null;
  label: string | null;
};

export const FeedCardPostContent = ({
  isEditingPost,
  editPostDraft,
  setEditPostDraft,
  handleSavePostEdit,
  savingPostEdit,
  setIsEditingPost,
  body,
  bodyTextWithoutGifUrls,
  bodyGifUrls,
  openImageLightbox,
  linkPreview,
  isLinkPreviewDismissed,
  onDismissLinkPreview,
  postAttachmentAssets,
  url,
  label,
}: FeedCardPostContentProps) => (
  <Box sx={{ pb: 0.5 }}>
    {isEditingPost ? (
      <Stack spacing={1} sx={{ mt: 1 }}>
        <TextField
          value={editPostDraft}
          onChange={(e) => setEditPostDraft(e.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            onClick={() => void handleSavePostEdit()}
            disabled={!editPostDraft.trim() || savingPostEdit}
          >
            Save
          </Button>
          <Button
            size="small"
            onClick={() => {
              setIsEditingPost(false);
              setEditPostDraft(body);
            }}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    ) : (
      (bodyTextWithoutGifUrls || bodyGifUrls.length > 0) && (
        <>
          {bodyTextWithoutGifUrls && (
            <Typography
              variant="body1"
              component="span"
              sx={{
                mt: 0.25,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                display: 'block',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {linkifyBody(bodyTextWithoutGifUrls)}
            </Typography>
          )}
          {bodyGifUrls.map((gifUrl) => (
            <Box
              key={gifUrl}
              onClick={() => openImageLightbox(gifUrl, 'body_gif')}
              onKeyDown={(e: ReactKeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openImageLightbox(gifUrl, 'body_gif');
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="View image full screen"
              sx={(theme) => ({
                ...feedMediaBleedSx(theme),
                mt: 0.5,
                minWidth: 0,
                cursor: 'zoom-in',
              })}
            >
              <AssetInlinePreview
                asset={createNormalizedGifAsset({
                  url: gifUrl,
                  surface: 'feed',
                })}
                alt=""
                surface="feed"
                sx={{
                  ...feedMediaFlushRadiusSx,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'rgba(0,0,0,0.18)',
                }}
              />
            </Box>
          ))}
        </>
      )
    )}
    {linkPreview?.url && !isLinkPreviewDismissed && (
      <Box
        sx={(theme) => ({
          ...feedMediaBleedSx(theme),
          mt: 0.75,
          minWidth: 0,
        })}
      >
        <LinkPreviewCard
          preview={linkPreview}
          onDismiss={onDismissLinkPreview}
          flushTop
        />
      </Box>
    )}
    {postAttachmentAssets.length > 0 && (
      <Stack
        spacing={0.5}
        sx={(theme) => ({
          ...feedMediaBleedSx(theme),
          mt: 0.75,
          minWidth: 0,
        })}
      >
        {postAttachmentAssets.map((asset) => {
          const openUrl = getNormalizedAssetDisplayUrl(asset);
          return (
            <Box
              key={asset.assetId}
              onClick={() => openImageLightbox(openUrl, 'post_attachment')}
              onKeyDown={(e: ReactKeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openImageLightbox(openUrl, 'post_attachment');
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="View image full screen"
              sx={{
                width: '100%',
                minWidth: 0,
                cursor: 'zoom-in',
              }}
            >
              <AssetInlinePreview
                asset={asset}
                alt=""
                surface="feed"
                sx={feedMediaFlushRadiusSx}
              />
            </Box>
          );
        })}
      </Stack>
    )}
    {url && (
      <Typography
        variant="body2"
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ mt: 0.5, color: 'primary.main', display: 'block' }}
      >
        {label || url}
      </Typography>
    )}
  </Box>
);
