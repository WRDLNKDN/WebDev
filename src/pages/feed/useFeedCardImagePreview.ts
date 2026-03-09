import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '../../lib/analytics/trackEvent';
import {
  createClosedImagePreviewState,
  createOpeningImagePreviewState,
  getWrappedPreviewIndex,
} from '../../lib/feed/imagePreviewState';
import type { PreviewImageSource } from './feedCardTypes';

type PreviewableImage = { url: string; source: PreviewImageSource };

export const useFeedCardImagePreview = (
  postId: string,
  previewableImages: PreviewableImage[],
) => {
  const [imagePreviewState, setImagePreviewState] = useState(
    createClosedImagePreviewState,
  );
  const imageTouchStartXRef = useRef<number | null>(null);
  const imageLightboxUrl = imagePreviewState.url;
  const currentPreviewIndex = useMemo(
    () =>
      imageLightboxUrl
        ? previewableImages.findIndex((img) => img.url === imageLightboxUrl)
        : -1,
    [imageLightboxUrl, previewableImages],
  );

  const openImageLightbox = useCallback(
    (
      urlToOpen: string,
      source: PreviewImageSource,
      trackAction: 'open' | 'navigate' = 'open',
    ) => {
      setImagePreviewState(createOpeningImagePreviewState(urlToOpen));
      if (trackAction === 'open') {
        trackEvent('feed_image_preview_opened', {
          source: 'feed',
          post_id: postId,
          media_source: source,
          media_url: urlToOpen,
        });
      }
    },
    [postId],
  );

  const openImageByIndex = useCallback(
    (index: number) => {
      const next = previewableImages[index];
      if (!next) return;
      openImageLightbox(next.url, next.source, 'navigate');
    },
    [openImageLightbox, previewableImages],
  );

  const handlePreviewPrevious = useCallback(() => {
    if (previewableImages.length <= 1 || currentPreviewIndex < 0) return;
    const nextIndex = getWrappedPreviewIndex(
      currentPreviewIndex,
      'previous',
      previewableImages.length,
    );
    if (nextIndex < 0) return;
    openImageByIndex(nextIndex);
  }, [currentPreviewIndex, openImageByIndex, previewableImages.length]);

  const handlePreviewNext = useCallback(() => {
    if (previewableImages.length <= 1 || currentPreviewIndex < 0) return;
    const nextIndex = getWrappedPreviewIndex(
      currentPreviewIndex,
      'next',
      previewableImages.length,
    );
    if (nextIndex < 0) return;
    openImageByIndex(nextIndex);
  }, [currentPreviewIndex, openImageByIndex, previewableImages.length]);

  const closeImageLightbox = useCallback(() => {
    if (imageLightboxUrl) {
      trackEvent('feed_image_preview_closed', {
        source: 'feed',
        post_id: postId,
        media_url: imageLightboxUrl,
      });
    }
    setImagePreviewState(createClosedImagePreviewState());
  }, [imageLightboxUrl, postId]);

  useEffect(() => {
    if (!imageLightboxUrl) return;
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;
    const prevBodyOverscrollBehavior = body.style.overscrollBehavior;
    const prevHtmlOverscrollBehavior = documentElement.style.overscrollBehavior;
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    body.style.overscrollBehavior = 'none';
    documentElement.style.overscrollBehavior = 'none';
    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
      body.style.overscrollBehavior = prevBodyOverscrollBehavior;
      documentElement.style.overscrollBehavior = prevHtmlOverscrollBehavior;
    };
  }, [imageLightboxUrl]);

  useEffect(() => {
    if (!imageLightboxUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePreviewPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handlePreviewNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePreviewNext, handlePreviewPrevious, imageLightboxUrl]);

  return {
    imagePreviewState,
    setImagePreviewState,
    imageTouchStartXRef,
    imageLightboxUrl,
    currentPreviewIndex,
    openImageLightbox,
    handlePreviewPrevious,
    handlePreviewNext,
    closeImageLightbox,
  };
};
