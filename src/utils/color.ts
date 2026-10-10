// ============================================================
// PhotoPrint Local — Color Utilities
// ============================================================

import type { ColorData } from '../types';

/**
 * "Tự tối ưu màu in" preset.
 * Slightly boosts brightness and contrast to compensate for inkjet printing
 * which tends to produce darker, less vibrant output than screen.
 */
export const PRINT_OPTIMIZE_PRESET: ColorData = {
  brightness: 5,
  contrast: 8,
  saturation: -3,
  temperature: 0,
  highlights: 3,
  shadows: 5,
};

/**
 * Convert our ColorData to CSS filter string.
 * Used for both canvas preview and print rendering.
 */
export function colorDataToCSSFilter(color: ColorData): string {
  const filters: string[] = [];

  // Brightness: CSS filter 1.0 = normal, range ~0.5 to 1.5
  if (color.brightness !== 0) {
    filters.push(`brightness(${1 + color.brightness / 100})`);
  }

  // Contrast: CSS filter 1.0 = normal
  if (color.contrast !== 0) {
    filters.push(`contrast(${1 + color.contrast / 100})`);
  }

  // Saturation: CSS filter 1.0 = normal
  if (color.saturation !== 0) {
    filters.push(`saturate(${1 + color.saturation / 100})`);
  }

  // Temperature: simulate with sepia + hue-rotate
  // Warm = positive, Cool = negative
  if (color.temperature !== 0) {
    if (color.temperature > 0) {
      // Warm: slight sepia tint
      const sepia = (color.temperature / 100) * 0.3;
      filters.push(`sepia(${sepia})`);
    } else {
      // Cool: hue-rotate towards blue
      const rotate = (color.temperature / 100) * 30;
      filters.push(`hue-rotate(${rotate}deg)`);
    }
  }

  // Highlights and shadows are simplified as brightness shifts
  // In a full implementation, these would use custom curves
  if (color.highlights !== 0 || color.shadows !== 0) {
    // Combined effect — highlights affect bright areas, shadows affect dark
    // Simplified: treat as additional brightness micro-adjustment
    const combined = (color.highlights + color.shadows) / 200;
    if (Math.abs(combined) > 0.01) {
      filters.push(`brightness(${1 + combined})`);
    }
  }

  return filters.length > 0 ? filters.join(' ') : 'none';
}

/**
 * Check if color adjustments are at default (no changes).
 */
export function isDefaultColor(color: ColorData): boolean {
  return (
    color.brightness === 0 &&
    color.contrast === 0 &&
    color.saturation === 0 &&
    color.temperature === 0 &&
    color.highlights === 0 &&
    color.shadows === 0
  );
}
