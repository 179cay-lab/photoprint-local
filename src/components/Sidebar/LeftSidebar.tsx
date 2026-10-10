// ============================================================
// Left Sidebar — Image Upload & Size Presets
// ============================================================

import { useRef, useCallback } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { loadImageFile, isAcceptedImage } from '../../utils/image';
import { SIZE_PRESETS, ACCEPTED_EXTENSIONS } from '../../constants/paper';
import { cmToMm } from '../../utils/units';
import './Sidebar.css';

export function LeftSidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openSizePicker = useProjectStore((s) => s.openSizePicker);
  const setLastUsedSize = useProjectStore((s) => s.setLastUsedSize);
  const objects = useProjectStore((s) => s.objects);
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  const selectedObjectIds = useProjectStore((s) => s.selectedObjectIds);
  const updateObject = useProjectStore((s) => s.updateObject);
  const pushUndo = useProjectStore((s) => s.pushUndo);
  const showToast = useProjectStore((s) => s.showToast);
  const runAutoLayout = useProjectStore((s) => s.runAutoLayout);

  const targetIds =
    selectedObjectIds && selectedObjectIds.length > 0
      ? selectedObjectIds
      : selectedObjectId
      ? [selectedObjectId]
      : [];
  const selectedCount = targetIds.length;
  const singleSelectedObj = selectedCount === 1 ? objects.find((o) => o.id === targetIds[0]) : null;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter(isAcceptedImage);
      if (imageFiles.length === 0) return;

      const loaded = await Promise.all(
        imageFiles.map(async (f) => {
          const result = await loadImageFile(f);
          return { ...result, fileName: f.name };
        })
      );

      openSizePicker(loaded);
    },
    [openSizePicker]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /** Click preset → if object(s) selected, resize them immediately; if none selected, open file picker */
  const handlePresetClick = (preset: typeof SIZE_PRESETS[number]) => {
    if (targetIds.length > 0) {
      pushUndo();
      const widthMm = cmToMm(preset.widthCm);
      const heightMm = cmToMm(preset.heightCm);
      targetIds.forEach((id) => {
        updateObject(id, { widthMm, heightMm });
      });
      showToast(
        targetIds.length === 1
          ? `Đã đổi cỡ ảnh thành ${preset.label} cm`
          : `Đã đổi cỡ ${targetIds.length} ảnh thành ${preset.label} cm`
      );
    } else {
      setLastUsedSize({ widthMm: cmToMm(preset.widthCm), heightMm: cmToMm(preset.heightCm) });
      fileInputRef.current?.click();
    }
  };

  const isMatchingPreset = (preset: typeof SIZE_PRESETS[number]) => {
    if (!singleSelectedObj) return false;
    const targetWMm = cmToMm(preset.widthCm);
    const targetHMm = cmToMm(preset.heightCm);
    return (
      (Math.abs(singleSelectedObj.widthMm - targetWMm) < 0.5 &&
        Math.abs(singleSelectedObj.heightMm - targetHMm) < 0.5) ||
      (Math.abs(singleSelectedObj.widthMm - targetHMm) < 0.5 &&
        Math.abs(singleSelectedObj.heightMm - targetWMm) < 0.5)
    );
  };

  return (
    <aside className="sidebar sidebar-left">
      {/* Upload Section */}
      <div className="sidebar-section">
        <button
          className="btn btn-primary btn-block btn-lg upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          📷 Thêm ảnh
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={handleFileInput}
          className="sr-only"
        />
      </div>

      {/* Drop Zone */}
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="drop-zone-content">
          <span className="drop-zone-icon">📁</span>
          <span className="drop-zone-text">Kéo ảnh vào đây</span>
          <span className="drop-zone-hint">JPG, PNG, WEBP</span>
        </div>
      </div>

      <div className="divider" />

      {/* Quick Size Presets */}
      <div className="sidebar-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="label" style={{ marginBottom: 0 }}>Kích thước nhanh</div>
          {selectedCount > 0 && (
            <span
              style={{
                fontSize: '10px',
                color: 'var(--primary)',
                fontWeight: 600,
                background: 'rgba(37, 99, 235, 0.1)',
                padding: '1px 6px',
                borderRadius: '10px',
              }}
            >
              Chọn {selectedCount} ảnh
            </span>
          )}
        </div>
        <div className="size-presets">
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className={`btn ${
                selectedCount > 0 && isMatchingPreset(preset)
                  ? 'btn-primary'
                  : 'btn-secondary'
              } size-preset-btn`}
              onClick={() => handlePresetClick(preset)}
              title={
                selectedCount > 0
                  ? `Đổi kích thước ảnh đang chọn sang ${preset.label} (${preset.widthCm}×${preset.heightCm} cm)`
                  : `Thêm ảnh mới kích thước ${preset.label} (${preset.widthCm}×${preset.heightCm} cm)`
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {selectedCount > 0
            ? '💡 Bấm nút để đổi ngay cỡ ảnh đang chọn'
            : '💡 Bấm để chọn file ảnh mới theo cỡ chuẩn'}
        </p>
      </div>

      <div className="divider" />

      {/* Auto Layout */}
      <div className="sidebar-section">
        <button
          className="btn btn-secondary btn-block"
          onClick={runAutoLayout}
          disabled={objects.length === 0}
        >
          📐 Tự động xếp
        </button>
      </div>

      {/* Object List */}
      {objects.length > 0 && (
        <>
          <div className="divider" />
          <div className="sidebar-section">
            <div className="label">Ảnh trên giấy ({objects.length})</div>
            <div className="object-list">
              {objects.map((obj, i) => (
                <ObjectListItem key={obj.id} obj={obj} index={i} />
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function ObjectListItem({
  obj,
  index,
}: {
  obj: { id: string; fileName: string; widthMm: number; heightMm: number; sourceImageDataUrl: string };
  index: number;
}) {
  const selectObject = useProjectStore((s) => s.selectObject);
  const selectedId = useProjectStore((s) => s.selectedObjectId);

  return (
    <div
      className={`object-list-item ${selectedId === obj.id ? 'selected' : ''}`}
      onClick={() => selectObject(obj.id)}
    >
      <img
        src={obj.sourceImageDataUrl}
        alt={obj.fileName}
        className="object-list-thumb"
      />
      <div className="object-list-info">
        <span className="object-list-name truncate">
          Ảnh {index + 1}
        </span>
        <span className="object-list-size">
          {(obj.widthMm / 10).toFixed(1)}×{(obj.heightMm / 10).toFixed(1)} cm
        </span>
      </div>
    </div>
  );
}
