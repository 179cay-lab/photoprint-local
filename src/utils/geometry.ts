// ============================================================
// PhotoPrint Local — Geometry & Rotation Math Utilities
// ============================================================

/**
 * Computes bounding box and center of an oriented rectangle (x, y, w, h, rotation)
 */
export function getRotatedBoundingBox(
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  rotationDeg: number
) {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners = [
    { x: 0, y: 0 },
    { x: widthMm, y: 0 },
    { x: widthMm, y: heightMm },
    { x: 0, y: heightMm },
  ];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const c of corners) {
    const rx = c.x * cos - c.y * sin + xMm;
    const ry = c.x * sin + c.y * cos + yMm;
    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry;
    if (ry > maxY) maxY = ry;
  }

  const dx = (widthMm / 2) * cos - (heightMm / 2) * sin;
  const dy = (widthMm / 2) * sin + (heightMm / 2) * cos;
  const centerX = xMm + dx;
  const centerY = yMm + dy;

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX,
    centerY,
    widthMm: maxX - minX,
    heightMm: maxY - minY,
  };
}

/**
 * Calculates new (xMm, yMm, rotation) so that the object rotates around its physical center
 */
export function getRotatedPositionAroundCenter(
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  currentAngleDeg: number,
  deltaDeg: number
): { xMm: number; yMm: number; rotation: number } {
  const rad1 = (currentAngleDeg * Math.PI) / 180;
  const dx1 = (widthMm / 2) * Math.cos(rad1) - (heightMm / 2) * Math.sin(rad1);
  const dy1 = (widthMm / 2) * Math.sin(rad1) + (heightMm / 2) * Math.cos(rad1);
  const cx = xMm + dx1;
  const cy = yMm + dy1;

  const newAngleDeg = ((currentAngleDeg + deltaDeg) % 360 + 360) % 360;
  const rad2 = (newAngleDeg * Math.PI) / 180;

  const dx2 = (widthMm / 2) * Math.cos(rad2) - (heightMm / 2) * Math.sin(rad2);
  const dy2 = (widthMm / 2) * Math.sin(rad2) + (heightMm / 2) * Math.cos(rad2);
  const newX = cx - dx2;
  const newY = cy - dy2;

  return {
    xMm: Math.round(newX * 100) / 100,
    yMm: Math.round(newY * 100) / 100,
    rotation: newAngleDeg,
  };
}
