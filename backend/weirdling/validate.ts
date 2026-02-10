/**
 * Strict schema validation for Weirdling — reject if mismatched (epic requirement).
 */

export type WeirdlingValidated = {
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
  rawResponse: Record<string, unknown>;
};

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every(isString);
}

const MAX_DISPLAY_NAME = 64;
const MAX_HANDLE = 24;
const MAX_TAGLINE = 200;
const MAX_BOUNDARIES = 500;
const MAX_BIO = 500;

/**
 * Validates raw adapter output against MVP-style schema.
 * Throws with a message if invalid (caller should fail job and log).
 */
export function validateWeirdlingResponse(
  raw: Record<string, unknown>,
): WeirdlingValidated {
  const displayName = raw.displayName;
  if (
    !isString(displayName) ||
    displayName.length === 0 ||
    displayName.length > MAX_DISPLAY_NAME
  ) {
    throw new Error(
      `Invalid displayName: expected string 1-${MAX_DISPLAY_NAME} chars`,
    );
  }

  const handle = raw.handle;
  if (!isString(handle) || handle.length === 0 || handle.length > MAX_HANDLE) {
    throw new Error(`Invalid handle: expected string 1-${MAX_HANDLE} chars`);
  }

  const roleVibe = raw.roleVibe;
  if (!isString(roleVibe)) {
    throw new Error('Invalid roleVibe: expected string');
  }

  const industryTags = raw.industryTags;
  if (!isStringArray(industryTags) || industryTags.length > 20) {
    throw new Error('Invalid industryTags: expected string array (max 20)');
  }

  const tone = raw.tone;
  if (!isNumber(tone) || tone < 0 || tone > 1) {
    throw new Error('Invalid tone: expected number 0-1');
  }

  const tagline = raw.tagline;
  if (
    !isString(tagline) ||
    tagline.length === 0 ||
    tagline.length > MAX_TAGLINE
  ) {
    throw new Error(`Invalid tagline: expected string 1-${MAX_TAGLINE} chars`);
  }

  const boundaries = raw.boundaries;
  if (!isString(boundaries) || boundaries.length > MAX_BOUNDARIES) {
    throw new Error(
      `Invalid boundaries: expected string max ${MAX_BOUNDARIES} chars`,
    );
  }

  let bio: string | undefined;
  if (raw.bio != null) {
    if (!isString(raw.bio)) throw new Error('Invalid bio: expected string');
    bio = raw.bio.slice(0, MAX_BIO);
  }

  let avatarUrl: string | null | undefined;
  if (raw.avatarUrl != null) {
    if (raw.avatarUrl !== null && !isString(raw.avatarUrl)) {
      throw new Error('Invalid avatarUrl: expected string or null');
    }
    avatarUrl = raw.avatarUrl as string | null;
  }

  const promptVersion = raw.promptVersion;
  if (!isString(promptVersion)) {
    throw new Error('Invalid promptVersion: expected string');
  }

  const modelVersion = raw.modelVersion;
  if (!isString(modelVersion)) {
    throw new Error('Invalid modelVersion: expected string');
  }

  return {
    displayName: displayName.trim(),
    handle: handle.trim().toLowerCase(),
    roleVibe: roleVibe.trim(),
    industryTags: industryTags
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10),
    tone,
    tagline: tagline.trim(),
    boundaries: boundaries.trim(),
    bio: bio?.trim() || undefined,
    avatarUrl,
    promptVersion,
    modelVersion,
    rawResponse: raw,
  };
}
