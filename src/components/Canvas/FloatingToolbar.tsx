// ============================================================
// Floating Photo Toolbar — Quick Actions on Selected Photo
// ============================================================

import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { mmToPx } from '../../utils/units';
import { getRotatedBoundingBox } from '../../utils/geometry';
import type { PrintObject } from '../../types';
import './Canvas.css';

interface FloatingToolbarProps {
  selectedObj: PrintObject;
  zoom: number;
  canvasWidthPx: number;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  selectedObj,
  zoom,
  canvasWidthPx,
}) => {
  const openCropEditor = useProjectStore((s) => s.openCropEditor);
  const rotateObject = useProjectStore((s) => s.rotateObject);
  const duplicateSelected = useProjectStore((s) => s.duplicateSelected);
  const removeSelected = useProjectStore((s) => s.removeSelected);
  const lockRatio = useProjectStore((s) => s.lockRatio);
  const toggleLockRatio = useProjectStore((s) => s.toggleLockRatio);
  const showToast = useProjectStore((s) => s.showToast);

  // Accurate bounding box calculation in screen pixels for any rotation angle
  const bbox = getRotatedBoundingBox(
    selectedObj.xMm,
    selectedObj.yMm,
    selectedObj.widthMm,
    selectedObj.heightMm,
    selectedObj.rotation
  );

  const rawCenterXPx = mmToPx(bbox.centerX) * zoom;
  // Clamp within paper width with 130px padding so it doesn't get clipped
  const centerXPx = Math.max(130, Math.min(canvasWidthPx * zoom - 130, rawCenterXPx));

  const topBboxPx = mmToPx(bbox.minY) * zoom;
  const bottomBboxPx = mmToPx(bbox.maxY) * zoom;
  // If there's enough space above the photo (> 42px), place it above; otherwise place it below
  const isAbove = topBboxPx >= 44;
  const topPx = isAbove ? topBboxPx - 42 : bottomBboxPx + 8;

  const handleRotate90 = (e: React.MouseEvent) => {
    e.stopPropagation();
    rotateObject(selectedObj.id, 90);
    const newRot = ((selectedObj.rotation + 90) % 360 + 360) % 360;
    showToast(`Đã xoay quanh tâm 90° (${newRot}°)`);
  };

  const handleCrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetRatio = selectedObj.widthMm / (selectedObj.heightMm || 1);
    openCropEditor(selectedObj.id, targetRatio);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateSelected(1);
    showToast('Đã nhân bản thêm 1 ảnh');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeSelected();
    showToast('Đã xóa ảnh');
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLockRatio();
    showToast(lockRatio ? 'Đã mở khóa: Tự do kéo méo' : 'Đã khóa: Giữ nguyên tỷ lệ');
  };

  return (
    <div
      className={`floating-photo-toolbar ${isAbove ? 'pos-above' : 'pos-below'}`}
      style={{
        left: `${centerXPx}px`,
        top: `${topPx}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Crop button */}
      <button
        type="button"
        className="floating-toolbar-btn"
        onClick={handleCrop}
        title="Cắt ảnh (Crop)"
      >
        <span>✂️</span>
        <span className="floating-btn-text">Cắt</span>
      </button>

      {/* Rotate button */}
      <button
        type="button"
        className="floating-toolbar-btn"
        onClick={handleRotate90}
        title="Xoay ảnh 90°"
      >
        <span>⤾</span>
        <span className="floating-btn-text">Xoay</span>
      </button>

      {/* Duplicate button */}
      <button
        type="button"
        className="floating-toolbar-btn"
        onClick={handleDuplicate}
        title="Nhân bản thêm ảnh (Ctrl+D)"
      >
        <span>📋</span>
        <span className="floating-btn-text">Nhân bản</span>
      </button>

      {/* Aspect Ratio Lock Toggle */}
      <button
        type="button"
        className={`floating-toolbar-btn ${lockRatio ? 'is-locked' : 'is-unlocked'}`}
        onClick={handleToggleLock}
        title={lockRatio ? 'Đang khóa tỷ lệ (bấm để mở kéo méo)' : 'Đang mở khóa (bấm để khóa giữ dáng)'}
      >
        <span>{lockRatio ? '🔒' : '🔓'}</span>
        <span className="floating-btn-text">{lockRatio ? 'Khóa' : 'Tự do'}</span>
      </button>

      <div className="floating-toolbar-divider" />

      {/* Delete button */}
      <button
        type="button"
        className="floating-toolbar-btn btn-delete"
        onClick={handleDelete}
        title="Xóa ảnh này (Delete)"
      >
        <span>🗑️</span>
      </button>
    </div>
  );
};
