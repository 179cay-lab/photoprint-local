// ============================================================
// Floating Photo Toolbar — Quick Actions on Selected Photo
// ============================================================

import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { mmToPx } from '../../utils/units';
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
  const updateObject = useProjectStore((s) => s.updateObject);
  const duplicateSelected = useProjectStore((s) => s.duplicateSelected);
  const removeSelected = useProjectStore((s) => s.removeSelected);
  const lockRatio = useProjectStore((s) => s.lockRatio);
  const toggleLockRatio = useProjectStore((s) => s.toggleLockRatio);
  const pushUndo = useProjectStore((s) => s.pushUndo);
  const showToast = useProjectStore((s) => s.showToast);

  // Position calculation in screen pixels
  const objLeftPx = mmToPx(selectedObj.xMm) * zoom;
  const objTopPx = mmToPx(selectedObj.yMm) * zoom;
  const objWidthPx = mmToPx(selectedObj.widthMm) * zoom;
  const objHeightPx = mmToPx(selectedObj.heightMm) * zoom;

  // Center horizontally over the object
  const rawCenterXPx = objLeftPx + objWidthPx / 2;
  // Clamp within paper width with 130px padding so it doesn't get clipped
  const centerXPx = Math.max(130, Math.min(canvasWidthPx * zoom - 130, rawCenterXPx));

  // If there's enough space above the photo (> 42px), place it above; otherwise place it below
  const isAbove = objTopPx >= 44;
  const topPx = isAbove ? objTopPx - 42 : objTopPx + objHeightPx + 8;

  const handleRotate90 = (e: React.MouseEvent) => {
    e.stopPropagation();
    pushUndo();
    const newRotation = (selectedObj.rotation + 90) % 360;
    updateObject(selectedObj.id, { rotation: newRotation });
    showToast(`Đã xoay 90° (${newRotation}°)`);
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
