// ============================================================
// Print Container — Physical Paper Renderer for window.print()
// ============================================================

import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { PAPER_SIZES } from '../../constants/paper';
import { colorDataToCSSFilter } from '../../utils/color';
import './PrintContainer.css';

export function PrintContainer() {
  const paperSize = useProjectStore((s) => s.paperSize);
  const objects = useProjectStore((s) => s.objects);
  const borderEnabled = useProjectStore((s) => s.borderEnabled);
  const borderWidthMm = useProjectStore((s) => s.borderWidthMm);
  const borderColor = useProjectStore((s) => s.borderColor);
  const paper = PAPER_SIZES[paperSize];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div id="print-container">
      {/* Dynamic @page size style for exact printer paper handling */}
      <style>{`@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }`}</style>

      <div
        className="print-page"
        style={{
          width: `${paper.widthMm}mm`,
          height: `${paper.heightMm}mm`,
        }}
      >
        {objects.map((obj) => {
          const cropW = obj.crop.width || 1;
          const cropH = obj.crop.height || 1;
          const cropX = obj.crop.x || 0;
          const cropY = obj.crop.y || 0;

          const imgWidthPct = (1 / cropW) * 100;
          const imgHeightPct = (1 / cropH) * 100;
          const imgLeftPct = -(cropX / cropW) * 100;
          const imgTopPct = -(cropY / cropH) * 100;

          const filterCSS = colorDataToCSSFilter(obj.color);
          const hasBorder = borderEnabled && borderWidthMm > 0;

          return (
            <div
              key={obj.id}
              className={`print-item ${hasBorder ? '' : 'print-cut-guide'}`}
              style={{
                left: `${obj.xMm}mm`,
                top: `${obj.yMm}mm`,
                width: `${obj.widthMm}mm`,
                height: `${obj.heightMm}mm`,
                transform: `rotate(${obj.rotation}deg)`,
                transformOrigin: 'top left',
                border: hasBorder ? `${borderWidthMm}mm solid ${borderColor}` : undefined,
                boxSizing: 'border-box',
              }}
            >
              <img
                src={obj.sourceImageDataUrl}
                alt={obj.fileName}
                className="print-image"
                style={{
                  width: `${imgWidthPct}%`,
                  height: `${imgHeightPct}%`,
                  left: `${imgLeftPct}%`,
                  top: `${imgTopPct}%`,
                  filter: filterCSS,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
