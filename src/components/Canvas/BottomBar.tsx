// ============================================================
// Bottom Bar — Zoom, Snap, Lock Ratio & Photoshop Align Toolbar
// ============================================================

import { useProjectStore } from '../../store/useProjectStore';
import './Canvas.css';

// Photoshop-style Align & Distribute SVG Icons
const AlignLeftIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="1" width="2" height="14" rx="0.5" />
    <rect x="4" y="3" width="9" height="4" rx="0.5" fillOpacity="0.85" />
    <rect x="4" y="9" width="6" height="4" rx="0.5" fillOpacity="0.85" />
  </svg>
);

const AlignCenterHIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <rect x="7" y="1" width="2" height="14" rx="0.5" />
    <rect x="3" y="3" width="10" height="4" rx="0.5" fillOpacity="0.85" />
    <rect x="5" y="9" width="6" height="4" rx="0.5" fillOpacity="0.85" />
  </svg>
);

const AlignRightIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <rect x="13" y="1" width="2" height="14" rx="0.5" />
    <rect x="3" y="3" width="9" height="4" rx="0.5" fillOpacity="0.85" />
    <rect x="6" y="9" width="6" height="4" rx="0.5" fillOpacity="0.85" />
  </svg>
);

const AlignTopIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="1" width="14" height="2" rx="0.5" />
    <rect x="3" y="4" width="4" height="9" rx="0.5" fillOpacity="0.85" />
    <rect x="9" y="4" width="4" height="6" rx="0.5" fillOpacity="0.85" />
  </svg>
);

const AlignCenterVIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="7" width="14" height="2" rx="0.5" />
    <rect x="3" y="3" width="4" height="10" rx="0.5" fillOpacity="0.85" />
    <rect x="9" y="5" width="4" height="6" rx="0.5" fillOpacity="0.85" />
  </svg>
);

const AlignBottomIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="13" width="14" height="2" rx="0.5" />
    <rect x="3" y="3" width="4" height="9" rx="0.5" fillOpacity="0.85" />
    <rect x="9" y="6" width="4" height="6" rx="0.5" fillOpacity="0.85" />
  </svg>
);

const CenterPaperIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect
      x="1.5"
      y="1.5"
      width="13"
      height="13"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeDasharray="2 1.5"
    />
    <rect x="4.5" y="4.5" width="7" height="7" rx="0.5" fill="currentColor" />
  </svg>
);

const DistributeHIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="2" width="2" height="12" rx="0.5" />
    <rect x="7" y="4" width="2" height="8" rx="0.5" fillOpacity="0.65" />
    <rect x="13" y="2" width="2" height="12" rx="0.5" />
    <path d="M4 8h1M11 8h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const DistributeVIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <rect x="2" y="1" width="12" height="2" rx="0.5" />
    <rect x="4" y="7" width="8" height="2" rx="0.5" fillOpacity="0.65" />
    <rect x="2" y="13" width="12" height="2" rx="0.5" />
    <path d="M8 4v1M8 11v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export function BottomBar() {
  const zoom = useProjectStore((s) => s.zoom);
  const setZoom = useProjectStore((s) => s.setZoom);
  const snapEnabled = useProjectStore((s) => s.snapEnabled);
  const setSnapEnabled = useProjectStore((s) => s.setSnapEnabled);
  const alignObjects = useProjectStore((s) => s.alignObjects);
  const distributeObjects = useProjectStore((s) => s.distributeObjects);
  const objects = useProjectStore((s) => s.objects);
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  const selectedObjectIds = useProjectStore((s) => s.selectedObjectIds);
  const clearAll = useProjectStore((s) => s.clearAll);

  // Aspect ratio lock
  const lockRatio = useProjectStore((s) => s.lockRatio);
  const toggleLockRatio = useProjectStore((s) => s.toggleLockRatio);

  const selectedCount =
    selectedObjectIds && selectedObjectIds.length > 0
      ? selectedObjectIds.length
      : selectedObjectId
      ? 1
      : 0;

  return (
    <div className="bottom-bar">
      {/* Left: Zoom, Snap & Aspect Ratio Lock */}
      <div className="bottom-bar-left">
        <div className="bottom-bar-group">
          <button
            type="button"
            className="btn-icon btn-sm"
            onClick={() => setZoom(zoom - 0.1)}
            title="Thu nhỏ"
          >
            −
          </button>
          <input
            type="range"
            min="0.2"
            max="2"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="zoom-slider"
          />
          <button
            type="button"
            className="btn-icon btn-sm"
            onClick={() => setZoom(zoom + 0.1)}
            title="Phóng to"
          >
            +
          </button>
          <span className="bottom-bar-value">{Math.round(zoom * 100)}%</span>
        </div>

        <label className="checkbox-label" title="Bắt dính mép khi di chuyển">
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={(e) => setSnapEnabled(e.target.checked)}
          />
          Snap
        </label>

        {/* Lock / Unlock Aspect Ratio Button */}
        <button
          type="button"
          className={`btn btn-sm ${lockRatio ? 'btn-secondary' : 'btn-primary'}`}
          onClick={toggleLockRatio}
          title={
            lockRatio
              ? 'Đang KHÓA tỷ lệ: kéo góc giữ dáng ảnh (bấm để mở khóa kéo méo)'
              : 'Đang MỞ KHÓA: cho phép kéo méo ảnh tự do theo chiều ngang/dọc (bấm để khóa lại)'
          }
          style={{ fontSize: '11px', padding: '2px 6px' }}
        >
          {lockRatio ? '🔒 Khóa tỷ lệ' : '🔓 Tự do'}
        </button>
      </div>

      {/* Center: Photoshop Alignment Toolbar */}
      <div className="bottom-bar-center">
        {objects.length > 0 && (
          <div
            className="bottom-bar-group align-toolbar"
            title={
              selectedCount > 1
                ? `Đang chọn ${selectedCount} ảnh: căn chỉnh các ảnh này với nhau`
                : selectedCount === 1
                ? 'Đang chọn 1 ảnh: căn chỉnh ảnh với trang giấy'
                : 'Căn chỉnh tất cả ảnh trên trang'
            }
          >
            <span className="bottom-bar-label" style={{ marginRight: 2 }}>
              {selectedCount > 1 ? `Căn ${selectedCount} ảnh:` : 'Căn chỉnh:'}
            </span>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => alignObjects('left')}
              title={selectedCount > 1 ? 'Căn mép trái với nhau' : 'Căn lề trái'}
            >
              <AlignLeftIcon />
            </button>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => alignObjects('center-h')}
              title={selectedCount > 1 ? 'Căn giữa trục ngang với nhau' : 'Căn giữa ngang'}
            >
              <AlignCenterHIcon />
            </button>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => alignObjects('right')}
              title={selectedCount > 1 ? 'Căn mép phải với nhau' : 'Căn lề phải'}
            >
              <AlignRightIcon />
            </button>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => alignObjects('top')}
              title={selectedCount > 1 ? 'Căn mép trên với nhau' : 'Căn lề trên'}
            >
              <AlignTopIcon />
            </button>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => alignObjects('center-v')}
              title={selectedCount > 1 ? 'Căn giữa trục dọc với nhau' : 'Căn giữa dọc'}
            >
              <AlignCenterVIcon />
            </button>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => alignObjects('bottom')}
              title={selectedCount > 1 ? 'Căn mép dưới với nhau' : 'Căn lề dưới'}
            >
              <AlignBottomIcon />
            </button>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => alignObjects('center-paper')}
              title={selectedCount > 1 ? 'Căn nhóm ảnh vào giữa tờ giấy' : 'Căn chính giữa tờ giấy'}
            >
              <CenterPaperIcon />
            </button>
            <span className="bar-separator" />
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => distributeObjects('horizontal')}
              disabled={objects.length < 2}
              title="Dàn đều khoảng cách ngang giữa các ảnh"
            >
              <DistributeHIcon />
            </button>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => distributeObjects('vertical')}
              disabled={objects.length < 2}
              title="Dàn đều khoảng cách dọc giữa các ảnh"
            >
              <DistributeVIcon />
            </button>
          </div>
        )}
      </div>

      {/* Right: Object Count & Clear */}
      <div className="bottom-bar-right">
        <span className="bottom-bar-info" style={{ whiteSpace: 'nowrap' }}>
          {objects.length} ảnh
        </span>

        {objects.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (confirm('Xóa toàn bộ ảnh trên giấy?')) {
                clearAll();
              }
            }}
            style={{ color: 'var(--danger)', padding: '2px 6px' }}
            title="Xóa tất cả ảnh"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
