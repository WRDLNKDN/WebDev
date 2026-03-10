import { Box, Button, Stack, TextField, Typography } from '@mui/material';
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
  postAttachmentImages: string[];
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
  postAttachmentImages,
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
              component="img"
              src={gifUrl}
              alt=""
              loading="lazy"
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
                maxWidth: 320,
                width: '100%',
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'zoom-in',
              }}
            />
          ))}
        </>
      )
    )}
    {linkPreview?.url && !isLinkPreviewDismissed && (
      <LinkPreviewCard preview={linkPreview} onDismiss={onDismissLinkPreview} />
    )}
    {postAttachmentImages.length > 0 && (
      <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }} flexWrap="wrap">
        {postAttachmentImages.map((imgUrl) => (
          <Box
            key={imgUrl}
            component="img"
            src={imgUrl}
            alt=""
            onClick={() => openImageLightbox(imgUrl, 'post_attachment')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openImageLightbox(imgUrl, 'post_attachment');
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="View image full screen"
            sx={{
              maxWidth: 280,
              maxHeight: 280,
              objectFit: 'cover',
              borderRadius: 1,
              cursor: 'zoom-in',
            }}
          />
        ))}
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
