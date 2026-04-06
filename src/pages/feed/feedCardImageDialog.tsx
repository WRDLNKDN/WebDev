import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  type ImagePreviewState,
  reduceImagePreviewErrored,
  reduceImagePreviewLoaded,
} from '../../lib/feed/imagePreviewState';
import { InlineImageRenderer } from '../../components/media/AssetThumbnail';

type PreviewableImage = { url: string; source: 'body_gif' | 'post_attachment' };

type FeedCardImageDialogProps = {
  imageLightboxUrl: string | null;
  closeImageLightbox: () => void;
  previewableImages: PreviewableImage[];
  imageTouchStartXRef: MutableRefObject<number | null>;
  handlePreviewNext: () => void;
  handlePreviewPrevious: () => void;
  imagePreviewState: ImagePreviewState;
  setImagePreviewState: Dispatch<SetStateAction<ImagePreviewState>>;
  currentPreviewIndex: number;
};

export const FeedCardImageDialog = ({
  imageLightboxUrl,
  closeImageLightbox,
  previewableImages,
  imageTouchStartXRef,
  handlePreviewNext,
  handlePreviewPrevious,
  imagePreviewState,
  setImagePreviewState,
  currentPreviewIndex,
}: FeedCardImageDialogProps) => (
  <Dialog
    open={Boolean(imageLightboxUrl)}
    onClose={closeImageLightbox}
    maxWidth="lg"
    fullWidth
  >
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
      Image preview
      <Box sx={{ flex: 1 }} />
      <IconButton
        size="small"
        edge="end"
        onClick={closeImageLightbox}
        aria-label="Close image preview"
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
    <DialogContent
      dividers
      sx={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        p: { xs: 1, sm: 2 },
      }}
    >
      {imageLightboxUrl ? (
        <Box
          sx={{
            width: '100%',
            minHeight: 160,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
          onTouchStart={(event) => {
            imageTouchStartXRef.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (previewableImages.length <= 1) return;
            const startX = imageTouchStartXRef.current;
            const endX = event.changedTouches[0]?.clientX ?? null;
            imageTouchStartXRef.current = null;
            if (startX === null || endX === null) return;
            const deltaX = startX - endX;
            if (Math.abs(deltaX) < 40) return;
            if (deltaX > 0) handlePreviewNext();
            else handlePreviewPrevious();
          }}
        >
          {previewableImages.length > 1 && (
            <>
              <IconButton
                onClick={handlePreviewPrevious}
                aria-label="Previous image"
                sx={{ position: 'absolute', left: 8, zIndex: 1 }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                onClick={handlePreviewNext}
                aria-label="Next image"
                sx={{ position: 'absolute', right: 8, zIndex: 1 }}
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          )}
          {imagePreviewState.error ? (
            <Typography variant="body2" color="text.secondary">
              Unable to load image preview.
            </Typography>
          ) : (
            <>
              {imagePreviewState.loading && <CircularProgress size={28} />}
              <InlineImageRenderer
                src={imageLightboxUrl}
                alt="Full-screen post image"
                sizing="natural"
                sx={{
                  display: imagePreviewState.loading ? 'none' : 'block',
                  width: '100%',
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: 1,
                }}
                onLoad={() =>
                  setImagePreviewState((prev) => reduceImagePreviewLoaded(prev))
                }
                onError={() =>
                  setImagePreviewState((prev) =>
                    reduceImagePreviewErrored(prev),
                  )
                }
              />
            </>
          )}
        </Box>
      ) : null}
      {imageLightboxUrl && (
        <Button
          component="a"
          href={imageLightboxUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="text"
          startIcon={<OpenInNewIcon />}
          sx={{ position: 'absolute', bottom: 4, left: 8, minWidth: 0 }}
        >
          Open original
        </Button>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {currentPreviewIndex >= 0 ? currentPreviewIndex + 1 : 0}/
        {previewableImages.length || 0}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ position: 'absolute', bottom: 8, right: 12 }}
      >
        Press Esc to close
      </Typography>
    </DialogContent>
  </Dialog>
);
