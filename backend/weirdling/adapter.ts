/**
 * AI provider adapter for Weirdling generation.
 * Swap implementations without changing controller logic.
 */
import { WEIRDLING_ASSET_COUNT } from '../../src/types/weirdling.js';

export type WeirdlingGenerateInput = {
  displayNameOrHandle: string;
  roleVibe: string;
  industryOrInterests: string[];
  tone: number;
  boundaries: string;
  bioSeed?: string;
  includeImage?: boolean;
  promptVersion: string;
};

export type WeirdlingGenerateResult = {
  displayName: string;
  handle: string;
  roleVibe: string;
  industryTags: string[];
  tone: number;
  tagline: string;
  boundaries: string;
  bio?: string;
  avatarUrl?: string | null;
  modelVersion: string;
  rawResponse: Record<string, unknown>;
};

export type WeirdlingAdapter = {
  generate(input: WeirdlingGenerateInput): Promise<WeirdlingGenerateResult>;
};

const PROMPT_VERSION = 'v1';
const MODEL_VERSION = 'mock';

/**
 * Deterministic index 0..WEIRDLING_ASSET_COUNT-1 from handle + roleVibe.
 * Same persona always gets the same image; different combos get variety.
 */
function weirdlingAssetIndex(handle: string, roleVibe: string): number {
  const seed = `${handle}|${roleVibe}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % WEIRDLING_ASSET_COUNT;
}

/**
 * Mock adapter: returns structured output using existing public/assets Weirdling images.
 * When includeImage is true, picks one of weirdling_1..N (N = WEIRDLING_ASSET_COUNT) by handle+roleVibe.
 * Replace with real image generation (e.g. DALL·E, Replicate) when provider is chosen.
 */
export const mockWeirdlingAdapter: WeirdlingAdapter = {
  async generate(
    input: WeirdlingGenerateInput,
  ): Promise<WeirdlingGenerateResult> {
    const handle =
      input.displayNameOrHandle
        .replace(/\s+/g, '')
        .toLowerCase()
        .slice(0, 24) || 'weirdling';
    const tagline = input.bioSeed
      ? `${input.bioSeed.slice(0, 80)}…`
      : `${input.roleVibe} • ${input.industryOrInterests.slice(0, 2).join(', ')}`;

    const imageIndex = weirdlingAssetIndex(handle, input.roleVibe);
    const avatarUrl = input.includeImage
      ? `/assets/og_weirdlings/weirdling_${imageIndex + 1}.png`
      : null;

    return {
      displayName: input.displayNameOrHandle.slice(0, 64) || 'Weirdling',
      handle,
      roleVibe: input.roleVibe,
      industryTags: input.industryOrInterests.slice(0, 10),
      tone: input.tone,
      tagline: tagline.slice(0, 200),
      boundaries: input.boundaries.slice(0, 500),
      bio: input.bioSeed?.slice(0, 500),
      avatarUrl,
      modelVersion: MODEL_VERSION,
      rawResponse: {
        displayName: input.displayNameOrHandle.slice(0, 64) || 'Weirdling',
        handle,
        roleVibe: input.roleVibe,
        industryTags: input.industryOrInterests.slice(0, 10),
        tone: input.tone,
        tagline: tagline.slice(0, 200),
        boundaries: input.boundaries.slice(0, 500),
        bio: input.bioSeed?.slice(0, 500),
        avatarUrl,
        modelVersion: MODEL_VERSION,
      },
    };
  },
};

export function getPromptVersion(): string {
  return PROMPT_VERSION;
}

export function getModelVersion(): string {
  return MODEL_VERSION;
}
