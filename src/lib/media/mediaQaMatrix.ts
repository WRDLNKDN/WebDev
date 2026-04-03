export type MediaSyntheticCheck = {
  id: string;
  label: string;
  coverage: 'unit' | 'integration' | 'e2e';
  surfaces: string[];
  regression?: string | null;
  reference: string;
};

export type MediaValidationMatrixRow = {
  platform: string;
  browser: string;
  viewport: string;
  surfaces: string[];
  automation: 'Automated' | 'Manual follow-up';
  notes: string;
};

export const MEDIA_REGRESSION_GUARDS = [
  {
    id: 'gif-picker-initial-failure',
    label: 'GIF picker does not open in an immediate failed state.',
    coveredBy: [
      'src/tests/chat/GifPickerDialog.test.tsx',
      'src/tests/e2e/media/media-platform-smoke.spec.ts',
    ],
  },
  {
    id: 'inline-media-clipping',
    label: 'Inline media preserves aspect ratio without default clipping.',
    coveredBy: [
      'src/tests/media/AssetRenderers.test.tsx',
      'src/tests/e2e/media/media-platform-smoke.spec.ts',
    ],
  },
] as const;

export const MEDIA_SYNTHETIC_CHECKS: MediaSyntheticCheck[] = [
  {
    id: 'media-upload-intake',
    label:
      'Shared upload intake emits consistent stages and duplicate protection.',
    coverage: 'unit',
    surfaces: ['Feed', 'Chat', 'Profile', 'Portfolio', 'Groups'],
    reference: 'src/tests/media/uploadIntake.test.ts',
  },
  {
    id: 'gif-picker-regression',
    label:
      'Shared GIF picker recovers from failed trending fetch and keeps clutter hidden.',
    coverage: 'unit',
    surfaces: ['Feed', 'Chat'],
    regression: 'gif-picker-initial-failure',
    reference: 'src/tests/chat/GifPickerDialog.test.tsx',
  },
  {
    id: 'shared-renderers-layout',
    label:
      'Shared renderer respects derivative URLs and surface max-height rules.',
    coverage: 'unit',
    surfaces: ['Feed', 'Chat', 'Profile', 'Portfolio', 'Groups'],
    regression: 'inline-media-clipping',
    reference: 'src/tests/media/AssetRenderers.test.tsx',
  },
  {
    id: 'media-platform-smoke',
    label: 'Synthetic smoke route checks shared media on the groups surface.',
    coverage: 'e2e',
    surfaces: ['Groups'],
    reference: 'src/tests/e2e/media/media-platform-smoke.spec.ts',
  },
  {
    id: 'chat-file-upload',
    label: 'Chat attachment upload and GIF acceptance remain stable.',
    coverage: 'e2e',
    surfaces: ['Chat'],
    reference: 'src/tests/e2e/chat/chat-file-upload.spec.ts',
  },
  {
    id: 'portfolio-resume-preview',
    label:
      'Portfolio document preview fallback and open/download behavior remain stable.',
    coverage: 'e2e',
    surfaces: ['Profile', 'Portfolio'],
    reference: 'src/tests/e2e/portfolio/portfolio-resume-preview.spec.ts',
  },
] as const;

export const MEDIA_VALIDATION_MATRIX: MediaValidationMatrixRow[] = [
  {
    platform: 'Desktop',
    browser: 'Chromium',
    viewport: '1280x900',
    surfaces: ['Feed', 'Chat', 'Portfolio', 'Groups'],
    automation: 'Automated',
    notes: 'Primary synthetic smoke and shared renderer regressions run here.',
  },
  {
    platform: 'Desktop',
    browser: 'Firefox',
    viewport: '1280x900',
    surfaces: ['Feed', 'Chat', 'Portfolio'],
    automation: 'Manual follow-up',
    notes:
      'Use for modal, GIF, and media sizing sanity checks before wider rollout.',
  },
  {
    platform: 'Desktop',
    browser: 'WebKit',
    viewport: '1280x900',
    surfaces: ['Feed', 'Profile', 'Portfolio'],
    automation: 'Manual follow-up',
    notes:
      'Verify image containment, video autoplay-muted behavior, and downloads.',
  },
  {
    platform: 'Mobile',
    browser: 'Chromium Android',
    viewport: '390x844',
    surfaces: ['Feed', 'Chat', 'Groups'],
    automation: 'Manual follow-up',
    notes:
      'Validate portrait media readability, GIF picker open state, and attachment taps.',
  },
  {
    platform: 'Mobile',
    browser: 'Safari iOS',
    viewport: '390x844',
    surfaces: ['Feed', 'Chat', 'Portfolio'],
    automation: 'Manual follow-up',
    notes:
      'Validate document open/download behavior and inline media containment.',
  },
] as const;
