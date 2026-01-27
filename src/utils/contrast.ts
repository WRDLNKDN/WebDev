// src/utils/contrast.ts

/**
 * The "Legacy Code Revival" - Calculates text contrast using the HSP color model.
 * Input: Hex (#ffffff) or RGB/RGBA (rgba(0,0,0,0.5))
 * Output: '#ffffff' (for dark backgrounds) or '#000000' (for light backgrounds)
 */
export const getContrastColor = (color: string): string => {
  if (!color) return '#000000';

  let r = 0;
  let g = 0;
  let b = 0;

  // 1. Logic Fork: RGB vs Hex
  if (color.match(/^rgb/)) {
    // Parse RGB/RGBA string
    const match = color.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/,
    );
    if (match) {
      r = parseInt(match[1], 10);
      g = parseInt(match[2], 10);
      b = parseInt(match[3], 10);
    }
  } else {
    // Parse Hex (Standard or Short)
    // Convert short hex (#FFF) to full hex (#FFFFFF)
    const hex = color.slice(1).replace(color.length < 5 ? /./g : '', '$&$&');

    // Bitwise shift to extract RGB
    const intColor = parseInt(hex, 16);
    r = (intColor >> 16) & 255;
    g = (intColor >> 8) & 255;
    b = intColor & 255;
  }

  // 2. The HSP Equation (Perceived Brightness)
  // Weighted for human eye sensitivity (Green is brighter than Blue)
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

  // 3. The Threshold Check
  // If brightness is < 133.5, it's dark -> return White text
  // Otherwise, it's light -> return Black text
  return hsp < 133.5 ? '#ffffff' : '#000000';
};
