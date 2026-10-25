// ============================================================
// Crop Editor Modal — Freeform & Preset Ratio Cropping
// ============================================================

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import type { CropData, PrintObject } from '../../types';
import './Dialogs.css';

type DragHandle = 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | null;
type CropRatioMode = 'free' | 'current' | '1:1' | '3:4' | '4:6' | 'original';

export function CropEditor() {
  const cropTargetId = useProjectStore((s) => s.cropTargetId);
  const objects = useProjectStore((s) => s.objects);
  const closeCropEditor = useProjectStore((s) => s.closeCropEditor);
  const updateObject = useProjectStore((s) => s.updateObject);
  const pushUndo = useProjectStore((s) => s.pushUndo);

  const obj = objects.find((o) => o.id === cropTargetId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 750, height: 460 });

  // Ratio mode: default to 'free' (Tự do / Freesize) as requested
  const [ratioMode, setRatioMode] = useState<CropRatioMode>('free');
  const [autoAdjustPrintSize, setAutoAdjustPrintSize] = useState<boolean>(true);

  // Local crop state (normalized 0..1)
  const [crop, setCrop] = useState<CropData>(
    obj?.crop || { x: 0, y: 0, width: 1, height: 1 }
  );

  // Measure container size
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
    (containerSize.width - 48) / imgW,
    (containerSize.height - 48) / imgH
  );
  const displayedImgW = Math.max(50, imgW * scale);
  const displayedImgH = Math.max(50, imgH * scale);
  const offsetX = (containerSize.width - displayedImgW) / 2;
  const offsetY = (containerSize.height - displayedImgH) / 2;

  // Numerical target aspect ratio (width / height) based on mode
  const targetRatio = useMemo<number | null>(() => {
    if (ratioMode === 'free') return null;
    if (ratioMode === 'current') return obj ? obj.widthMm / obj.heightMm : 1;
    if (ratioMode === '1:1') return 1;
    if (ratioMode === '3:4') return 3 / 4;
    if (ratioMode === '4:6') return 4 / 6;
    if (ratioMode === 'original') return imgAspect;
    return null;
  }, [ratioMode, obj, imgAspect]);

  // Center crop helper
  const handleCenter = useCallback(() => {
    setCrop((prev) => ({
      ...prev,
      x: Math.max(0, (1 - prev.width) / 2),
      y: Math.max(0, (1 - prev.height) / 2),
    }));
  }, []);

  // Reset to full image
  const handleResetFull = useCallback(() => {
    if (ratioMode === 'free') {
      setCrop({ x: 0, y: 0, width: 1, height: 1 });
      return;
    }

    if (targetRatio) {
      if (imgAspect >= targetRatio) {
        const wNorm = targetRatio / imgAspect;
        setCrop({
          x: (1 - wNorm) / 2,
          y: 0,
          width: wNorm,
          height: 1,
        });
      } else {
        const hNorm = imgAspect / targetRatio;
        setCrop({
          x: 0,
          y: (1 - hNorm) / 2,
          width: 1,
          height: hNorm,
        });
      }
    }
  }, [ratioMode, targetRatio, imgAspect]);

  // Handle switching ratio mode
  const handleSelectRatioMode = (mode: CropRatioMode) => {
    setRatioMode(mode);
    if (mode === 'free') {
      return; // Keep existing crop box when switching to free
    }

    let ratio = 1;
    if (mode === 'current') ratio = obj ? obj.widthMm / obj.heightMm : 1;
    else if (mode === '1:1') ratio = 1;
    else if (mode === '3:4') ratio = 3 / 4;
    else if (mode === '4:6') ratio = 4 / 6;
    else if (mode === 'original') ratio = imgAspect;

    // Adapt current crop box to new ratio
    let newW = crop.width;
    let newH = newW / (ratio / imgAspect);
    if (newH > 1) {
      newH = 1;
      newW = newH * (ratio / imgAspect);
    }
    const newX = Math.max(0, Math.min(1 - newW, crop.x + (crop.width - newW) / 2));
    const newY = Math.max(0, Math.min(1 - newH, crop.y + (crop.height - newH) / 2));

    setCrop({
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    });
  };

  // Dragging state
  const isDraggingRef = useRef<DragHandle>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartCrop = useRef<CropData>({ x: 0, y: 0, width: 1, height: 1 });

  const handleStartDrag = (handle: DragHandle, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = handle;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartCrop.current = { ...crop };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const handle = isDraggingRef.current;
      if (!handle) return;

      const dxPx = e.clientX - dragStartPos.current.x;
      const dyPx = e.clientY - dragStartPos.current.y;
      const dx = dxPx / displayedImgW;
      const dy = dyPx / displayedImgH;
      const start = dragStartCrop.current;

      const minW = 0.04;
      const minH = 0.04;

      if (handle === 'move') {
        const newX = Math.max(0, Math.min(1 - start.width, start.x + dx));
        const newY = Math.max(0, Math.min(1 - start.height, start.y + dy));
        setCrop({
          ...start,
          x: newX,
          y: newY,
        });
        return;
      }

      // Freeform crop: Each edge and corner is completely independent
      if (ratioMode === 'free' || !targetRatio) {
        let x = start.x;
        let y = start.y;
        let w = start.width;
        let h = start.height;

        if (handle === 'r' || handle === 'tr' || handle === 'br') {
          w = Math.max(minW, Math.min(1 - start.x, start.width + dx));
        }
        if (handle === 'b' || handle === 'bl' || handle === 'br') {
          h = Math.max(minH, Math.min(1 - start.y, start.height + dy));
        }
        if (handle === 'l' || handle === 'tl' || handle === 'bl') {
          const clampedDx = Math.max(-start.x, Math.min(start.width - minW, dx));
          x = start.x + clampedDx;
          w = start.width - clampedDx;
        }
        if (handle === 't' || handle === 'tl' || handle === 'tr') {
          const clampedDy = Math.max(-start.y, Math.min(start.height - minH, dy));
          y = start.y + clampedDy;
          h = start.height - clampedDy;
        }

        setCrop({ x, y, width: w, height: h });
        return;
      }

      // Locked ratio crop
      const normRatio = targetRatio / imgAspect; // widthNorm / heightNorm

      let newW = start.width;
      let newH = start.height;
      let newX = start.x;
      let newY = start.y;

      if (handle === 'br') {
        newW = Math.max(minW, Math.min(1 - start.x, start.width + dx));
        newH = newW / normRatio;
        if (start.y + newH > 1) {
          newH = 1 - start.y;
          newW = newH * normRatio;
        }
      } else if (handle === 'tl') {
        const testW = Math.max(minW, Math.min(start.x + start.width, start.width - dx));
        const testH = testW / normRatio;
        if (start.y + start.height - testH >= 0) {
          newW = testW;
          newH = testH;
        } else {
          newH = start.y + start.height;
          newW = newH * normRatio;
        }
        newX = start.x + (start.width - newW);
        newY = start.y + (start.height - newH);
      } else if (handle === 'tr') {
        const testW = Math.max(minW, Math.min(1 - start.x, start.width + dx));
        const testH = testW / normRatio;
        if (start.y + start.height - testH >= 0) {
          newW = testW;
          newH = testH;
        } else {
          newH = start.y + start.height;
          newW = newH * normRatio;
        }
        newX = start.x;
        newY = start.y + (start.height - newH);
      } else if (handle === 'bl') {
        const testW = Math.max(minW, Math.min(start.x + start.width, start.width - dx));
        const testH = testW / normRatio;
        if (start.y + testH <= 1) {
          newW = testW;
          newH = testH;
        } else {
          newH = 1 - start.y;
          newW = newH * normRatio;
        }
        newX = start.x + (start.width - newW);
        newY = start.y;
      } else if (handle === 'r' || handle === 'l' || handle === 't' || handle === 'b') {
        // Uniform scaling along edge
        const delta = handle === 'r' || handle === 'b' ? Math.max(dx, dy) : -Math.max(dx, dy);
        newW = Math.max(minW, Math.min(1 - start.x, start.width + delta));
        newH = newW / normRatio;
        if (start.y + newH > 1) {
          newH = 1 - start.y;
          newW = newH * normRatio;
        }
      }

      setCrop({
        x: Math.max(0, Math.min(1 - newW, newX)),
        y: Math.max(0, Math.min(1 - newH, newY)),
        width: Math.max(minW, Math.min(1, newW)),
        height: Math.max(minH, Math.min(1, newH)),
      });
    },
    [displayedImgW, displayedImgH, ratioMode, targetRatio, imgAspect]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleApply = () => {
    if (!obj) return;
    pushUndo();

    const updates: Partial<PrintObject> = { crop };

    // In Freesize mode, if auto-adjust is checked, update heightMm so photo does not get distorted on canvas
    if (ratioMode === 'free' && autoAdjustPrintSize) {
      const croppedAspect = (crop.width * imgW) / (crop.height * imgH);
      const newHeightMm = Math.round((obj.widthMm / croppedAspect) * 10) / 10;
      updates.heightMm = Math.max(5, newHeightMm);
    }

    updateObject(obj.id, updates);
    closeCropEditor();
  };

  if (!obj) return null;

  // Pixel coordinates of crop box on the container
  const boxLeft = offsetX + crop.x * displayedImgW;
  const boxTop = offsetY + crop.y * displayedImgH;
  const boxWidth = Math.max(10, crop.width * displayedImgW);
  const boxHeight = Math.max(10, crop.height * displayedImgH);

  return (
    <div className="modal-overlay" onClick={closeCropEditor}>
      <div
        className="modal-card crop-modal"
        style={{ width: '880px', maxWidth: '96vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            <span>✂️ Cắt xén ảnh (Crop)</span>
            <span
              style={{
                marginLeft: '10px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                background: ratioMode === 'free' ? '#dbeafe' : 'var(--bg)',
                color: ratioMode === 'free' ? '#1d4ed8' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              {ratioMode === 'free' ? '🔓 Chế độ Tự do (Freesize)' : `🔒 Khóa tỷ lệ (${ratioMode})`}
            </span>
          </div>
          <button className="btn-icon" onClick={closeCropEditor} title="Đóng">
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: 'var(--space-4)' }}>
          {/* Ratio Mode Selection Chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>
              Tỷ lệ cắt:
            </span>
            <button
              type="button"
              className={`btn btn-sm ${ratioMode === 'free' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontWeight: 700 }}
              onClick={() => handleSelectRatioMode('free')}
              title="Kéo tự do 8 điểm (4 góc, 4 cạnh) cắt bớt bất kỳ góc nào mà không bị bó cứng tỷ lệ"
            >
              🔓 Tự do (Freesize)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${ratioMode === 'current' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleSelectRatioMode('current')}
              title="Khóa theo tỷ lệ khung in hiện tại"
            >
              🔒 Khổ in ({(obj.widthMm / 10).toFixed(1)}×{(obj.heightMm / 10).toFixed(1)} cm)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${ratioMode === '1:1' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleSelectRatioMode('1:1')}
            >
              1:1 (Vuông)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${ratioMode === '3:4' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleSelectRatioMode('3:4')}
            >
              3:4 (Thẻ)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${ratioMode === '4:6' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleSelectRatioMode('4:6')}
            >
              4:6 (Thẻ / Album)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${ratioMode === 'original' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleSelectRatioMode('original')}
            >
              Gốc
            </button>
          </div>

          {/* Interactive Canvas Container */}
          <div className="crop-canvas-container" ref={containerRef} style={{ height: '440px' }}>
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

            {/* Draggable Crop Frame Box */}
            <div
              className="crop-frame-box"
              style={{
                left: boxLeft,
                top: boxTop,
                width: boxWidth,
                height: boxHeight,
              }}
              onMouseDown={(e) => handleStartDrag('move', e)}
              title="Kéo bên trong khung để di chuyển vùng cắt"
            >
              {/* Rule of thirds grid lines */}
              <div className="crop-grid-line-h1" />
              <div className="crop-grid-line-h2" />
              <div className="crop-grid-line-v1" />
              <div className="crop-grid-line-v2" />

              {/* 4 Corner handles */}
              <div
                className="crop-corner-handle crop-corner-tl"
                onMouseDown={(e) => handleStartDrag('tl', e)}
                title="Kéo góc trên-trái"
              />
              <div
                className="crop-corner-handle crop-corner-tr"
                onMouseDown={(e) => handleStartDrag('tr', e)}
                title="Kéo góc trên-phải"
              />
              <div
                className="crop-corner-handle crop-corner-bl"
                onMouseDown={(e) => handleStartDrag('bl', e)}
                title="Kéo góc dưới-trái"
              />
              <div
                className="crop-corner-handle crop-corner-br"
                onMouseDown={(e) => handleStartDrag('br', e)}
                title="Kéo góc dưới-phải"
              />

              {/* 4 Edge handles for flexible edge-by-edge cropping */}
              <div
                className="crop-edge-handle crop-edge-t"
                onMouseDown={(e) => handleStartDrag('t', e)}
                title="Kéo cạnh trên"
              />
              <div
                className="crop-edge-handle crop-edge-b"
                onMouseDown={(e) => handleStartDrag('b', e)}
                title="Kéo cạnh dưới"
              />
              <div
                className="crop-edge-handle crop-edge-l"
                onMouseDown={(e) => handleStartDrag('l', e)}
                title="Kéo cạnh trái"
              />
              <div
                className="crop-edge-handle crop-edge-r"
                onMouseDown={(e) => handleStartDrag('r', e)}
                title="Kéo cạnh phải"
              />
            </div>
          </div>

          {/* Quick Tools & Options */}
          <div className="crop-toolbar" style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCenter}
                title="Căn giữa khung cắt vào ảnh"
              >
                ⌖ Căn giữa
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetFull}
                title="Mở rộng khung cắt trọn vẹn toàn bộ ảnh"
              >
                ⤢ Chọn toàn bộ ảnh
              </button>
            </div>

            {ratioMode === 'free' && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: 'var(--text)',
                }}
              >
                <input
                  type="checkbox"
                  checked={autoAdjustPrintSize}
                  onChange={(e) => setAutoAdjustPrintSize(e.target.checked)}
                />
                <span>Khớp kích thước in trên giấy theo tỷ lệ cắt mới (tránh méo ảnh)</span>
              </label>
            )}
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
