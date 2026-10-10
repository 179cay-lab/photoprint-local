// ============================================================
// Crop Editor Modal
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import type { CropData } from '../../types';
import './Dialogs.css';

export function CropEditor() {
  const cropTargetId = useProjectStore((s) => s.cropTargetId);
  const objects = useProjectStore((s) => s.objects);
  const closeCropEditor = useProjectStore((s) => s.closeCropEditor);
  const updateObject = useProjectStore((s) => s.updateObject);
  const pushUndo = useProjectStore((s) => s.pushUndo);

  const obj = objects.find((o) => o.id === cropTargetId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 700, height: 440 });

  // Target aspect ratio (width / height)
  const targetRatio = obj ? obj.widthMm / obj.heightMm : 1;

  // Local crop state
  const [crop, setCrop] = useState<CropData>(
    obj?.crop || { x: 0, y: 0, width: 1, height: 1 }
  );

  // Measure container size on mount/resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute displayed image geometry
  const imgW = obj?.originalWidthPx || 1000;
  const imgH = obj?.originalHeightPx || 1000;
  const imgAspect = imgW / imgH;

  const scale = Math.min(
    (containerSize.width - 40) / imgW,
    (containerSize.height - 40) / imgH
  );
  const displayedImgW = imgW * scale;
  const displayedImgH = imgH * scale;
  const offsetX = (containerSize.width - displayedImgW) / 2;
  const offsetY = (containerSize.height - displayedImgH) / 2;

  // Base maximum crop box that fits the image with targetRatio
  const getMaxDimensions = useCallback(() => {
    if (imgAspect >= targetRatio) {
      return {
        maxW: targetRatio / imgAspect,
        maxH: 1.0,
      };
    } else {
      return {
        maxW: 1.0,
        maxH: imgAspect / targetRatio,
      };
    }
  }, [imgAspect, targetRatio]);

  // Center crop helper
  const handleCenter = useCallback(() => {
    const { maxW, maxH } = getMaxDimensions();
    // Keep current scale fraction
    const curScale = Math.min(crop.width / maxW, crop.height / maxH);
    const newW = maxW * curScale;
    const newH = maxH * curScale;
    setCrop({
      x: (1 - newW) / 2,
      y: (1 - newH) / 2,
      width: newW,
      height: newH,
    });
  }, [crop.width, crop.height, getMaxDimensions]);

  // Reset to full maximum crop
  const handleResetMax = useCallback(() => {
    const { maxW, maxH } = getMaxDimensions();
    setCrop({
      x: (1 - maxW) / 2,
      y: (1 - maxH) / 2,
      width: maxW,
      height: maxH,
    });
  }, [getMaxDimensions]);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartCrop = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartCrop.current = { x: crop.x, y: crop.y };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dxPx = e.clientX - dragStartPos.current.x;
      const dyPx = e.clientY - dragStartPos.current.y;

      const dxNorm = dxPx / displayedImgW;
      const dyNorm = dyPx / displayedImgH;

      const newX = Math.max(0, Math.min(1 - crop.width, dragStartCrop.current.x + dxNorm));
      const newY = Math.max(0, Math.min(1 - crop.height, dragStartCrop.current.y + dyNorm));

      setCrop((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    },
    [displayedImgW, displayedImgH, crop.width, crop.height]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Zoom / Scale crop slider
  const { maxW, maxH } = getMaxDimensions();
  const currentScaleFrac = Math.max(0.2, Math.min(1, crop.width / maxW));

  const handleScaleChange = (newFrac: number) => {
    const newW = maxW * newFrac;
    const newH = maxH * newFrac;

    // Keep center
    const curCenterX = crop.x + crop.width / 2;
    const curCenterY = crop.y + crop.height / 2;

    const newX = Math.max(0, Math.min(1 - newW, curCenterX - newW / 2));
    const newY = Math.max(0, Math.min(1 - newH, curCenterY - newH / 2));

    setCrop({
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    });
  };

  const handleApply = () => {
    if (!obj) return;
    pushUndo();
    updateObject(obj.id, { crop });
    closeCropEditor();
  };

  if (!obj) return null;

  // Pixel coordinates of crop box on the container
  const boxLeft = offsetX + crop.x * displayedImgW;
  const boxTop = offsetY + crop.y * displayedImgH;
  const boxWidth = crop.width * displayedImgW;
  const boxHeight = crop.height * displayedImgH;

  return (
    <div className="modal-overlay" onClick={closeCropEditor}>
      <div
        className="modal-card crop-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            <span>✂️ Cắt ảnh (Crop) theo tỷ lệ {(obj.widthMm / 10).toFixed(1)}×{(obj.heightMm / 10).toFixed(1)} cm</span>
          </div>
          <button className="btn-icon" onClick={closeCropEditor}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="crop-canvas-container" ref={containerRef}>
            {/* Background image */}
            <img
              src={obj.sourceImageDataUrl}
              alt={obj.fileName}
              style={{
                position: 'absolute',
                left: offsetX,
                top: offsetY,
                width: displayedImgW,
                height: displayedImgH,
                pointerEvents: 'none',
              }}
            />

            {/* Crop selection frame with shadow overlay */}
            <div
              className="crop-frame-box"
              style={{
                left: boxLeft,
                top: boxTop,
                width: boxWidth,
                height: boxHeight,
              }}
              onMouseDown={handleMouseDown}
            >
              {/* Rule of thirds grid lines */}
              <div className="crop-grid-line-h1" />
              <div className="crop-grid-line-h2" />
              <div className="crop-grid-line-v1" />
              <div className="crop-grid-line-v2" />

              {/* Corner indicators */}
              <div className="crop-corner-handle crop-corner-tl" />
              <div className="crop-corner-handle crop-corner-tr" />
              <div className="crop-corner-handle crop-corner-bl" />
              <div className="crop-corner-handle crop-corner-br" />
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="crop-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, maxWidth: '360px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                🔍 Khung hình:
              </span>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.01"
                value={currentScaleFrac}
                onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', width: '36px' }}>
                {Math.round(currentScaleFrac * 100)}%
              </span>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCenter}
              >
                ⌖ Căn giữa
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetMax}
              >
                ⤢ Khung lớn nhất
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closeCropEditor}>
            Hủy
          </button>
          <button type="button" className="btn btn-primary" onClick={handleApply}>
            ✓ Áp dụng cắt ảnh
          </button>
        </div>
      </div>
    </div>
  );
}
