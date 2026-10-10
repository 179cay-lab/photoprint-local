// ============================================================
// PhotoPrint Local — Type Definitions
// ============================================================

/** Supported paper sizes */
export type PaperSizeType = 'A4' | 'A5';

/** Unit display preference */
export type UnitType = 'mm' | 'cm';

/** Crop data — all values are relative (0-1) to the source image */
export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Color adjustment data — all values range from -100 to 100, default 0 */
export interface ColorData {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  highlights: number;
  shadows: number;
}

/** Default color values */
export const DEFAULT_COLOR: ColorData = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  highlights: 0,
  shadows: 0,
};

/** Default crop = entire image */
export const DEFAULT_CROP: CropData = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

/** Cutting border settings for photo cutting line guide */
export interface BorderSettings {
  enabled: boolean;
  widthMm: number; // e.g. 0.25mm
  color: string;   // e.g. '#000000'
}

/** Default cutting border: enabled with a fine 0.25mm black stroke */
export const DEFAULT_BORDER: BorderSettings = {
  enabled: true,
  widthMm: 0.25,
  color: '#000000',
};

/** A single print object (image) on the canvas */
export interface PrintObject {
  id: string;
  type: 'image';

  // Source image as data URL (base64) — never modified
  sourceImageDataUrl: string;
  // Original pixel dimensions of the source image
  originalWidthPx: number;
  originalHeightPx: number;
  // File name for display
  fileName: string;

  // Print dimensions in mm
  widthMm: number;
  heightMm: number;

  // Position on paper in mm (top-left corner)
  xMm: number;
  yMm: number;

  // Rotation in degrees
  rotation: number;

  // Non-destructive crop
  crop: CropData;

  // Color adjustments
  color: ColorData;

  // Optional individual cutting border
  border?: BorderSettings;
}

/** Size preset for quick selection */
export interface SizePreset {
  label: string;
  widthCm: number;
  heightCm: number;
}

/** Paper dimensions in mm */
export interface PaperDimensions {
  widthMm: number;
  heightMm: number;
  label: string;
}
