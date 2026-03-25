/**
 * Replicate adapter for AI Weirdling image generation.
 * Stable Diffusion via Replicate API; output 512×512. Cost-optimized.
 */

const REPLICATE_API_BASE = 'https://api.replicate.com/v1';
const SD_VERSION =
  '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
const POLL_INTERVAL_MS = 1000;
const PREDICTION_TIMEOUT_MS = 120_000;

function buildWeirdlingPrompt(input) {
  const parts = [
    'Voxel art style',
    'cute character',
    input.roleVibe || 'creative',
  ];
  const interests = (input.industryOrInterests ?? [])
    .slice(0, 3)
    .filter(Boolean);
  if (interests.length > 0) parts.push(interests.join(', '));
  parts.push('avatar portrait');
  parts.push('512x512');
  return parts.join(', ');
}

async function pollPrediction(token, predictionId) {
  const started = Date.now();
  for (;;) {
    if (Date.now() - started > PREDICTION_TIMEOUT_MS) {
      return { error: 'Image generation timed out. Please try again.' };
    }
    const res = await fetch(
      `${REPLICATE_API_BASE}/predictions/${predictionId}`,
      { headers: { Authorization: `Token ${token}` } },
    );
    if (!res.ok) {
      const text = await res.text();
      return {
        error: `Replicate API error: ${res.status} ${text.slice(0, 100)}`,
      };
    }
    const data = await res.json();
    if (data.status === 'succeeded') {
      const out = Array.isArray(data.output)
        ? data.output
        : typeof data.output === 'string'
          ? [data.output]
          : [];
      return { output: out };
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      return { error: data.error || 'Image generation failed.' };
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

/**
 * @param {string} token - REPLICATE_API_TOKEN
 * @returns {import('./adapter.js').WeirdlingAdapter}
 */
export function createReplicateAdapter(token) {
  return {
    async generate(input) {
      const handle =
        (input.displayNameOrHandle ?? '')
          .replace(/\s+/g, '')
          .toLowerCase()
          .slice(0, 24) || 'weirdling';
      const displayName =
        (input.displayNameOrHandle ?? '').trim().slice(0, 64) || 'Weirdling';
      const tagline = [
        input.roleVibe,
        ...(input.industryOrInterests ?? []).slice(0, 2),
      ]
        .join(' • ')
        .slice(0, 200);
      const bio = `${displayName} is a ${input.roleVibe}.`.slice(0, 500);

      let avatarUrl;
      if (input.includeImage) {
        const prompt = buildWeirdlingPrompt(input);
        const createRes = await fetch(`${REPLICATE_API_BASE}/predictions`, {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: SD_VERSION,
            input: { prompt, num_outputs: 1 },
          }),
        });
        if (!createRes.ok) {
          const errText = await createRes.text();
          throw new Error(
            `Replicate create failed: ${createRes.status} ${errText.slice(0, 150)}`,
          );
        }
        const pred = await createRes.json();
        const { output, error: pollError } = await pollPrediction(
          token,
          pred.id,
        );
        if (pollError) throw new Error(pollError);
        avatarUrl = output?.[0] ?? null;
      } else {
        const WEIRDLING_ASSET_COUNT = 7;
        const seed = `${handle}|${input.roleVibe ?? ''}`;
        let h = 0;
        for (let i = 0; i < seed.length; i++) {
          h = (h * 31 + seed.charCodeAt(i)) >>> 0;
        }
        const imageIndex = h % WEIRDLING_ASSET_COUNT;
        avatarUrl = `/assets/og_weirdlings/weirdling_${imageIndex + 1}.png`;
      }

      const rawResponse = {
        displayName,
        handle,
        roleVibe: input.roleVibe,
        industryTags: (input.industryOrInterests ?? []).slice(0, 10),
        tone: input.tone,
        tagline,
        boundaries: (input.boundaries ?? '').slice(0, 500),
        bio,
        avatarUrl,
        promptVersion: input.promptVersion,
        modelVersion: 'replicate-sd',
      };

      return {
        ...rawResponse,
        modelVersion: 'replicate-sd',
        rawResponse,
      };
    },
  };
}
