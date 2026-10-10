// ============================================================
// Print Preview Dialog
// ============================================================

import { useProjectStore } from '../../store/useProjectStore';
import { PAPER_SIZES } from '../../constants/paper';
import { mmToPx } from '../../utils/units';
import { colorDataToCSSFilter } from '../../utils/color';
import { triggerPrint } from '../../utils/print';
import './Dialogs.css';

export function PrintPreview() {
  const paperSize = useProjectStore((s) => s.paperSize);
  const objects = useProjectStore((s) => s.objects);
  const setShowPreview = useProjectStore((s) => s.setShowPreview);

  const paper = PAPER_SIZES[paperSize];

  // Scale factor to fit sheet neatly on screen preview (~480px height)
  const fullWidthPx = mmToPx(paper.widthMm);
  const fullHeightPx = mmToPx(paper.heightMm);
  const previewScale = Math.min(480 / fullHeightPx, 500 / fullWidthPx);

  const previewW = fullWidthPx * previewScale;
  const previewH = fullHeightPx * previewScale;

  const handlePrint = () => {
    setShowPreview(false);
    triggerPrint();
  };

  const marginEnabled = useProjectStore((s) => s.marginEnabled);
  const marginMm = useProjectStore((s) => s.marginMm);
  const borderEnabled = useProjectStore((s) => s.borderEnabled);
  const borderWidthMm = useProjectStore((s) => s.borderWidthMm);
  const borderColor = useProjectStore((s) => s.borderColor);

  return (
    <div className="modal-overlay" onClick={() => setShowPreview(false)}>
      <div
        className="modal-card preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            <span>👁️ Xem trước trang in ({paperSize} — {paper.widthMm}×{paper.heightMm} mm)</span>
          </div>
          <button className="btn-icon" onClick={() => setShowPreview(false)}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="preview-sheet-area">
            <div
              className="preview-sheet"
              style={{
                width: previewW,
                height: previewH,
              }}
            >
              {marginEnabled && marginMm > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: mmToPx(marginMm) * previewScale,
                    top: mmToPx(marginMm) * previewScale,
                    width: (fullWidthPx - mmToPx(marginMm * 2)) * previewScale,
                    height: (fullHeightPx - mmToPx(marginMm * 2)) * previewScale,
                    border: '1px dashed #3b82f6',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                    zIndex: 1,
                  }}
                />
              )}

              {objects.map((obj) => {
                const itemLeft = mmToPx(obj.xMm) * previewScale;
                const itemTop = mmToPx(obj.yMm) * previewScale;
                const itemW = mmToPx(obj.widthMm) * previewScale;
                const itemH = mmToPx(obj.heightMm) * previewScale;

                const cropW = obj.crop.width || 1;
                const cropH = obj.crop.height || 1;
                const cropX = obj.crop.x || 0;
                const cropY = obj.crop.y || 0;

                const imgWidthPct = (1 / cropW) * 100;
                const imgHeightPct = (1 / cropH) * 100;
                const imgLeftPct = -(cropX / cropW) * 100;
                const imgTopPct = -(cropY / cropH) * 100;

                const hasBorder = borderEnabled && borderWidthMm > 0;
                const borderPx = Math.max(1, mmToPx(borderWidthMm) * previewScale);

                return (
                  <div
                    key={obj.id}
                    className={hasBorder ? '' : 'print-cut-guide'}
                    style={{
                      position: 'absolute',
                      left: itemLeft,
                      top: itemTop,
                      width: itemW,
                      height: itemH,
                      transform: `rotate(${obj.rotation}deg)`,
                      transformOrigin: 'top left',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      border: hasBorder ? `${borderPx}px solid ${borderColor}` : undefined,
                    }}
                  >
                    <img
                      src={obj.sourceImageDataUrl}
                      alt={obj.fileName}
                      style={{
                        position: 'absolute',
                        width: `${imgWidthPct}%`,
                        height: `${imgHeightPct}%`,
                        left: `${imgLeftPct}%`,
                        top: `${imgTopPct}%`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                        filter: colorDataToCSSFilter(obj.color),
                        display: 'block',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Epson L8050 Printing Advice */}
          <div className="preview-tip-card">
            <span className="preview-tip-icon">💡</span>
            <div>
              <strong>Lưu ý quan trọng khi in trên Epson L8050:</strong>
              <div>
                • Hộp thoại in: Chọn <strong>Tỷ lệ (Scale) = 100%</strong> (hoặc Khổ thực tế / Actual size) để ảnh ra đúng cm.
              </div>
              <div>
                • Khổ giấy: Chọn <strong>{paperSize}</strong>. Loại giấy: <strong>Photo Paper Glossy</strong> hoặc <strong>Matte</strong>.
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowPreview(false)}
          >
            Đóng
          </button>
          <button
            type="button"
            className="btn btn-primary btn-print"
            onClick={handlePrint}
          >
            🖨️ In ngay ({objects.length} ảnh)
          </button>
        </div>
      </div>
    </div>
  );
}
