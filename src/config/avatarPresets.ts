/**
 * Avatar preset config — 6 selectable Weirdling presets.
 * Used in Avatar Replacement Box (Edit Profile).
 */
import { WEIRDLING_ASSET_COUNT } from '../types/weirdling';

export type AvatarPreset = {
  preset_id: string;
  name: string;
  image_url: string;
  description?: string;
};

const NAMES = [
  'Builder',
  'Chaos Coordinator',
  'Wizard',
  'Debugger',
  'Architect',
  'Explorer',
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
