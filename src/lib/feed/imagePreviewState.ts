export type ImagePreviewState = {
  url: string | null;
  loading: boolean;
  error: string | null;
};

export function createClosedImagePreviewState(): ImagePreviewState {
  return {
    url: null,
    loading: false,
    error: null,
  };
}

export function createOpeningImagePreviewState(url: string): ImagePreviewState {
  return {
    url,
    loading: true,
    error: null,
  };
}

export function reduceImagePreviewLoaded(
  state: ImagePreviewState,
): ImagePreviewState {
  if (!state.url) return state;
  return {
    ...state,
    loading: false,
    error: null,
  };
}

export function reduceImagePreviewErrored(
  state: ImagePreviewState,
  reason = 'load_failed',
): ImagePreviewState {
  if (!state.url) return state;
  return {
    ...state,
    loading: false,
    error: reason,
  };
}

export function getWrappedPreviewIndex(
  currentIndex: number,
  direction: 'next' | 'previous',
  total: number,
): number {
  if (
    total <= 0 ||
    currentIndex < 0 ||
    !Number.isInteger(currentIndex) ||
    currentIndex >= total
  ) {
    return -1;
  }
  if (direction === 'next') {
    return (currentIndex + 1) % total;
  }
  return (currentIndex - 1 + total) % total;
}
