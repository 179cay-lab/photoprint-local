// ============================================================
// PhotoPrint Local — Auto Layout & Distribution Algorithms
// ============================================================

import type { PrintObject } from '../types';

interface LayoutResult {
  /** Updated objects with new positions */
  objects: PrintObject[];
  /** Number of objects that fit on the page */
  fitted: number;
  /** Number of objects that didn't fit */
  overflow: number;
}

/**
 * Auto-arrange objects on the paper using greedy row packing with safe margins.
 *
 * @param objects       - Array of PrintObjects to arrange
 * @param paperW        - Paper width in mm
 * @param paperH        - Paper height in mm
 * @param spacingMm     - Spacing between objects in mm
 * @param marginMm      - Safe page margin in mm (0 if disabled)
 * @returns LayoutResult with updated positions
 */
export function autoLayout(
  objects: PrintObject[],
  paperW: number,
  paperH: number,
  spacingMm: number,
  marginMm = 0
): LayoutResult {
  if (objects.length === 0) {
    return { objects: [], fitted: 0, overflow: 0 };
  }

  const result: PrintObject[] = [];
  const startX = Math.max(0, marginMm);
  const startY = Math.max(0, marginMm);
  const maxX = paperW - startX;
  const maxY = paperH - startY;

  let currentX = startX;
  let currentY = startY;
  let rowHeight = 0;
  let fitted = 0;

  for (const obj of objects) {
    const w = obj.widthMm;
    const h = obj.heightMm;

    let placed = false;

    // Try normal orientation
    if (tryPlace(w, h)) {
      result.push({
        ...obj,
        xMm: currentX,
        yMm: currentY,
        rotation:
          obj.rotation % 360 === 90 || obj.rotation % 360 === 270
            ? 0
            : obj.rotation,
      });
      currentX += w + spacingMm;
      rowHeight = Math.max(rowHeight, h);
      placed = true;
      fitted++;
    }
    // Try rotated 90° if normal doesn't fit
    else if (tryPlace(h, w)) {
      result.push({
        ...obj,
        xMm: currentX,
        yMm: currentY,
        widthMm: h,
        heightMm: w,
        rotation: 90,
      });
      currentX += h + spacingMm;
      rowHeight = Math.max(rowHeight, w);
      placed = true;
      fitted++;
    }

    if (!placed) {
      // Start a new row
      currentX = startX;
      currentY += rowHeight + spacingMm;
      rowHeight = 0;

      if (tryPlace(w, h)) {
        result.push({
          ...obj,
          xMm: currentX,
          yMm: currentY,
          rotation:
            obj.rotation % 360 === 90 || obj.rotation % 360 === 270
              ? 0
              : obj.rotation,
        });
        currentX += w + spacingMm;
        rowHeight = Math.max(rowHeight, h);
        fitted++;
      } else if (tryPlace(h, w)) {
        result.push({
          ...obj,
          xMm: currentX,
          yMm: currentY,
          widthMm: h,
          heightMm: w,
          rotation: 90,
        });
        currentX += h + spacingMm;
        rowHeight = Math.max(rowHeight, w);
        fitted++;
      } else {
        // Doesn't fit on this sheet
        result.push({ ...obj, xMm: currentX, yMm: currentY });
      }
    }
  }

  function tryPlace(objW: number, objH: number): boolean {
    if (currentX + objW > maxX + 0.1) return false;
    if (currentY + objH > maxY + 0.1) return false;
    return true;
  }

  return {
    objects: result,
    fitted,
    overflow: objects.length - fitted,
  };
}

/**
 * Calculate optimal spacing in mm so that items in the row fill the printable area evenly.
 */
export function calculateOptimalSpacing(
  objects: PrintObject[],
  paperW: number,
  marginMm: number,
  defaultSpacingMm: number
): number {
  if (objects.length < 2) return defaultSpacingMm;

  // Estimate number of columns based on average object width
  const avgW =
    objects.reduce((sum, o) => sum + o.widthMm, 0) / objects.length;
  const printableW = paperW - marginMm * 2;
  const cols = Math.floor(printableW / avgW);

  if (cols <= 1) return defaultSpacingMm;

  const totalItemW = cols * avgW;
  const remainingSpace = printableW - totalItemW;
  const optimal = remainingSpace / (cols - 1);

  return Math.max(0, Math.round(optimal * 10) / 10);
}
