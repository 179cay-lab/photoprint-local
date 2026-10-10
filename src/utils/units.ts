// ============================================================
// PhotoPrint Local — Unit Conversion Utilities
// ============================================================
// All conversions use 96 CSS DPI (web standard).
// This ensures CSS @page print output matches physical dimensions.

import { CSS_DPI, MM_PER_INCH } from '../constants/paper';

/** Pixels per millimeter at 96 DPI */
export const PX_PER_MM = CSS_DPI / MM_PER_INCH; // ≈ 3.7795275591

/** Convert millimeters to CSS pixels */
export function mmToPx(mm: number): number {
  return mm * PX_PER_MM;
}

/** Convert CSS pixels to millimeters */
export function pxToMm(px: number): number {
  return px / PX_PER_MM;
}

/** Convert centimeters to millimeters */
export function cmToMm(cm: number): number {
  return cm * 10;
}

/** Convert millimeters to centimeters */
export function mmToCm(mm: number): number {
  return mm / 10;
}

/** Convert centimeters to CSS pixels */
export function cmToPx(cm: number): number {
  return mmToPx(cmToMm(cm));
}

/** Convert CSS pixels to centimeters */
export function pxToCm(px: number): number {
  return mmToCm(pxToMm(px));
}

/**
 * Calculate the effective DPI of an image given its pixel dimensions and print size.
 * Used for resolution warnings.
 */
export function calculatePrintDPI(
  imageWidthPx: number,
  imageHeightPx: number,
  printWidthMm: number,
  printHeightMm: number
): number {
  const printWidthInches = printWidthMm / MM_PER_INCH;
  const printHeightInches = printHeightMm / MM_PER_INCH;
  const dpiW = imageWidthPx / printWidthInches;
  const dpiH = imageHeightPx / printHeightInches;
  return Math.min(dpiW, dpiH);
}

/**
 * Format a mm value for display in the given unit.
 */
export function formatUnit(mm: number, unit: 'mm' | 'cm'): string {
  if (unit === 'cm') {
    return `${mmToCm(mm).toFixed(1)} cm`;
  }
  return `${mm.toFixed(1)} mm`;
}

/**
 * Round to a specific number of decimal places.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
