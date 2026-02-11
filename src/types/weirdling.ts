/**
 * Weirdling types — aligned to epic wizard and MVP-style persistence.
 * Final schema should match MVP models in Drive when reviewed.
 */

/** Number of Weirdling image assets in public/assets/og_weirdlings (weirdling_1.png … weirdling_N.png). Single source of truth. */
export const WEIRDLING_ASSET_COUNT = 6;

export type WeirdlingWizardInputs = {
  displayNameOrHandle: string;
  roleVibe: string;
  industryOrInterests: string[];
  tone: number; // 0 = serious, 1 = absurd
  boundaries: string;
  bioSeed?: string;
  includeImage?: boolean;
  /** When includeImage is true, which asset to use (1..WEIRDLING_ASSET_COUNT). */
  selectedImageIndex?: number;
};

export type WeirdlingPreview = {
  displayName: string;
  handle: string;
  roleVibe: string;
  industryTags: string[];
  tone: number;
  tagline: string;
  boundaries: string;
  bio?: string;
  avatarUrl?: string | null;
  promptVersion: string;
  modelVersion: string;
};

export type Weirdling = WeirdlingPreview & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  rawAiResponse?: Record<string, unknown> | null;
};

export type GenerationJobStatus = 'queued' | 'running' | 'complete' | 'failed';

export type GenerationJob = {
  id: string;
  userId: string;
  status: GenerationJobStatus;
  idempotencyKey: string | null;
  rawResponse: Record<string, unknown> | null;
  errorMessage: string | null;
  promptVersion: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
};
