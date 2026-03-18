/**
 * Avatar preset config — selectable Weirdling presets for Edit Profile.
 */
import { WEIRDLING_ASSET_COUNT } from '../types/weirdling';

export type AvatarPreset = {
  preset_id: string;
  name: string;
  image_url: string;
  description?: string;
};

const NAMES = [
  'Greenling',
  'Pinkling',
  'Blue Sprite',
  'Orbitling',
  'Sparkling',
  'Echoling',
  'Lumenling',
  'Mistling',
  'Nova Nook',
  'Pixel Puck',
  'Signal Sprite',
  'Voltling',
];

export const AVATAR_PRESETS: AvatarPreset[] = Array.from(
  { length: WEIRDLING_ASSET_COUNT },
  (_, i) => ({
    preset_id: `preset-${i + 1}`,
    name: NAMES[i] ?? `Weirdling ${i + 1}`,
    image_url: `/assets/og_weirdlings/weirdling_${i + 1}.png`,
    description: `Preset Weirdling avatar ${i + 1}`,
  }),
);

/** MVP: 6 presets in Edit Profile avatar replacement (epic). */
export const MVP_AVATAR_PRESET_COUNT = 6;
export const AVATAR_PRESETS_MVP: AvatarPreset[] = AVATAR_PRESETS.slice(
  0,
  MVP_AVATAR_PRESET_COUNT,
);

export const DEFAULT_AVATAR_PRESET_ID = 'preset-1';
export const DEFAULT_AVATAR_URL =
  AVATAR_PRESETS.find((preset) => preset.preset_id === DEFAULT_AVATAR_PRESET_ID)
    ?.image_url ??
  AVATAR_PRESETS[0]?.image_url ??
  null;
