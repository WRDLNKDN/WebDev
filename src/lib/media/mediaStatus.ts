import type { NormalizedAsset, NormalizedAssetProcessingState } from './assets';

export type SharedMediaUiStage =
  | 'validating'
  | 'uploading'
  | 'optimizing'
  | 'converting'
  | 'ready'
  | 'failed';

export type MediaStatusDiagnostics = {
  id: string;
  surface?: string | null;
  mimeType?: string | null;
  code?: string | null;
};

export type MediaStatusInput = {
  stage: SharedMediaUiStage;
  message?: string | null;
  retryable?: boolean;
  diagnostics?: MediaStatusDiagnostics | null;
};

export type MediaStatusPresentation = {
  stage: SharedMediaUiStage;
  title: string;
  message: string | null;
  tone: 'info' | 'success' | 'error';
  showSpinner: boolean;
  retryable: boolean;
  diagnosticsLabel: string | null;
  ariaLive: 'polite' | 'assertive';
};

const MEDIA_STAGE_DEFAULTS: Record<
  SharedMediaUiStage,
  Omit<MediaStatusPresentation, 'stage' | 'retryable' | 'diagnosticsLabel'>
> = {
  validating: {
    title: 'Checking file',
    message: 'Making sure this upload is supported before we start.',
    tone: 'info',
    showSpinner: true,
    ariaLive: 'polite',
  },
  uploading: {
    title: 'Uploading media',
    message: 'Saving the original file and its rendering references.',
    tone: 'info',
    showSpinner: true,
    ariaLive: 'polite',
  },
  optimizing: {
    title: 'Optimizing media',
    message:
      'Preparing a lighter display version and preview for faster loading.',
    tone: 'info',
    showSpinner: true,
    ariaLive: 'polite',
  },
  converting: {
    title: 'Converting media',
    message:
      'Generating preview files so this media renders consistently across the product.',
    tone: 'info',
    showSpinner: true,
    ariaLive: 'polite',
  },
  ready: {
    title: 'Media ready',
    message: 'This upload is ready to use.',
    tone: 'success',
    showSpinner: false,
    ariaLive: 'polite',
  },
  failed: {
    title: 'Media failed',
    message:
      "We couldn't finish preparing this media. Try again or keep using the original file.",
    tone: 'error',
    showSpinner: false,
    ariaLive: 'assertive',
  },
};

function cleanLabelPart(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function formatMediaDiagnosticsLabel(
  diagnostics?: MediaStatusDiagnostics | null,
): string | null {
  if (!diagnostics) return null;

  const parts = [
    cleanLabelPart(diagnostics.surface),
    cleanLabelPart(diagnostics.code),
    cleanLabelPart(diagnostics.mimeType),
    cleanLabelPart(diagnostics.id),
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(' • ') : null;
}

export function describeMediaStatus(
  input: MediaStatusInput,
): MediaStatusPresentation {
  const defaults = MEDIA_STAGE_DEFAULTS[input.stage];
  const message = cleanLabelPart(input.message) ?? defaults.message;

  return {
    stage: input.stage,
    title: defaults.title,
    message,
    tone: defaults.tone,
    showSpinner: defaults.showSpinner,
    retryable:
      typeof input.retryable === 'boolean'
        ? input.retryable
        : input.stage === 'failed',
    diagnosticsLabel: formatMediaDiagnosticsLabel(input.diagnostics),
    ariaLive: defaults.ariaLive,
  };
}

export function mapAssetProcessingStateToMediaStage(
  processingState: NormalizedAssetProcessingState,
): SharedMediaUiStage {
  switch (processingState) {
    case 'uploading':
      return 'uploading';
    case 'optimizing':
      return 'optimizing';
    case 'converting':
      return 'converting';
    case 'failed':
      return 'failed';
    default:
      return 'ready';
  }
}

export function normalizedAssetToMediaStatusInput(
  asset: Pick<
    NormalizedAsset,
    'assetId' | 'processingState' | 'mimeType' | 'failureMessage'
  > & { retryable?: boolean | null },
): MediaStatusInput | null {
  if (asset.processingState === 'ready') return null;

  return {
    stage: mapAssetProcessingStateToMediaStage(asset.processingState),
    message: asset.failureMessage ?? null,
    retryable:
      typeof asset.retryable === 'boolean' ? asset.retryable : undefined,
    diagnostics: {
      id: asset.assetId,
      mimeType: asset.mimeType ?? null,
    },
  };
}

export function describeNormalizedAssetStatus(
  asset: Pick<NormalizedAsset, 'assetId' | 'processingState' | 'mimeType'> & {
    failureMessage?: string | null;
    retryable?: boolean | null;
    diagnostics?: MediaStatusDiagnostics | null;
  },
): MediaStatusPresentation | null {
  const input = normalizedAssetToMediaStatusInput(asset);
  if (!input) return null;

  return describeMediaStatus({
    ...input,
    diagnostics: asset.diagnostics ?? input.diagnostics,
    retryable:
      typeof asset.retryable === 'boolean' ? asset.retryable : input.retryable,
  });
}
