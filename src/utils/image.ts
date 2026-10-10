// ============================================================
// PhotoPrint Local — Image Utilities
// ============================================================

/**
 * Load an image file as a data URL (base64).
 * Returns the data URL and the image's natural pixel dimensions.
 */
export function loadImageFile(
  file: File
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Check if a file is an accepted image type.
 */
export function isAcceptedImage(file: File): boolean {
  return (
    file.type === 'image/jpeg' ||
    file.type === 'image/png' ||
    file.type === 'image/webp'
  );
}

/**
 * Calculate the aspect ratio of an image.
 */
export function getAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Check if two aspect ratios are effectively the same (within tolerance).
 */
export function isSameAspectRatio(
  ratio1: number,
  ratio2: number,
  tolerance = 0.05
): boolean {
  return Math.abs(ratio1 - ratio2) < tolerance;
}
