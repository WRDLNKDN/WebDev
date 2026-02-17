/* eslint-disable */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Define the shape of our soup inputs
interface WeirdlingInputs {
  primaryColor?: string;
  heldObject?: string;
  hairStyle?: string;
  hairColor?: string;
  persona?: string;
  interests?: string[];
  userName?: string;
}

/** 🥣 THE WEIRDLING SOUP REGISTRY */
const WEIRDLING_RECIPES: Record<string, (inputs: WeirdlingInputs) => string> = {
  voxel_v1: (inputs) => {
    let prompt = `Create me a weirdling that is primarily color ${inputs.primaryColor || 'green'}, `;

    if (inputs.heldObject && inputs.heldObject.toLowerCase() !== 'none') {
      prompt += `holding a ${inputs.heldObject}, `;
    }
    if (inputs.hairStyle && inputs.hairStyle.toLowerCase() !== 'none') {
      prompt += `with ${inputs.hairStyle} hair in ${inputs.hairColor}, `;
    }
    prompt += `based on an ${inputs.persona || 'box'}. `;

    if (
      inputs.interests &&
      Array.isArray(inputs.interests) &&
      inputs.interests.length > 0
    ) {
      prompt += `It features visual traits representing ${inputs.interests.join(', ')}. `;
    }

    prompt += `The style is cute, retro, and blocky, like a character from Crossy Road or Minecraft. Solid background color.`;

    const systemPrompt =
      'Positive Tags: 3D voxel art, pixel art, isometric view. Negative Constraints: NO photorealism, NO human skin texture, NO blurring, NO round edges.';

    return `${prompt} ${systemPrompt}`;
  },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WeirdlingInputs & { recipeId?: string } = await req.json();
    const { persona, userName, recipeId } = payload;

    // 1. SELECT RECIPE
    const id = recipeId && WEIRDLING_RECIPES[recipeId] ? recipeId : 'voxel_v1';
    const finalPrompt = WEIRDLING_RECIPES[id](payload);

    // 2. THE NAMING ENGINE (Refined)
    const baseName = userName ? userName.trim() : 'Osgood';
    const cleanPersona = persona
      ? persona
          .replace(/[^a-zA-Z0-9 ]/g, '')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join('')
      : 'Voxel';

    // Anti-Stutter Logic for Slot 1
    const slot1 = baseName.toLowerCase().endsWith('ling')
      ? baseName
      : `${baseName}ling`;

    const names = [
      slot1, // The Smart Spawn
      `Osgood`, // The Heritage Anchor
      `[FERAL] ${cleanPersona}`, // The Glitch/System Status variant
    ];

    // 3. THE AI GATEWAY (Mocking active)
    const USE_MOCK = true;
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
