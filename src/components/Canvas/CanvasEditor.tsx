// ============================================================
// Canvas Editor — Main Fabric.js Canvas
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { Canvas, FabricImage, ActiveSelection } from 'fabric';
import { useProjectStore } from '../../store/useProjectStore';
import { PAPER_SIZES, ACCEPTED_EXTENSIONS } from '../../constants/paper';
import { mmToPx, pxToMm } from '../../utils/units';
import { colorDataToCSSFilter, isDefaultColor } from '../../utils/color';
import { loadImageFile, isAcceptedImage } from '../../utils/image';
import { Ruler } from './Ruler';
import './Canvas.css';

export function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSyncingRef = useRef(false);

  const paperSize = useProjectStore((s) => s.paperSize);
  const objects = useProjectStore((s) => s.objects);
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  const selectedObjectIds = useProjectStore((s) => s.selectedObjectIds);
  const selectObjects = useProjectStore((s) => s.selectObjects);
  const updateObject = useProjectStore((s) => s.updateObject);
  const pushUndo = useProjectStore((s) => s.pushUndo);
  const zoom = useProjectStore((s) => s.zoom);
  const setZoom = useProjectStore((s) => s.setZoom);
  const openSizePicker = useProjectStore((s) => s.openSizePicker);

  // Border & Aspect ratio lock settings
  const borderEnabled = useProjectStore((s) => s.borderEnabled);
  const borderWidthMm = useProjectStore((s) => s.borderWidthMm);
  const borderColor = useProjectStore((s) => s.borderColor);
  const lockRatio = useProjectStore((s) => s.lockRatio);

  const paper = PAPER_SIZES[paperSize];
  const canvasWidthPx = mmToPx(paper.widthMm);
  const canvasHeightPx = mmToPx(paper.heightMm);

  // Helper to extract objectId safely
  const getObjId = (target: unknown): string | null => {
    return (target as { data?: { objectId?: string } })?.data?.objectId || null;
  };

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: canvasWidthPx,
      height: canvasHeightPx,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Selection events
    const syncSelection = () => {
      if (isSyncingRef.current) return;
      const activeObjs = canvas.getActiveObjects();
      const ids: string[] = [];
      activeObjs.forEach((o) => {
        const id = getObjId(o);
        if (id) ids.push(id);
      });
      selectObjects(ids);
    };

    canvas.on('selection:created', syncSelection);
    canvas.on('selection:updated', syncSelection);
    canvas.on('selection:cleared', () => {
      if (isSyncingRef.current) return;
      selectObjects([]);
    });

    // Object modified (move, resize, rotate)
    canvas.on('object:modified', (e) => {
      if (isSyncingRef.current) return;
      const target = e.target;
      if (!target) return;

      pushUndo();

      const activeObjs = canvas.getActiveObjects();
      if (activeObjs.length > 1) {
        // Multiple objects moved / transformed together
        activeObjs.forEach((child) => {
          const childId = getObjId(child);
          if (!childId) return;

          const point = child.getPointByOrigin('left', 'top');
          const visualWidth = (child.width || 0) * (child.scaleX || 1);
          const visualHeight = (child.height || 0) * (child.scaleY || 1);

          updateObject(childId, {
            xMm: pxToMm(point.x),
            yMm: pxToMm(point.y),
            widthMm: pxToMm(visualWidth),
            heightMm: pxToMm(visualHeight),
            rotation: child.angle || 0,
          });
        });
      } else {
        const id = getObjId(target);
        if (!id) return;

        const left = target.left || 0;
        const top = target.top || 0;
        const scaleX = target.scaleX || 1;
        const scaleY = target.scaleY || 1;
        const angle = target.angle || 0;

        const visualWidth = (target.width || 0) * scaleX;
        const visualHeight = (target.height || 0) * scaleY;

        updateObject(id, {
          xMm: pxToMm(left),
          yMm: pxToMm(top),
          widthMm: pxToMm(visualWidth),
          heightMm: pxToMm(visualHeight),
          rotation: angle,
        });
      }
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [paperSize]); // Re-init when paper size changes

  // Sync objects, sizes, crops, borders, and controls to Fabric canvas
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    isSyncingRef.current = true;

    // CRITICAL FIX FOR MULTI-SELECTION ALIGNMENT JUMPING:
    // In Fabric.js, objects inside an ActiveSelection group have local coordinates relative to the group center.
    // We MUST discard active selection before updating object coordinates, then restore selection afterwards.
    const previouslySelectedIds = canvas
      .getActiveObjects()
      .map((o) => getObjId(o))
      .filter(Boolean) as string[];

    const activeObj = canvas.getActiveObject();
    const isMultiSelection = activeObj instanceof ActiveSelection;

    // Only discard if multiple objects are grouped into an ActiveSelection
    // For single object selection, we keep it active so slider dragging doesn't flicker
    if (isMultiSelection) {
      canvas.discardActiveObject();
    }

    // Get current fabric objects
    const fabricObjects = canvas.getObjects();
    const storeIds = new Set(objects.map((o) => o.id));

    // Remove fabric objects that no longer exist in store
    fabricObjects.forEach((fo) => {
      const id = getObjId(fo);
      if (id && !storeIds.has(id)) {
        canvas.remove(fo);
      }
    });

    // Add or update objects
    const promises = objects.map(async (obj) => {
      const existing = fabricObjects.find((fo) => getObjId(fo) === obj.id);

      const applyImageCropAndSize = (targetImg: FabricImage) => {
        const el = targetImg.getElement();
        const origW =
          (el as HTMLImageElement)?.naturalWidth ||
          targetImg.getOriginalSize().width ||
          targetImg.width ||
          1;
        const origH =
          (el as HTMLImageElement)?.naturalHeight ||
          targetImg.getOriginalSize().height ||
          targetImg.height ||
          1;

        const cropX = Math.round((obj.crop.x || 0) * origW);
        const cropY = Math.round((obj.crop.y || 0) * origH);
        const cropW = Math.max(1, Math.round((obj.crop.width || 1) * origW));
        const cropH = Math.max(1, Math.round((obj.crop.height || 1) * origH));

        const targetWidth = mmToPx(obj.widthMm);
        const targetHeight = mmToPx(obj.heightMm);

        targetImg.set({
          cropX,
          cropY,
          width: cropW,
          height: cropH,
          scaleX: targetWidth / cropW,
          scaleY: targetHeight / cropH,
          left: mmToPx(obj.xMm),
          top: mmToPx(obj.yMm),
          angle: obj.rotation,
          clipPath: undefined,
          // Photoshop-style control handles
          lockUniScaling: lockRatio,
          cornerColor: '#2563eb',
          cornerStrokeColor: '#ffffff',
          cornerSize: 11,
          cornerStyle: 'rect',
          transparentCorners: false,
          borderColor: '#2563eb',
          borderScaleFactor: 1.5,
          hasControls: true,
          hasBorders: true,
          padding: 1,
        });

        // Control handle visibility:
        // When lockRatio = true: only corner handles are active (keeps aspect ratio).
        // When lockRatio = false: edge handles (ml, mr, mt, mb) appear to stretch / squish freely.
        targetImg.setControlsVisibility({
          tl: true,
          tr: true,
          bl: true,
          br: true,
          ml: !lockRatio,
          mr: !lockRatio,
          mt: !lockRatio,
          mb: !lockRatio,
          mtr: true,
        });

        // Cutting border (viền đen cắt ảnh thẻ)
        if (borderEnabled && borderWidthMm > 0) {
          targetImg.set({
            stroke: borderColor,
            strokeWidth: mmToPx(borderWidthMm),
            strokeUniform: true,
          });
        } else {
          targetImg.set({
            stroke: undefined,
            strokeWidth: 0,
          });
        }

        // Real-time live color filters on canvas
        const filterStr = !isDefaultColor(obj.color) ? colorDataToCSSFilter(obj.color) : 'none';
        (targetImg as any)._cssFilter = filterStr;
        targetImg.objectCaching = false;
        (targetImg as any).dirty = true;

        if (!(targetImg as any)._hasFilterHook) {
          (targetImg as any)._hasFilterHook = true;
          const origRenderFill = (targetImg as any)._renderFill.bind(targetImg);
          (targetImg as any)._renderFill = function (ctx: CanvasRenderingContext2D) {
            const filter = (this as any)._cssFilter;
            const hasFilter = filter && filter !== 'none';
            if (hasFilter) {
              const prevFilter = ctx.filter;
              ctx.filter = filter;
              origRenderFill(ctx);
              ctx.filter = prevFilter || 'none';
            } else {
              origRenderFill(ctx);
            }
          };
        }

        targetImg.setCoords();
      };

      if (existing) {
        if (existing instanceof FabricImage) {
          applyImageCropAndSize(existing);
        } else {
          existing.set({
            left: mmToPx(obj.xMm),
            top: mmToPx(obj.yMm),
            angle: obj.rotation,
          });
          existing.setCoords();
        }
      } else {
        // Create new fabric image
        try {
          const img = await FabricImage.fromURL(obj.sourceImageDataUrl, {
            crossOrigin: 'anonymous',
          });

          img.set({
            data: { objectId: obj.id },
          } as Record<string, unknown>);

          applyImageCropAndSize(img);
          canvas.add(img);
        } catch (err) {
          console.error('Failed to load image to canvas:', err);
        }
      }
    });

    Promise.all(promises).then(() => {
      // Re-apply selection to objects after coordinates and dimensions have been cleanly applied
      const targetIds =
        previouslySelectedIds.length > 0
          ? previouslySelectedIds
          : selectedObjectIds.length > 0
          ? selectedObjectIds
          : selectedObjectId
          ? [selectedObjectId]
          : [];

      if (targetIds.length > 1) {
        const toSelect = canvas.getObjects().filter((fo) => {
          const id = getObjId(fo);
          return id && targetIds.includes(id);
        });
        if (toSelect.length > 1) {
          const newSel = new ActiveSelection(toSelect, { canvas });
          canvas.setActiveObject(newSel);
        }
      } else if (targetIds.length === 1 && !canvas.getActiveObject()) {
        const toSelect = canvas.getObjects().find((fo) => getObjId(fo) === targetIds[0]);
        if (toSelect) {
          canvas.setActiveObject(toSelect);
        }
      }

      canvas.requestRenderAll();
      isSyncingRef.current = false;
    });
  }, [objects, borderEnabled, borderWidthMm, borderColor, lockRatio]);

  // Sync selection highlight when selected IDs change from store
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || isSyncingRef.current) return;

    if (selectedObjectIds && selectedObjectIds.length > 1) {
      const targets = canvas.getObjects().filter((fo) => {
        const id = getObjId(fo);
        return id && selectedObjectIds.includes(id);
      });

      if (targets.length > 1) {
        const currentActive = canvas.getActiveObjects();
        const isSame =
          currentActive.length === targets.length &&
          targets.every((t) => currentActive.includes(t));

        if (!isSame) {
          const sel = new ActiveSelection(targets, { canvas });
          canvas.setActiveObject(sel);
          canvas.requestRenderAll();
        }
        return;
      }
    }

    const singleId = selectedObjectId || (selectedObjectIds && selectedObjectIds[0]);
    if (singleId) {
      const target = canvas.getObjects().find((fo) => getObjId(fo) === singleId);
      if (target && canvas.getActiveObject() !== target) {
        canvas.setActiveObject(target);
        canvas.requestRenderAll();
      }
    } else {
      if (canvas.getActiveObject()) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  }, [selectedObjectId, selectedObjectIds]);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(zoom + delta);
      }
    },
    [zoom, setZoom]
  );

  // Handle drag & drop on canvas
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files).filter(isAcceptedImage);
        if (files.length === 0) return;

        const loaded = await Promise.all(
          files.map(async (f) => {
            const result = await loadImageFile(f);
            return { ...result, fileName: f.name };
          })
        );
        openSizePicker(loaded);
      }
    },
    [openSizePicker]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle direct file input on canvas
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(isAcceptedImage);
      if (files.length === 0) return;
      const loaded = await Promise.all(
        files.map(async (f) => {
          const res = await loadImageFile(f);
          return { ...res, fileName: f.name };
        })
      );
      openSizePicker(loaded);
      e.target.value = '';
    }
  };

  // Find currently selected object for ruler highlights
  const selectedObj = objects.find((o) => o.id === selectedObjectId);
  const horizontalHighlight = selectedObj
    ? { startMm: selectedObj.xMm, lengthMm: selectedObj.widthMm }
    : null;
  const verticalHighlight = selectedObj
    ? { startMm: selectedObj.yMm, lengthMm: selectedObj.heightMm }
    : null;

  const marginEnabled = useProjectStore((s) => s.marginEnabled);
  const marginMm = useProjectStore((s) => s.marginMm);

  return (
    <div className="canvas-wrapper" ref={containerRef}>
      {/* Hidden file input for click-to-upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />

      <div
        className="canvas-scroll-area"
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="canvas-paper-board">
          {/* Top-left corner */}
          <div className="ruler-corner" title="Đơn vị: centimet (cm)">
            <span>cm</span>
          </div>

          {/* Horizontal Ruler on top of paper */}
          <Ruler
            orientation="horizontal"
            lengthMm={paper.widthMm}
            zoom={zoom}
            highlightRange={horizontalHighlight}
          />

          {/* Vertical Ruler on left of paper */}
          <Ruler
            orientation="vertical"
            lengthMm={paper.heightMm}
            zoom={zoom}
            highlightRange={verticalHighlight}
          />

          {/* Paper sheet */}
          <div
            className="canvas-paper"
            style={{
              width: canvasWidthPx * zoom,
              height: canvasHeightPx * zoom,
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            />

            {/* Safe Margin Guide Line */}
            {marginEnabled && marginMm > 0 && (
              <div
                className="canvas-safe-margin-guide"
                style={{
                  position: 'absolute',
                  left: mmToPx(marginMm) * zoom,
                  top: mmToPx(marginMm) * zoom,
                  width: (canvasWidthPx - mmToPx(marginMm * 2)) * zoom,
                  height: (canvasHeightPx - mmToPx(marginMm * 2)) * zoom,
                  border: '1.5px dashed #3b82f6',
                  pointerEvents: 'none',
                  boxSizing: 'border-box',
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 6,
                    fontSize: '10px',
                    color: '#2563eb',
                    background: 'rgba(255, 255, 255, 0.85)',
                    padding: '1px 4px',
                    borderRadius: '2px',
                    userSelect: 'none',
                  }}
                >
                  Lề an toàn: {(marginMm / 10).toFixed(1)} cm
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty State Overlay: Click directly to pick photos! */}
      {objects.length === 0 && (
        <div
          className="canvas-empty-overlay"
          onClick={() => fileInputRef.current?.click()}
          title="Bấm vào đây để chọn ảnh từ máy tính"
        >
          <div className="canvas-empty-content">
            <span className="canvas-empty-icon">📷</span>
            <span className="canvas-empty-text">
              Bấm vào đây để chọn ảnh từ máy tính
            </span>
            <span className="canvas-empty-hint">
              hoặc kéo thả ảnh trực tiếp vào tờ giấy này • Khổ {paperSize} ({paper.widthMm / 10} × {paper.heightMm / 10} cm)
            </span>
            <button
              type="button"
              className="btn btn-primary btn-md"
              style={{ marginTop: '8px', pointerEvents: 'none' }}
            >
              📂 Mở ảnh ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
