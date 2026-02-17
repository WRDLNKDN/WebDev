/* eslint-disable */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ----------------------------------------------------------------------------
// 🧬 CONFIGURATION: THE DNA VAULT (BRANCH SWAPPING)
// ----------------------------------------------------------------------------

// [PRODUCTION] - The Main Branch
// const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/WRDLNKDN/WebDev/main/src/components/avatar';

// [DEVELOPMENT] - The MVP Feature Branch
const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/WRDLNKDN/WebDev/feat/MVPAvatarSystem/src/components/avatar';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ----------------------------------------------------------------------------
// 🧠 HELPER: THE SYNAPSE (DYNAMIC FETCH PROTOCOL)
// ----------------------------------------------------------------------------
async function fetchHiveMind(instructionFile: string) {
  try {
    const [manifestRes, instructionsRes] = await Promise.all([
      fetch(`${GITHUB_RAW_BASE}/prompt/manifest.json`),
      fetch(`${GITHUB_RAW_BASE}/prompt/${instructionFile}`),
    ]);

    if (!manifestRes.ok || !instructionsRes.ok) {
      throw new Error(
        `Failed to fetch DNA. Manifest: ${manifestRes.status}, Instructions: ${instructionsRes.status}`,
      );
    }

    const manifest = await manifestRes.json();
    const instructions = await instructionsRes.text();

    return { manifest, instructions };
  } catch (error) {
    console.error('Critical System Failure fetching DNA:', error);
    return {
      manifest: null,
      instructions:
        'Style: Voxel art, cute, blocky. Context: Weirdling avatar.',
    };
  }
}

interface WeirdlingInputs {
  primaryColor?: string;
  heldObject?: string;
  hairStyle?: string;
  hairColor?: string;
  persona?: string;
  interests?: string[];
  userName?: string;
  preset?: string;
}

// ----------------------------------------------------------------------------
// 🥣 THE WEIRDLING SOUP REGISTRY (DUAL-CORE)
// ----------------------------------------------------------------------------
const WEIRDLING_RECIPES: Record<
  string,
  (inputs: WeirdlingInputs) => Promise<string>
> = {
  // RECIPE 1: The Streamlined Protocol
  voxel_simple: async (inputs: WeirdlingInputs) => {
    const { manifest, instructions } = await fetchHiveMind(
      'instructions_simple.md',
    );
    return buildPrompt(inputs, manifest, instructions);
  },

  // RECIPE 2: The High-Entropy Protocol
  voxel_complex: async (inputs: WeirdlingInputs) => {
    const { manifest, instructions } = await fetchHiveMind(
      'instructions_complex.md',
    );
    return buildPrompt(inputs, manifest, instructions);
  },

  // LEGACY FALLBACK
  voxel_v1: async (inputs: WeirdlingInputs) => {
    const { manifest, instructions } = await fetchHiveMind(
      'instructions_simple.md',
    );
    return buildPrompt(inputs, manifest, instructions);
  },
};

// --- PROMPT COMPILER ---
function buildPrompt(
  inputs: WeirdlingInputs,
  manifest: any,
  instructions: string,
) {
  let visualDNA = '';

  // 1. Check for Visual SNPs (Blind Protocol)
  if (inputs.preset && manifest?.presets?.[inputs.preset]) {
    const dnaSequence =
      manifest.presets[inputs.preset].hash_sequence.join(', ');
    visualDNA = `Base DNA Sequence: ${dnaSequence}. `;
  }

  // 2. Construct the Core Prompt
  let prompt = `Create a 3D voxel character. `;
  if (visualDNA) prompt += `STRICTLY FOLLOW THIS DNA: ${visualDNA} `;

  prompt += `Primary color: ${inputs.primaryColor || 'green'}. `;

  if (inputs.heldObject && inputs.heldObject.toLowerCase() !== 'none') {
    prompt += `Holding: ${inputs.heldObject}. `;
  }
  if (inputs.hairStyle && inputs.hairStyle.toLowerCase() !== 'none') {
    prompt += `Hair: ${inputs.hairStyle} (${inputs.hairColor}). `;
  }

  const persona = inputs.persona || 'box';
  prompt += `Character Base: ${persona}. `;

  if (inputs.interests?.length) {
    prompt += `Visual traits reflecting: ${inputs.interests.join(', ')}. `;
  }

  // 3. Inject the External Intelligence
  prompt += `\n\nSTYLE GUIDE (STRICT ADHERENCE): \n${instructions}`;

  const systemPrompt =
    'Positive Tags: 3D voxel art, pixel art, isometric view. Negative Constraints: NO photorealism, NO human skin texture.';

  return `${prompt} ${systemPrompt}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WeirdlingInputs & { recipeId?: string } = await req.json();
    const { persona, userName, recipeId } = payload;

    // 1. SELECT RECIPE & AWAIT EXECUTION
    const id =
      recipeId && WEIRDLING_RECIPES[recipeId] ? recipeId : 'voxel_simple';
    const finalPrompt = await WEIRDLING_RECIPES[id](payload);

    // 2. THE NAMING ENGINE
    const baseName = userName ? userName.trim() : 'Osgood';
    const cleanPersona = persona
      ? persona
          .replace(/[^a-zA-Z0-9 ]/g, '')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join('')
      : 'Voxel';

    const slot1 = baseName.toLowerCase().endsWith('ling')
      ? baseName
      : `${baseName}ling`;

    const names = [slot1, `Osgood`, `[FERAL] ${cleanPersona}`];

    // 3. THE AI GATEWAY (Mocking active)
    const USE_MOCK = true; // false = replicate, true = mock
    let prediction;

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 1500));
      prediction = {
        output: [
          'https://placehold.co/512x512/333333/00ff00/png?text=Weirdling+Loading...',
        ],
        status: 'succeeded',
        id: 'mock-12345',
      };
    } else {
      // @ts-ignore - Runtime global in Deno
      const replicateToken = Deno.env.get('REPLICATE_API_TOKEN');
      if (!replicateToken) throw new Error('SYSTEM HALT: Missing Token.');

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Token ${replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version:
            '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
          input: { prompt: finalPrompt, num_outputs: 1 },
        }),
      });

      if (!response.ok) throw new Error('Replicate API Error');
      prediction = await response.json();
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        prediction,
        names,
        active_recipe: id,
        debug_prompt_snippet: finalPrompt.substring(0, 150) + '...',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown system error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
