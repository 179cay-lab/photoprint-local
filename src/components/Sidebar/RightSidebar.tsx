import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { mmToCm, cmToMm, calculatePrintDPI } from '../../utils/units';
import { MIN_PRINT_DPI, PAPER_SIZES } from '../../constants/paper';
import { PRINT_OPTIMIZE_PRESET, isDefaultColor } from '../../utils/color';
import { DEFAULT_COLOR } from '../../types';
import './Sidebar.css';

export function RightSidebar() {
  const objects = useProjectStore((s) => s.objects);
  const paperSize = useProjectStore((s) => s.paperSize);
  const setPaperSize = useProjectStore((s) => s.setPaperSize);
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  const updateObject = useProjectStore((s) => s.updateObject);
  const removeSelected = useProjectStore((s) => s.removeSelected);
  const duplicateSelected = useProjectStore((s) => s.duplicateSelected);
  const copySelected = useProjectStore((s) => s.copySelected);
  const paste = useProjectStore((s) => s.paste);
  const clipboard = useProjectStore((s) => s.clipboard);
  const pushUndo = useProjectStore((s) => s.pushUndo);
  const openCropEditor = useProjectStore((s) => s.openCropEditor);

  // Border & Aspect Ratio lock
  const borderEnabled = useProjectStore((s) => s.borderEnabled);
  const setBorderEnabled = useProjectStore((s) => s.setBorderEnabled);
  const borderWidthMm = useProjectStore((s) => s.borderWidthMm);
  const setBorderWidthMm = useProjectStore((s) => s.setBorderWidthMm);
  const borderColor = useProjectStore((s) => s.borderColor);
  const setBorderColor = useProjectStore((s) => s.setBorderColor);
  const lockRatio = useProjectStore((s) => s.lockRatio);
  const toggleLockRatio = useProjectStore((s) => s.toggleLockRatio);

  // Margin & Spacing & Align from store
  const marginEnabled = useProjectStore((s) => s.marginEnabled);
  const setMarginEnabled = useProjectStore((s) => s.setMarginEnabled);
  const marginMm = useProjectStore((s) => s.marginMm);
  const setMarginMm = useProjectStore((s) => s.setMarginMm);
  const spacingMm = useProjectStore((s) => s.spacingMm);
  const setSpacingMm = useProjectStore((s) => s.setSpacingMm);
  const runAutoLayout = useProjectStore((s) => s.runAutoLayout);
  const autoFitSpacing = useProjectStore((s) => s.autoFitSpacing);
  const showToast = useProjectStore((s) => s.showToast);

  const [savedToast, setSavedToast] = useState(false);
  const [showColorAdjust, setShowColorAdjust] = useState(false);

  const handleSaveDefault = () => {
    localStorage.setItem('photoprint_borderEnabled', String(borderEnabled));
    localStorage.setItem('photoprint_borderWidthMm', String(borderWidthMm));
    localStorage.setItem('photoprint_borderColor', borderColor);
    localStorage.setItem('photoprint_marginEnabled', String(marginEnabled));
    localStorage.setItem('photoprint_marginMm', String(marginMm));
    localStorage.setItem('photoprint_spacing', String(spacingMm));
    showToast('Đã lưu cấu hình lề và viền làm mặc định');
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const selectedObj = objects.find((o) => o.id === selectedObjectId);
  const spacingCm = mmToCm(spacingMm);
  const marginCm = mmToCm(marginMm);

  // View when NO object is selected: Global Page & Layout & Border settings
  if (!selectedObj) {
    return (
      <aside className="sidebar sidebar-right">
        {/* Page Information */}
        <div className="sidebar-section">
          <div className="label">Khổ giấy in</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {(['A4', 'A5'] as const).map((size) => (
              <button
                key={size}
                className={`btn btn-sm ${paperSize === size ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setPaperSize(size)}
              >
                {size} ({PAPER_SIZES[size].widthMm / 10}×{PAPER_SIZES[size].heightMm / 10} cm)
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* Safe Margin (Lề bảo vệ) */}
        <div className="sidebar-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="label" style={{ marginBottom: 0 }}>Lề bảo vệ (In an toàn)</div>
            <label className="checkbox-label" style={{ margin: 0, fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={marginEnabled}
                onChange={(e) => setMarginEnabled(e.target.checked)}
              />
              Bật
            </label>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
            Tạo khoảng đệm viền tránh máy in Epson cắn phạm mép giấy.
          </p>

          <div className="prop-row">
            <span className="prop-label">Độ rộng lề:</span>
            <div className="prop-input-group" style={{ width: '85px' }}>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={marginCm.toFixed(1)}
                disabled={!marginEnabled}
                onChange={(e) => setMarginMm(cmToMm(parseFloat(e.target.value) || 0))}
              />
              <span className="prop-input-unit">cm</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            {[0.3, 0.5, 1.0].map((val) => (
              <button
                key={val}
                type="button"
                disabled={!marginEnabled}
                className={`btn btn-sm ${
                  marginEnabled && Math.abs(marginCm - val) < 0.05 ? 'btn-primary' : 'btn-secondary'
                }`}
                style={{ flex: 1, padding: '3px 4px', fontSize: '11px' }}
                onClick={() => setMarginMm(cmToMm(val))}
              >
                {val} cm
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* Cutting Border (Bo viền đen nhẹ giúp dễ cắt đường dao) */}
        <div className="sidebar-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="label" style={{ marginBottom: 0 }}>Viền đen cắt ảnh thẻ</div>
            <label className="checkbox-label" style={{ margin: 0, fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={borderEnabled}
                onChange={(e) => setBorderEnabled(e.target.checked)}
              />
              Bật
            </label>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
            Đường viền mảnh đen bao quanh ảnh giúp thợ đặt dao cắt ảnh thẻ chuẩn xác.
          </p>

          <div className="prop-row">
            <span className="prop-label">Độ dày viền:</span>
            <div className="prop-input-group" style={{ width: '85px' }}>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="2"
                value={borderWidthMm.toFixed(2)}
                disabled={!borderEnabled}
                onChange={(e) => setBorderWidthMm(parseFloat(e.target.value) || 0.25)}
              />
              <span className="prop-input-unit">mm</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            {[
              { val: 0.1, label: '0.1mm' },
              { val: 0.25, label: '0.25mm' },
              { val: 0.5, label: '0.5mm' },
            ].map(({ val, label }) => (
              <button
                key={val}
                type="button"
                disabled={!borderEnabled}
                className={`btn btn-sm ${
                  borderEnabled && Math.abs(borderWidthMm - val) < 0.04 ? 'btn-primary' : 'btn-secondary'
                }`}
                style={{ flex: 1, padding: '3px 4px', fontSize: '11px' }}
                onClick={() => setBorderWidthMm(val)}
                title={`Đặt độ dày viền ${val}mm`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="prop-row" style={{ marginTop: '8px' }}>
            <span className="prop-label">Màu viền:</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[
                { color: '#000000', label: 'Đen' },
                { color: '#555555', label: 'Xám đậm' },
                { color: '#999999', label: 'Xám nhạt' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  disabled={!borderEnabled}
                  onClick={() => setBorderColor(c.color)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: c.color,
                    border: borderColor === c.color ? '2px solid var(--primary)' : '1px solid #ccc',
                    cursor: borderEnabled ? 'pointer' : 'default',
                    outlineOffset: '2px',
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm btn-block"
            style={{ marginTop: '8px' }}
            onClick={handleSaveDefault}
            title="Lưu các thông số viền và lề này làm mặc định cho các lần sau"
          >
            {savedToast ? '✓ Đã lưu cài đặt!' : '💾 Lưu làm mặc định'}
          </button>
        </div>

        <div className="divider" />

        {/* Spacing (Khoảng cách giữa các ảnh) */}
        <div className="sidebar-section">
          <div className="label">Khoảng cách giữa các ảnh</div>
          <div className="prop-row">
            <span className="prop-label">Khoảng trắng:</span>
            <div className="prop-input-group" style={{ width: '85px' }}>
              <input
                type="number"
                step="0.05"
                min="0"
                max="5"
                value={spacingCm.toFixed(1)}
                onChange={(e) => setSpacingMm(cmToMm(parseFloat(e.target.value) || 0))}
              />
              <span className="prop-input-unit">cm</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            {[0, 0.2, 0.5, 1.0].map((val) => (
              <button
                key={val}
                type="button"
                className={`btn btn-sm ${
                  Math.abs(spacingCm - val) < 0.04 ? 'btn-primary' : 'btn-secondary'
                }`}
                style={{ flex: 1, padding: '3px 4px', fontSize: '11px' }}
                onClick={() => {
                  setSpacingMm(cmToMm(val));
                  runAutoLayout();
                }}
                title={val === 0 ? 'In sát nhau (cắt 1 đường dao)' : `${val}cm`}
              >
                {val} cm
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, fontWeight: 600 }}
              onClick={autoFitSpacing}
              disabled={objects.length < 2}
              title="Tự động tính khoảng cách để dàn đều vừa khít chiều rộng giấy"
            >
              ⚡ Dàn vừa giấy
            </button>
            <button
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={runAutoLayout}
              disabled={objects.length === 0}
            >
              📐 Dàn tự động
            </button>
          </div>
        </div>

        <div className="divider" />

        {/* Clipboard Actions */}
        <div className="sidebar-section">
          <div className="label">Thao tác Clipboard</div>
          <button
            className="btn btn-secondary btn-block"
            onClick={paste}
            disabled={!clipboard || clipboard.length === 0}
            title="Dán ảnh đã sao chép (Ctrl+V)"
          >
            📋 Dán ảnh (Ctrl+V)
          </button>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <strong>💡 Phím tắt tiện dụng:</strong>
            <div style={{ marginTop: '2px' }}>• <strong>Ctrl + C</strong>: Sao chép ảnh đang chọn</div>
            <div style={{ marginTop: '2px' }}>• <strong>Ctrl + V</strong>: Dán ảnh ra giấy</div>
            <div style={{ marginTop: '2px' }}>• <strong>Ctrl + D</strong>: Nhân bản ảnh nhanh</div>
            <div style={{ marginTop: '2px' }}>• <strong>Ctrl + A</strong>: Chọn tất cả ảnh</div>
            <div style={{ marginTop: '2px' }}>• <strong>Kéo góc/cạnh</strong>: Đổi kích thước ảnh trực tiếp</div>
          </div>
        </div>
      </aside>
    );
  }

  const obj = selectedObj;

  // Resolution check
  const printDPI = calculatePrintDPI(
    obj.originalWidthPx * obj.crop.width,
    obj.originalHeightPx * obj.crop.height,
    obj.widthMm,
    obj.heightMm
  );
  const lowRes = printDPI < MIN_PRINT_DPI;

  const handleSizeChange = (field: 'widthMm' | 'heightMm', valueCm: number) => {
    pushUndo();
    const valueMm = cmToMm(valueCm);
    if (valueMm <= 0) return;

    if (lockRatio) {
      const currentRatio = obj.widthMm / (obj.heightMm || 1);
      if (field === 'widthMm') {
        updateObject(obj.id, {
          widthMm: Math.max(1, valueMm),
          heightMm: Math.max(1, valueMm / currentRatio),
        });
      } else {
        updateObject(obj.id, {
          widthMm: Math.max(1, valueMm * currentRatio),
          heightMm: Math.max(1, valueMm),
        });
      }
    } else {
      updateObject(obj.id, { [field]: Math.max(1, valueMm) });
    }
  };

  const handlePositionChange = (field: 'xMm' | 'yMm', valueMm: number) => {
    pushUndo();
    updateObject(obj.id, { [field]: Math.max(0, valueMm) });
  };

  const handleRotation = (deg: number) => {
    pushUndo();
    updateObject(obj.id, { rotation: (obj.rotation + deg) % 360 });
  };

  const handleColorChange = (key: string, value: number) => {
    updateObject(obj.id, {
      color: { ...obj.color, [key]: value },
    });
  };

  const handleColorChangeCommit = () => {
    pushUndo();
  };

  const handleCrop = () => {
    const targetRatio = obj.widthMm / obj.heightMm;
    openCropEditor(obj.id, targetRatio);
  };

  return (
    <aside className="sidebar sidebar-right">
      {/* Object Info, Dimensions & Crop/Rotate */}
      <div className="sidebar-section">
        <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="label" style={{ marginBottom: 0 }}>Kích thước in</span>
          <button
            type="button"
            className={`btn btn-sm ${lockRatio ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontSize: '11px', padding: '2px 8px' }}
            title={
              lockRatio
                ? 'Đang KHÓA tỷ lệ: kéo góc giữ dáng ảnh (bấm để mở khóa kéo méo)'
                : 'Đang MỞ KHÓA: cho phép kéo méo ảnh tự do (bấm để khóa lại)'
            }
            onClick={toggleLockRatio}
          >
            {lockRatio ? '🔒 Khóa tỷ lệ' : '🔓 Tự do'}
          </button>
        </div>

        <div className="prop-row" style={{ marginTop: '6px' }}>
          <span className="prop-label">Rộng:</span>
          <div className="prop-input-group">
            <input
              type="number"
              step="0.1"
              min="0.5"
              value={mmToCm(obj.widthMm).toFixed(1)}
              onChange={(e) => handleSizeChange('widthMm', parseFloat(e.target.value) || 0)}
            />
            <span className="prop-input-unit">cm</span>
          </div>
        </div>

        <div className="prop-row">
          <span className="prop-label">Cao:</span>
          <div className="prop-input-group">
            <input
              type="number"
              step="0.1"
              min="0.5"
              value={mmToCm(obj.heightMm).toFixed(1)}
              onChange={(e) => handleSizeChange('heightMm', parseFloat(e.target.value) || 0)}
            />
            <span className="prop-input-unit">cm</span>
          </div>
        </div>

        {/* DPI Quality with Tooltip (P10) */}
        <div className="prop-row" style={{ marginTop: '2px' }}>
          <span className="prop-label">Độ nét:</span>
          <span
            className={`dpi-badge ${lowRes ? 'dpi-low' : 'dpi-ok'}`}
            title={
              lowRes
                ? `Độ phân giải ${printDPI} DPI dưới chuẩn khuyến nghị 150 DPI. Ảnh có thể bị mờ vỡ hạt khi in. Hãy giảm kích thước in hoặc dùng file gốc có độ phân giải cao hơn.`
                : `Độ phân giải ${printDPI} DPI đạt chuẩn sắc nét khi in máy Epson (>= 150 DPI).`
            }
            style={{ cursor: 'help' }}
          >
            {printDPI} DPI {lowRes ? '(⚠️ Mờ)' : '(✓ Nét)'}
          </span>
        </div>

        {/* Crop & Rotate quick controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '4px', marginTop: '6px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCrop} title="Cắt lại khung hình (Crop)">
            ✂️ Crop
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleRotation(-90)} title="Xoay trái 90°">
            ↺ 90°
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleRotation(90)} title="Xoay phải 90°">
            ↻ 90°
          </button>
        </div>
      </div>

      <div className="divider" />

      {/* Position */}
      <div className="sidebar-section">
        <div className="label">Vị trí trên giấy</div>
        <div className="prop-row">
          <span className="prop-label">Cách trái (X):</span>
          <div className="prop-input-group">
            <input
              type="number"
              step="0.1"
              min="0"
              value={mmToCm(obj.xMm).toFixed(1)}
              onChange={(e) => handlePositionChange('xMm', cmToMm(parseFloat(e.target.value) || 0))}
            />
            <span className="prop-input-unit">cm</span>
          </div>
        </div>

        <div className="prop-row">
          <span className="prop-label">Cách trên (Y):</span>
          <div className="prop-input-group">
            <input
              type="number"
              step="0.1"
              min="0"
              value={mmToCm(obj.yMm).toFixed(1)}
              onChange={(e) => handlePositionChange('yMm', cmToMm(parseFloat(e.target.value) || 0))}
            />
            <span className="prop-input-unit">cm</span>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Cutting Border (Bo viền đen) */}
      <div className="sidebar-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="label" style={{ marginBottom: 0 }}>Viền đen cắt ảnh thẻ</div>
          <label className="checkbox-label" style={{ margin: 0, fontSize: '12px' }}>
            <input
              type="checkbox"
              checked={borderEnabled}
              onChange={(e) => setBorderEnabled(e.target.checked)}
            />
            Bật
          </label>
        </div>

        <div className="prop-row" style={{ marginTop: '6px' }}>
          <span className="prop-label">Độ dày:</span>
          <div className="prop-input-group" style={{ width: '85px' }}>
            <input
              type="number"
              step="0.05"
              min="0.05"
              max="2"
              value={borderWidthMm.toFixed(2)}
              disabled={!borderEnabled}
              onChange={(e) => setBorderWidthMm(parseFloat(e.target.value) || 0.25)}
            />
            <span className="prop-input-unit">mm</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
          {[
            { val: 0.1, label: '0.1mm' },
            { val: 0.25, label: '0.25mm' },
            { val: 0.5, label: '0.5mm' },
          ].map(({ val, label }) => (
            <button
              key={val}
              type="button"
              disabled={!borderEnabled}
              className={`btn btn-sm ${
                borderEnabled && Math.abs(borderWidthMm - val) < 0.04 ? 'btn-primary' : 'btn-secondary'
              }`}
              style={{ flex: 1, padding: '3px 4px', fontSize: '11px' }}
              onClick={() => setBorderWidthMm(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* Quick Duplicate Presets (P5) */}
      <div className="sidebar-section">
        <div className="label">Nhân bản nhanh</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, fontWeight: 600 }}
            onClick={() => duplicateSelected(1)}
            title="Nhân bản thêm 1 ảnh (Ctrl+D)"
          >
            +1 bản
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, fontWeight: 600 }}
            onClick={() => duplicateSelected(3)}
            title="Nhân bản thêm 3 ảnh (combo 4 ảnh thẻ)"
          >
            +3 bản
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, fontWeight: 600 }}
            onClick={() => duplicateSelected(5)}
            title="Nhân bản thêm 5 ảnh (combo 6 ảnh thẻ)"
          >
            +5 bản
          </button>
        </div>
      </div>

      <div className="divider" />

      {/* Color Adjustments (P4 Accordion) */}
      <div className="sidebar-section">
        <button
          type="button"
          className="accordion-header"
          onClick={() => setShowColorAdjust(!showColorAdjust)}
        >
          <span>🎨 Chỉnh màu ảnh {showColorAdjust ? '▴' : '▾'}</span>
          {!isDefaultColor(obj.color) && <span className="badge-active">Đã chỉnh</span>}
        </button>

        {showColorAdjust && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { key: 'brightness', label: 'Độ sáng' },
              { key: 'contrast', label: 'Tương phản' },
              { key: 'saturation', label: 'Độ bão hòa' },
              { key: 'temperature', label: 'Nhiệt độ màu' },
            ].map(({ key, label }) => (
              <div key={key} className="color-slider-row">
                <div className="color-slider-header">
                  <span className="color-label">{label}</span>
                  <span className="color-value">{obj.color[key as keyof typeof obj.color]}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={obj.color[key as keyof typeof obj.color]}
                  onChange={(e) => handleColorChange(key, parseInt(e.target.value))}
                  onMouseUp={handleColorChangeCommit}
                  onTouchEnd={handleColorChangeCommit}
                />
              </div>
            ))}

            <div className="color-actions" style={{ marginTop: '4px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  pushUndo();
                  updateObject(obj.id, { color: DEFAULT_COLOR });
                  showToast('Đã đặt lại màu gốc');
                }}
                disabled={isDefaultColor(obj.color)}
              >
                Reset màu
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  pushUndo();
                  updateObject(obj.id, { color: PRINT_OPTIMIZE_PRESET });
                  showToast('Đã áp dụng tối ưu in Epson');
                }}
              >
                ✨ Tối ưu Epson
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="divider" />

      {/* Actions */}
      <div className="sidebar-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button className="btn btn-secondary btn-sm" onClick={copySelected} title="Sao chép (Ctrl+C)">
            📋 Sao chép
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={paste}
            disabled={!clipboard || clipboard.length === 0}
            title="Dán (Ctrl+V)"
          >
            📄 Dán (Ctrl+V)
          </button>
        </div>
        <button
          className="btn btn-danger btn-block"
          style={{ marginTop: '6px' }}
          onClick={() => {
            if (confirm('Xóa ảnh này?')) {
              removeSelected();
            }
          }}
        >
          🗑️ Xóa (Delete)
        </button>
      </div>
    </aside>
  );
}
