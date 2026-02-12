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
 * Build a short "generated" tagline from role + interests + tone.
 * Makes Create-one feel like it produced something distinct.
 */
function buildTagline(input: WeirdlingGenerateInput): string {
  if (input.bioSeed && input.bioSeed.trim().length > 0) {
    return input.bioSeed.trim().slice(0, 200);
  }
  const parts: string[] = [input.roleVibe];
  const interests = input.industryOrInterests.slice(0, 3).filter(Boolean);
  if (interests.length > 0) {
    parts.push(interests.join(', '));
  }
  const toneLabel =
    input.tone < 0.33 ? 'serious' : input.tone > 0.66 ? 'absurd' : 'balanced';
  parts.push(toneLabel);
  return parts.join(' • ').slice(0, 200);
}

/**
 * Build a one-line "generated" bio from name, role, interests, tone.
 */
function buildBio(input: WeirdlingGenerateInput, _handle: string): string {
  const name =
    input.displayNameOrHandle.trim().slice(0, 64) || 'This Weirdling';
  const role = input.roleVibe;
  const interests = input.industryOrInterests.slice(0, 3).filter(Boolean);
  const interestPhrase =
    interests.length > 0 ? ` into ${interests.join(', ')}` : '';
  const tonePhrase =
    input.tone < 0.33
      ? ' Keeps it professional.'
      : input.tone > 0.66
        ? ' Leans into the chaos.'
        : ' Mix of focus and fun.';
  return `${name} is a ${role}${interestPhrase}.${tonePhrase}`.slice(0, 500);
}

/**
 * Mock adapter: returns structured output using existing public/assets Weirdling images.
 * "Generates" tagline and bio from inputs so Create-one produces distinct content.
 * When includeImage is true, picks one of weirdling_1..N by handle+roleVibe.
 * Replace with real LLM/image API when provider is chosen.
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
    const displayName =
      input.displayNameOrHandle.trim().slice(0, 64) || 'Weirdling';
    const tagline = buildTagline(input);
    const bio = buildBio(input, handle);

    const imageIndex = weirdlingAssetIndex(handle, input.roleVibe);
    const avatarUrl = input.includeImage
      ? `/assets/og_weirdlings/weirdling_${imageIndex + 1}.png`
      : null;

    const rawResponse = {
      displayName,
      handle,
      roleVibe: input.roleVibe,
      industryTags: input.industryOrInterests.slice(0, 10),
      tone: input.tone,
      tagline,
      boundaries: input.boundaries.slice(0, 500),
      bio,
      avatarUrl,
      promptVersion: input.promptVersion,
      modelVersion: MODEL_VERSION,
    };

    return {
      ...rawResponse,
      modelVersion: MODEL_VERSION,
      rawResponse,
    };
  },
};

export function getPromptVersion(): string {
  return PROMPT_VERSION;
}

export function getModelVersion(): string {
  return MODEL_VERSION;
}
