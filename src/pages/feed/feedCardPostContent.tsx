import { Box, Button, Stack, TextField, Typography } from '@mui/material';
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
  <Box sx={{ pb: 1.25 }}>
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
                mt: 0.5,
                lineHeight: 1.65,
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openImageLightbox(gifUrl, 'body_gif');
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="View image full screen"
              sx={{
                mt: 1,
                width: '100%',
                maxWidth: { xs: '100%', sm: 360, md: 420 },
                cursor: 'zoom-in',
              }}
            >
              <AssetInlinePreview
                asset={createNormalizedGifAsset({
                  url: gifUrl,
                  surface: 'feed',
                })}
                alt=""
                surface="feed"
                sx={{
                  borderRadius: 1,
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
      <LinkPreviewCard preview={linkPreview} onDismiss={onDismissLinkPreview} />
    )}
    {postAttachmentAssets.length > 0 && (
      <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }} flexWrap="wrap">
        {postAttachmentAssets.map((asset) => {
          const openUrl = getNormalizedAssetDisplayUrl(asset);
          return (
            <Box
              key={asset.assetId}
              onClick={() => openImageLightbox(openUrl, 'post_attachment')}
              onKeyDown={(e) => {
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
                maxWidth: { xs: '100%', sm: 360, md: 420 },
                cursor: 'zoom-in',
              }}
            >
              <AssetInlinePreview
                asset={asset}
                alt=""
                surface="feed"
                sx={{
                  borderRadius: 1,
                }}
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
