// ============================================================
// Size Picker Dialog — Live Crop Preview & Proportional Sizing
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { SIZE_PRESETS, PAPER_SIZES } from '../../constants/paper';
import { DEFAULT_COLOR } from '../../types';
import type { CropData } from '../../types';
import { cmToMm, mmToCm } from '../../utils/units';
import { isSameAspectRatio } from '../../utils/image';
import './Dialogs.css';

export function SizePickerDialog() {
  const pendingImages = useProjectStore((s) => s.pendingImages);
  const closeSizePicker = useProjectStore((s) => s.closeSizePicker);
  const addObject = useProjectStore((s) => s.addObject);
  const runAutoLayout = useProjectStore((s) => s.runAutoLayout);
  const setLastUsedSize = useProjectStore((s) => s.setLastUsedSize);
  const lastUsedSize = useProjectStore((s) => s.lastUsedSize);
  const openCropEditor = useProjectStore((s) => s.openCropEditor);
  const paperSize = useProjectStore((s) => s.paperSize);
  const setPaperSize = useProjectStore((s) => s.setPaperSize);
  const marginEnabled = useProjectStore((s) => s.marginEnabled);
  const marginMm = useProjectStore((s) => s.marginMm);

  // Paper boundary measurements
  const paper = PAPER_SIZES[paperSize];
  const maxPaperWCm = paper.widthMm / 10;
  const maxPaperHCm = paper.heightMm / 10;
  const safeMarginCm = marginEnabled ? marginMm / 10 : 0;
  const usableWCm = maxPaperWCm - 2 * safeMarginCm;
  const usableHCm = maxPaperHCm - 2 * safeMarginCm;

  // Selected image index if multiple images uploaded
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);

  // Size selections (in cm)
  // On A5, if previously saved size is too big (>14.8cm), default to 4x6cm
  const rawInitialW = lastUsedSize ? mmToCm(lastUsedSize.widthMm) : 4;
  const rawInitialH = lastUsedSize ? mmToCm(lastUsedSize.heightMm) : 6;
  const isA5Oversize = paperSize === 'A5' && (rawInitialW > usableWCm && rawInitialW > usableHCm);
  const initialW = isA5Oversize ? 4 : rawInitialW;
  const initialH = isA5Oversize ? 6 : rawInitialH;

  const [widthCm, setWidthCm] = useState<number>(initialW);
  const [heightCm, setHeightCm] = useState<number>(initialH);
  const [widthInput, setWidthInput] = useState<string>(String(initialW));
  const [heightInput, setHeightInput] = useState<string>(String(initialH));
  const [copies, setCopies] = useState<number>(1);

  // Mode: 'fill' = crop edges to match exact target print size (no distortion, 100% free size!)
  //       'fit' = keep 100% whole original image, calculate print height from width
  const [fitMode, setFitMode] = useState<'fill' | 'fit'>('fill');

  // Crop frame scaling factor (0.3 to 1.0)
  const [cropScale, setCropScale] = useState<number>(1.0);

  // Local crop offset state (normalized 0-1)
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [previewBoxSize, setPreviewBoxSize] = useState({ width: 340, height: 300 });

  // Dragging state
  const isDraggingRef = useRef<boolean>(false);
  const dragStartMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartCrop = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeImg = pendingImages[selectedImageIdx] || pendingImages[0];
  const imgW = activeImg?.width || 1000;
  const imgH = activeImg?.height || 1000;
  const imgRatio = imgW / imgH;

  // Active width & height are direct user values — no forcing Math.min/Math.max!
  const printWidthCm = widthCm;
  const printHeightCm = heightCm;
  const isLandscape = widthCm > heightCm;

  const printWidthMm = cmToMm(printWidthCm);
  const printHeightMm = cmToMm(printHeightCm);
  const targetRatio = printWidthMm / (printHeightMm || 1);

  const hasMismatch = !isSameAspectRatio(imgRatio, targetRatio, 0.03);

  // Measure preview container
  useEffect(() => {
    if (!previewBoxRef.current) return;
    const updateSize = () => {
      if (previewBoxRef.current) {
        setPreviewBoxSize({
          width: previewBoxRef.current.clientWidth,
          height: previewBoxRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute displayed image size inside preview box
  const previewScale = Math.min(
    (previewBoxSize.width - 24) / imgW,
    (previewBoxSize.height - 24) / imgH
  );
  const displayedImgW = imgW * previewScale;
  const displayedImgH = imgH * previewScale;
  const offsetX = (previewBoxSize.width - displayedImgW) / 2;
  const offsetY = (previewBoxSize.height - displayedImgH) / 2;

  // Base crop box dimensions for 'fill' mode
  const getBaseCropDimensions = useCallback(() => {
    if (imgRatio >= targetRatio) {
      return {
        baseW: targetRatio / imgRatio,
        baseH: 1.0,
      };
    } else {
      return {
        baseW: 1.0,
        baseH: imgRatio / targetRatio,
      };
    }
  }, [imgRatio, targetRatio]);

  const [lockRatio, setLockRatio] = useState<boolean>(false);

  // Reset / center crop whenever preset or mode changes
  const resetCropToCenter = useCallback(() => {
    const { baseW, baseH } = getBaseCropDimensions();
    const curW = baseW * cropScale;
    const curH = baseH * cropScale;
    setCropOffset({
      x: (1 - curW) / 2,
      y: (1 - curH) / 2,
    });
  }, [getBaseCropDimensions, cropScale]);

  useEffect(() => {
    resetCropToCenter();
  }, [widthCm, heightCm, fitMode, selectedImageIdx]);

  const handleWidthChange = (valStr: string) => {
    setWidthInput(valStr);
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0) {
      setWidthCm(val);
      if (lockRatio) {
        // Chỉ khi người dùng chủ động bật "Khóa tỷ lệ"
        const currentRatio = widthCm > 0 && heightCm > 0 ? widthCm / heightCm : imgRatio;
        const calcH = parseFloat((val / currentRatio).toFixed(1));
        setHeightCm(calcH);
        setHeightInput(String(calcH));
      } else {
        // Chế độ Free Size: luôn đặt fitMode = 'fill' để tự do crop theo kích thước nhập
        if (fitMode !== 'fill') setFitMode('fill');
      }
    }
  };

  const handleWidthBlur = () => {
    const val = parseFloat(widthInput);
    if (isNaN(val) || val <= 0) {
      setWidthInput(String(widthCm));
    } else {
      setWidthCm(val);
      setWidthInput(String(val));
    }
  };

  const handleHeightChange = (valStr: string) => {
    setHeightInput(valStr);
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0) {
      setHeightCm(val);
      if (lockRatio) {
        // Chỉ khi người dùng chủ động bật "Khóa tỷ lệ"
        const currentRatio = widthCm > 0 && heightCm > 0 ? widthCm / heightCm : imgRatio;
        const calcW = parseFloat((val * currentRatio).toFixed(1));
        setWidthCm(calcW);
        setWidthInput(String(calcW));
      } else {
        // Chế độ Free Size: luôn đặt fitMode = 'fill' để tự do crop theo kích thước nhập
        if (fitMode !== 'fill') setFitMode('fill');
      }
    }
  };

  const handleHeightBlur = () => {
    const val = parseFloat(heightInput);
    if (isNaN(val) || val <= 0) {
      setHeightInput(String(heightCm));
    } else {
      setHeightCm(val);
      setHeightInput(String(val));
    }
  };

  const setPortrait = () => {
    if (widthCm > heightCm) {
      const w = heightCm;
      const h = widthCm;
      setWidthCm(w);
      setHeightCm(h);
      setWidthInput(String(w));
      setHeightInput(String(h));
    }
  };

  const setLandscape = () => {
    if (heightCm > widthCm) {
      const w = heightCm;
      const h = widthCm;
      setWidthCm(w);
      setHeightCm(h);
      setWidthInput(String(w));
      setHeightInput(String(h));
    }
  };

  const swapOrientation = () => {
    const w = heightCm;
    const h = widthCm;
    setWidthCm(w);
    setHeightCm(h);
    setWidthInput(String(w));
    setHeightInput(String(h));
  };

  if (pendingImages.length === 0) return null;

  // Current active crop
  const { baseW, baseH } = getBaseCropDimensions();
  const curCropW = fitMode === 'fit' ? 1.0 : baseW * cropScale;
  const curCropH = fitMode === 'fit' ? 1.0 : baseH * cropScale;
  const curCropX = fitMode === 'fit' ? 0 : Math.max(0, Math.min(1 - curCropW, cropOffset.x));
  const curCropY = fitMode === 'fit' ? 0 : Math.max(0, Math.min(1 - curCropH, cropOffset.y));

  const activeCrop: CropData = {
    x: curCropX,
    y: curCropY,
    width: curCropW,
    height: curCropH,
  };

  // Pixel coordinates in preview container
  const boxLeft = offsetX + curCropX * displayedImgW;
  const boxTop = offsetY + curCropY * displayedImgH;
  const boxWidth = curCropW * displayedImgW;
  const boxHeight = curCropH * displayedImgH;

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (fitMode === 'fit') return;
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    dragStartCrop.current = { x: curCropX, y: curCropY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || fitMode === 'fit') return;
    const dxPx = e.clientX - dragStartMouse.current.x;
    const dyPx = e.clientY - dragStartMouse.current.y;

    const dxNorm = dxPx / displayedImgW;
    const dyNorm = dyPx / displayedImgH;

    const newX = Math.max(0, Math.min(1 - curCropW, dragStartCrop.current.x + dxNorm));
    const newY = Math.max(0, Math.min(1 - curCropH, dragStartCrop.current.y + dyNorm));

    setCropOffset({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleScaleSliderChange = (newScale: number) => {
    const curCenterX = curCropX + curCropW / 2;
    const curCenterY = curCropY + curCropH / 2;

    const newW = baseW * newScale;
    const newH = baseH * newScale;

    const newX = Math.max(0, Math.min(1 - newW, curCenterX - newW / 2));
    const newY = Math.max(0, Math.min(1 - newH, curCenterY - newH / 2));

    setCropScale(newScale);
    setCropOffset({ x: newX, y: newY });
  };

  const handleSelectPreset = (w: number, h: number) => {
    const targetW = isLandscape ? Math.max(w, h) : Math.min(w, h);
    const targetH = isLandscape ? Math.min(w, h) : Math.max(w, h);
    setWidthCm(targetW);
    setHeightCm(targetH);
    setWidthInput(String(targetW));
    setHeightInput(String(targetH));
    setCropScale(1.0);
    setFitMode('fill');
  };

  const handleApply = (openEditorModal = false) => {
    setLastUsedSize({ widthMm: printWidthMm, heightMm: printHeightMm });

    let lastCreatedId: string | null = null;

    // Effective dimensions per mode
    const effectiveWidthMm = printWidthMm;
    const effectiveHeightMm =
      fitMode === 'fit' ? cmToMm(parseFloat((printWidthCm / imgRatio).toFixed(2))) : printHeightMm;

    pendingImages.forEach((img) => {
      // For the active image, use the interactive crop
      // For any other pending image, calculate centered crop for that image
      const imgR = img.width / img.height;
      let finalCrop: CropData = activeCrop;

      if (fitMode === 'fit') {
        finalCrop = { x: 0, y: 0, width: 1, height: 1 };
      } else if (img !== activeImg) {
        if (imgR >= targetRatio) {
          const wFrac = targetRatio / imgR;
          finalCrop = { x: (1 - wFrac) / 2, y: 0, width: wFrac, height: 1 };
        } else {
          const hFrac = imgR / targetRatio;
          finalCrop = { x: 0, y: (1 - hFrac) / 2, width: 1, height: hFrac };
        }
      }

      for (let i = 0; i < copies; i++) {
        const id = addObject({
          type: 'image',
          sourceImageDataUrl: img.dataUrl,
          originalWidthPx: img.width,
          originalHeightPx: img.height,
          fileName: img.fileName,
          widthMm: effectiveWidthMm,
          heightMm: effectiveHeightMm,
          xMm: 10 + i * 4,
          yMm: 10 + i * 4,
          rotation: 0,
          crop: finalCrop,
          color: DEFAULT_COLOR,
        });
        lastCreatedId = id;
      }
    });

    runAutoLayout();
    closeSizePicker();

    if (openEditorModal && lastCreatedId && pendingImages.length === 1) {
      openCropEditor(lastCreatedId, targetRatio);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeSizePicker}>
      <div
        className="modal-card size-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            <span>📐 Kích thước in & Xem trước khung ảnh</span>
          </div>
          <button className="btn-icon" onClick={closeSizePicker}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Current Paper Info Bar with quick switch */}
          <div className="size-picker-paper-badge">
            <span>
              📄 Giấy in đang chọn: <strong>Khổ {paperSize}</strong> ({maxPaperWCm} × {maxPaperHCm} cm)
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#1e40af' }}>Đổi khổ:</span>
              <button
                type="button"
                className={`btn btn-sm ${paperSize === 'A4' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                onClick={() => setPaperSize('A4')}
              >
                A4
              </button>
              <button
                type="button"
                className={`btn btn-sm ${paperSize === 'A5' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                onClick={() => setPaperSize('A5')}
              >
                A5
              </button>
            </div>
          </div>

          {/* Multiple image strip if more than 1 image */}
          {pendingImages.length > 1 && (
            <div className="pending-preview-strip">
              {pendingImages.map((img, idx) => (
                <div
                  key={idx}
                  className={`pending-thumb-card ${selectedImageIdx === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedImageIdx(idx)}
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedImageIdx === idx ? 'var(--primary)' : undefined,
                  }}
                >
                  <img
                    src={img.dataUrl}
                    alt={img.fileName}
                    className="pending-thumb-img"
                  />
                  <span className="pending-thumb-name truncate">{img.fileName}</span>
                  <span className="pending-thumb-meta">
                    {img.width}×{img.height}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="size-picker-layout">
            {/* Left Column: Live Interactive Crop Preview */}
            <div className="size-picker-preview-col">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="label" style={{ margin: 0 }}>
                  Xem trước khung in
                </span>
                <span className="ratio-badge">
                  Ảnh: {imgW}×{imgH} ({(imgRatio).toFixed(2)})
                </span>
              </div>

              {/* Interactive preview box */}
              <div
                className="live-crop-preview-box"
                ref={previewBoxRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Image */}
                <img
                  src={activeImg.dataUrl}
                  alt={activeImg.fileName}
                  style={{
                    position: 'absolute',
                    left: offsetX,
                    top: offsetY,
                    width: displayedImgW,
                    height: displayedImgH,
                    pointerEvents: 'none',
                  }}
                />

                {/* Crop frame */}
                <div
                  className="crop-frame-box"
                  style={{
                    left: boxLeft,
                    top: boxTop,
                    width: boxWidth,
                    height: boxHeight,
                    cursor: fitMode === 'fit' ? 'default' : 'grab',
                  }}
                  onMouseDown={handleMouseDown}
                >
                  {/* Rule of thirds grid */}
                  <div className="crop-grid-line-h1" />
                  <div className="crop-grid-line-h2" />
                  <div className="crop-grid-line-v1" />
                  <div className="crop-grid-line-v2" />

                  {fitMode === 'fill' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 6,
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.85)',
                        background: 'rgba(0,0,0,0.5)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        pointerEvents: 'none',
                      }}
                    >
                      Kéo để căn mặt
                    </div>
                  )}
                </div>
              </div>

              {/* Crop control bar */}
              {fitMode === 'fill' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    Thu phóng:
                  </span>
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.01"
                    value={cropScale}
                    onChange={(e) => handleScaleSliderChange(parseFloat(e.target.value))}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={resetCropToCenter}
                    title="Căn khung vào giữa"
                  >
                    ⌖ Căn giữa
                  </button>
                </div>
              )}

              {/* Info banner */}
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                {fitMode === 'fill' ? (
                  <>
                    ✓ Đảm bảo in <strong>{printWidthCm}×{printHeightCm} cm</strong> chuẩn xác.
                    Ảnh <strong>không bao giờ bị méo hình</strong>. Bạn có thể kéo khung ảnh để căn vị trí đẹp nhất.
                  </>
                ) : (
                  <>
                    ✓ Giữ nguyên <strong>100% tỷ lệ ảnh gốc</strong>. Kích thước in tự tính: 
                    <strong> {printWidthCm} × {(printWidthCm / imgRatio).toFixed(1)} cm</strong> (không cắt xén).
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Size Controls & Options */}
            <div className="size-picker-controls-col">
              {/* Fit Mode Selector */}
              <div className="label">Chế độ xử lý tỷ lệ ảnh</div>
              <div className="fit-mode-selector">
                <button
                  type="button"
                  className={`fit-mode-card ${fitMode === 'fill' ? 'active' : ''}`}
                  onClick={() => setFitMode('fill')}
                >
                  <div className="fit-mode-title">
                    <span>✂️ Cắt vừa khổ in (Free Size)</span>
                  </div>
                  <div className="fit-mode-desc">
                    In chuẩn {widthCm}×{heightCm} cm theo ý bạn, tự do kéo khung căn mặt
                  </div>
                </button>

                <button
                  type="button"
                  className={`fit-mode-card ${fitMode === 'fit' ? 'active' : ''}`}
                  onClick={() => {
                    setFitMode('fit');
                    const calcH = parseFloat((widthCm / imgRatio).toFixed(1));
                    setHeightCm(calcH);
                    setHeightInput(String(calcH));
                  }}
                >
                  <div className="fit-mode-title">
                    <span>🖼️ Giữ trọn ảnh gốc</span>
                  </div>
                  <div className="fit-mode-desc">
                    In trọn vẹn không cắt góc, kích thước tự theo ảnh ({widthCm}×{(widthCm / imgRatio).toFixed(1)}cm)
                  </div>
                </button>
              </div>

              {/* Presets */}
              <div className="label">Kích thước chuẩn</div>
              <div className="preset-chip-grid">
                {SIZE_PRESETS.map((p) => {
                  const isActive =
                    (Math.abs(widthCm - p.widthCm) < 0.1 && Math.abs(heightCm - p.heightCm) < 0.1) ||
                    (Math.abs(widthCm - p.heightCm) < 0.1 && Math.abs(heightCm - p.widthCm) < 0.1);

                  return (
                    <button
                      key={p.label}
                      type="button"
                      className={`preset-chip ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectPreset(p.widthCm, p.heightCm)}
                    >
                      <span className="preset-chip-title">{p.label}</span>
                      <span className="preset-chip-sub">
                        {p.widthCm} × {p.heightCm} cm
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Size Box */}
              <div className="custom-size-box">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <span className="label" style={{ margin: 0, fontWeight: 700 }}>
                    Kích thước in tùy chỉnh (cm)
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${!lockRatio ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setLockRatio(!lockRatio)}
                      title={lockRatio ? 'Đang khóa tỷ lệ giữa Rộng và Cao' : 'Đang ở chế độ Free Size (tự do nhập Rộng × Cao theo ý)'}
                    >
                      {lockRatio ? '🔒 Khóa tỷ lệ' : '🔓 Free size'}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${!isLandscape ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={setPortrait}
                      title="Đặt hướng dọc (Cao >= Rộng)"
                    >
                      ▯ Dọc
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${isLandscape ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={setLandscape}
                      title="Đặt hướng ngang (Rộng >= Cao)"
                    >
                      ▭ Ngang
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={swapOrientation}
                      title="Hoán đổi Rộng ⇄ Cao"
                      style={{ padding: '2px 8px' }}
                    >
                      🔄 Đổi
                    </button>
                  </div>
                </div>

                <div className="custom-size-row">
                  <div className="custom-size-col">
                    <div className="prop-input-group">
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="100"
                        value={widthInput}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        onBlur={handleWidthBlur}
                        placeholder="Rộng"
                      />
                      <span className="prop-input-unit">cm rộng</span>
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>×</span>
                  <div className="custom-size-col">
                    <div className="prop-input-group">
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="100"
                        value={heightInput}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        onBlur={handleHeightBlur}
                        placeholder="Cao"
                      />
                      <span className="prop-input-unit">cm cao</span>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                  💡 Bạn có thể nhập bất kỳ kích thước nào (vd: 15×7, 10×15, 3×4,...), khung ảnh bên trái sẽ tự động cập nhật đúng tỷ lệ để bạn crop theo ý.
                </p>

                {/* Warning if photo size exceeds current paper sheet */}
                {((printWidthCm > maxPaperWCm && printWidthCm > maxPaperHCm) ||
                  (printHeightCm > maxPaperHCm && printHeightCm > maxPaperWCm) ||
                  (printWidthCm > usableWCm && printHeightCm > usableHCm && printWidthCm > usableHCm && printHeightCm > usableWCm)) && (
                  <div className="size-warning-box">
                    <span>⚠️ Kích thước ({printWidthCm}×{printHeightCm} cm) lớn hơn khổ giấy {paperSize}! Ảnh có thể bị tràn ra ngoài lề khi in. Bạn có thể đổi sang khổ A4 hoặc giảm bớt kích thước.</span>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="quantity-row" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    Số lượng bản in
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Tự động nhân bản lên giấy A4/A5
                  </div>
                </div>
                <div className="quantity-control">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="quantity-input"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCopies(copies + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closeSizePicker}>
            Hủy
          </button>
          {hasMismatch && pendingImages.length === 1 && fitMode === 'fill' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleApply(true)}
            >
              ✂️ Mở Crop Editor lớn
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleApply(false)}
          >
            ✓ Áp dụng vào giấy ({copies} bản)
          </button>
        </div>
      </div>
    </div>
  );
}
