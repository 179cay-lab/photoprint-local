// ============================================================
// PhotoPrint Local — Constants
// ============================================================

import type { PaperDimensions, SizePreset } from '../types';

/** CSS pixels per inch — the web standard for print */
export const CSS_DPI = 96;

/** Millimeters per inch */
export const MM_PER_INCH = 25.4;

/** Paper size definitions in mm */
export const PAPER_SIZES: Record<string, PaperDimensions> = {
  A4: { widthMm: 210, heightMm: 297, label: 'A4' },
  A5: { widthMm: 148, heightMm: 210, label: 'A5' },
};

/** Quick size presets (in cm) */
export const SIZE_PRESETS: SizePreset[] = [
  { label: '3×4', widthCm: 3, heightCm: 4 },
  { label: '4×6', widthCm: 4, heightCm: 6 },
  { label: '5×7', widthCm: 5, heightCm: 7 },
  { label: '6×9', widthCm: 6, heightCm: 9 },
  { label: '9×12', widthCm: 9, heightCm: 12 },
  { label: '10×15', widthCm: 10, heightCm: 15 },
];

/** Default spacing between images in mm */
export const DEFAULT_SPACING_MM = 2;

/** Spacing options in mm */
export const SPACING_OPTIONS = [0, 2, 3, 5];

/** Minimum DPI threshold for resolution warning */
export const MIN_PRINT_DPI = 150;

/** Accepted image MIME types */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Accepted file extensions for the file picker */
export const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp';
