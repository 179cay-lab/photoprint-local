// ============================================================
// PhotoPrint Local — Professional Print Utilities
// ============================================================

import { PAPER_SIZES } from '../constants/paper';
import type { PaperSizeType } from '../types';
import { colorDataToCSSFilter } from './color';
import { useProjectStore } from '../store/useProjectStore';

/**
 * Triggers browser print dialog using an isolated hidden iframe.
 * This completely prevents "blank page" issues caused by display:none parents or timing bugs,
 * ensures color filters are applied, exact physical dimensions in mm are maintained,
 * and all image bitmaps are 100% pre-decoded before invoking print().
 */
export function triggerPrint(): void {
  const state = useProjectStore.getState();
  const objects = state.objects;
  const paperSize = state.paperSize;
  const paper = PAPER_SIZES[paperSize];

  if (objects.length === 0) {
    alert('Chưa có ảnh nào để in. Hãy thêm ảnh trước!');
    return;
  }

  // Ensure dynamic @page size style exists in main document <head> as backup
  let mainStyleTag = document.getElementById('photoprint-dynamic-page-style') as HTMLStyleElement | null;
  if (!mainStyleTag) {
    mainStyleTag = document.createElement('style');
    mainStyleTag.id = 'photoprint-dynamic-page-style';
    document.head.appendChild(mainStyleTag);
  }
  mainStyleTag.textContent = `@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }`;

  // Remove any previously existing print iframe
  const existingIframe = document.getElementById('photoprint-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'photoprint-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = `${paper.widthMm}mm`;
  iframe.style.height = `${paper.heightMm}mm`;
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    console.warn('Iframe document not accessible, falling back to standard window.print()');
    window.print();
    return;
  }

  const borderEnabled = state.borderEnabled;
  const borderWidthMm = state.borderWidthMm;
  const borderColor = state.borderColor;

  // Generate HTML for all print objects
  const itemsHtml = objects
    .map((obj) => {
      const cropW = obj.crop.width || 1;
      const cropH = obj.crop.height || 1;
      const cropX = obj.crop.x || 0;
      const cropY = obj.crop.y || 0;

      const imgWidthPct = (1 / cropW) * 100;
      const imgHeightPct = (1 / cropH) * 100;
      const imgLeftPct = -(cropX / cropW) * 100;
      const imgTopPct = -(cropY / cropH) * 100;

      const filterCSS = colorDataToCSSFilter(obj.color);
      const borderCSS =
        borderEnabled && borderWidthMm > 0
          ? `border: ${borderWidthMm}mm solid ${borderColor}; box-sizing: border-box;`
          : '';

      return `
        <div class="print-item" style="
          left: ${obj.xMm}mm;
          top: ${obj.yMm}mm;
          width: ${obj.widthMm}mm;
          height: ${obj.heightMm}mm;
          transform: rotate(${obj.rotation}deg);
          transform-origin: top left;
          ${borderCSS}
        ">
          <img
            src="${obj.sourceImageDataUrl}"
            alt="${obj.fileName || 'photo'}"
            class="print-image"
            style="
              width: ${imgWidthPct}%;
              height: ${imgHeightPct}%;
              left: ${imgLeftPct}%;
              top: ${imgTopPct}%;
              filter: ${filterCSS};
            "
          />
        </div>
      `;
    })
    .join('\n');

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PhotoPrint - ${paperSize} (${paper.widthMm}x${paper.heightMm}mm)</title>
  <style>
    @page {
      size: ${paper.widthMm}mm ${paper.heightMm}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${paper.widthMm}mm;
      height: ${paper.heightMm}mm;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      overflow: hidden;
    }
    .print-page {
      position: relative;
      width: ${paper.widthMm}mm;
      height: ${paper.heightMm}mm;
      background-color: #ffffff;
      overflow: hidden;
      margin: 0;
      padding: 0;
    }
    .print-item {
      position: absolute;
      overflow: hidden;
      box-sizing: border-box;
    }
    /* Subtle hairline for clean cutting guides */
    .print-cut-guide {
      outline: 0.15mm solid rgba(0, 0, 0, 0.25);
    }
    .print-image {
      position: absolute;
      max-width: none;
      max-height: none;
      display: block;
      user-select: none;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="print-page">
    ${itemsHtml}
  </div>
</body>
</html>`;

  doc.open();
  doc.write(fullHtml);
  doc.close();

  // Wait for all images inside iframe to decode completely
  const images = Array.from(doc.querySelectorAll('img'));
  const decodePromises = images.map((img) => {
    if (img.complete && img.naturalWidth > 0) {
      if ('decode' in img) {
        return img.decode().catch(() => {});
      }
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      img.onload = () => {
        if ('decode' in img) {
          img.decode().then(resolve).catch(resolve);
        } else {
          resolve();
        }
      };
      img.onerror = () => resolve();
    });
  });

  Promise.all(decodePromises).then(() => {
    // Small timeout for layout calculation
    setTimeout(() => {
      try {
        const frameWindow = iframe.contentWindow;
        if (frameWindow) {
          frameWindow.focus();
          frameWindow.print();
        } else {
          window.print();
        }
      } catch (err) {
        console.error('Iframe print error, falling back to window.print():', err);
        window.print();
      }

      // Cleanup iframe after printing
      const cleanup = () => {
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      };

      if (iframe.contentWindow) {
        iframe.contentWindow.addEventListener('afterprint', cleanup);
      }
      setTimeout(cleanup, 45000);
    }, 150);
  });
}

/**
 * Get CSS @page size declaration for a given paper size.
 */
export function getPageSizeCSS(paperSize: PaperSizeType): string {
  const paper = PAPER_SIZES[paperSize];
  return `@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }`;
}
