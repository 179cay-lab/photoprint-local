// ============================================================
// Settings Dialog — Application Defaults & Preferences
// ============================================================

import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import type { PaperSizeType, UnitType } from '../../types';
import { PAPER_SIZES } from '../../constants/paper';
import './Dialogs.css';

export function SettingsDialog() {
  const showSettings = useProjectStore((s) => s.showSettings);
  const closeSettings = useProjectStore((s) => s.closeSettings);
  const saveAllSettingsAsDefault = useProjectStore((s) => s.saveAllSettingsAsDefault);
  const resetDefaultSettings = useProjectStore((s) => s.resetDefaultSettings);

  // Current values from store
  const storePaperSize = useProjectStore((s) => s.paperSize);
  const storeUnit = useProjectStore((s) => s.unit);
  const storeBorderEnabled = useProjectStore((s) => s.borderEnabled);
  const storeBorderWidthMm = useProjectStore((s) => s.borderWidthMm);
  const storeBorderColor = useProjectStore((s) => s.borderColor);
  const storeMarginEnabled = useProjectStore((s) => s.marginEnabled);
  const storeMarginMm = useProjectStore((s) => s.marginMm);
  const storeSpacingMm = useProjectStore((s) => s.spacingMm);
  const storeLockRatio = useProjectStore((s) => s.lockRatio);

  // Local dialog state for editing before saving
  const [paperSize, setPaperSize] = useState<PaperSizeType>(storePaperSize);
  const [unit, setUnit] = useState<UnitType>(storeUnit);
  const [borderEnabled, setBorderEnabled] = useState<boolean>(storeBorderEnabled);
  const [borderWidthMm, setBorderWidthMm] = useState<number>(storeBorderWidthMm);
  const [borderColor, setBorderColor] = useState<string>(storeBorderColor);
  const [marginEnabled, setMarginEnabled] = useState<boolean>(storeMarginEnabled);
  const [marginMm, setMarginMm] = useState<number>(storeMarginMm);
  const [spacingMm, setSpacingMm] = useState<number>(storeSpacingMm);
  const [lockRatio, setLockRatio] = useState<boolean>(storeLockRatio);

  if (!showSettings) return null;

  const handleSave = () => {
    saveAllSettingsAsDefault({
      paperSize,
      unit,
      borderEnabled,
      borderWidthMm,
      borderColor,
      marginEnabled,
      marginMm,
      spacingMm,
      lockRatio,
    });
    closeSettings();
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục toàn bộ cài đặt về mặc định ban đầu của nhà sản xuất?')) {
      resetDefaultSettings();
      setPaperSize('A4');
      setUnit('cm');
      setBorderEnabled(true);
      setBorderWidthMm(0.25);
      setBorderColor('#000000');
      setMarginEnabled(true);
      setMarginMm(5);
      setSpacingMm(2);
      setLockRatio(true);
      closeSettings();
    }
  };

  return (
    <div className="modal-overlay" onClick={closeSettings}>
      <div className="modal-card settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span>⚙️ Cài đặt mặc định của ứng dụng</span>
          </div>
          <button className="btn-icon" onClick={closeSettings} title="Đóng">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body settings-modal-body">
          <div className="settings-intro-text">
            Các cài đặt ở đây sẽ được <strong>tự động ghi nhớ</strong> và áp dụng cho tất cả những lần mở ứng dụng tiếp theo.
          </div>

          {/* Section 1: Paper & Units */}
          <div className="settings-section">
            <h4 className="settings-section-title">📄 Khổ giấy & Đơn vị hiển thị</h4>
            
            <div className="settings-row">
              <div className="settings-label-group">
                <span className="settings-label">Khổ giấy mặc định khi mở app</span>
                <span className="settings-desc">Chọn khổ giấy tiệm hoặc máy in của bạn hay dùng nhất</span>
              </div>
              <div className="settings-btn-toggle">
                {(['A4', 'A5'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`btn btn-sm ${paperSize === size ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPaperSize(size)}
                  >
                    {size} ({PAPER_SIZES[size].widthMm / 10} × {PAPER_SIZES[size].heightMm / 10} cm)
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label-group">
                <span className="settings-label">Đơn vị đo trên thước kẻ & nhập liệu</span>
                <span className="settings-desc">Người dùng Việt Nam thông thường chuộng dùng Centimet (cm)</span>
              </div>
              <div className="settings-btn-toggle">
                <button
                  type="button"
                  className={`btn btn-sm ${unit === 'cm' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUnit('cm')}
                >
                  Centimet (cm)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${unit === 'mm' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUnit('mm')}
                >
                  Milimet (mm)
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Cutting Border */}
          <div className="settings-section">
            <h4 className="settings-section-title">✂️ Đường viền cắt ảnh thẻ (Cutting Border)</h4>
            
            <div className="settings-row">
              <div className="settings-label-group">
                <span className="settings-label">Đường viền bao quanh ảnh</span>
                <span className="settings-desc">Tạo viền mảnh để cầm kéo / dao cắt chính xác ảnh thẻ, tránh lẹm</span>
              </div>
              <label className="checkbox-label" style={{ fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={borderEnabled}
                  onChange={(e) => setBorderEnabled(e.target.checked)}
                />
                {borderEnabled ? 'Bật viền' : 'Tắt viền'}
              </label>
            </div>

            {borderEnabled && (
              <>
                <div className="settings-row">
                  <div className="settings-label-group">
                    <span className="settings-label">Độ dày viền cắt</span>
                    <span className="settings-desc">Khuyên dùng 0.25mm: sắc mảnh và thẩm mỹ nhất</span>
                  </div>
                  <div className="settings-btn-toggle">
                    {[
                      { val: 0.15, label: '0.15 mm (Rất mảnh)' },
                      { val: 0.25, label: '0.25 mm (Chuẩn)' },
                      { val: 0.5, label: '0.50 mm (Rõ nét)' },
                      { val: 1.0, label: '1.0 mm (Dày)' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`btn btn-sm ${borderWidthMm === item.val ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setBorderWidthMm(item.val)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <div className="settings-label-group">
                    <span className="settings-label">Màu sắc viền cắt</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      style={{
                        width: '38px',
                        height: '32px',
                        padding: 0,
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {borderColor === '#000000' ? 'Đen mặc định' : borderColor}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Section 3: Safe Margin & Spacing */}
          <div className="settings-section">
            <h4 className="settings-section-title">📐 Lề an toàn & Khoảng cách dàn trang</h4>

            <div className="settings-row">
              <div className="settings-label-group">
                <span className="settings-label">Lề in an toàn (Safe Margin)</span>
                <span className="settings-desc">Ngăn máy in nuốt mép giấy làm mất góc ảnh</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label className="checkbox-label" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={marginEnabled}
                    onChange={(e) => setMarginEnabled(e.target.checked)}
                  />
                  Bật
                </label>
                {marginEnabled && (
                  <div className="settings-btn-toggle">
                    {[
                      { val: 3, label: '3 mm' },
                      { val: 5, label: '5 mm (0.5 cm)' },
                      { val: 10, label: '10 mm (1.0 cm)' },
                    ].map((m) => (
                      <button
                        key={m.val}
                        type="button"
                        className={`btn btn-sm ${marginMm === m.val ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMarginMm(m.val)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label-group">
                <span className="settings-label">Khoảng cách giữa các ảnh (Spacing)</span>
                <span className="settings-desc">Khoảng hở khi bấm tự động dàn ảnh</span>
              </div>
              <div className="settings-btn-toggle">
                {[
                  { val: 0, label: '0 mm (Sát nhau)' },
                  { val: 2, label: '2 mm (Chuẩn)' },
                  { val: 3, label: '3 mm' },
                  { val: 5, label: '5 mm' },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    className={`btn btn-sm ${spacingMm === s.val ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSpacingMm(s.val)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Aspect Ratio Lock */}
          <div className="settings-section">
            <h4 className="settings-section-title">🔒 Chế độ kéo kích thước ảnh</h4>
            <div className="settings-row">
              <div className="settings-label-group">
                <span className="settings-label">Mặc định Khóa tỷ lệ khung hình</span>
                <span className="settings-desc">
                  Giúp người dùng kéo ảnh không bị méo mặt (có thể mở khóa tạm thời bất kỳ lúc nào)
                </span>
              </div>
              <div className="settings-btn-toggle">
                <button
                  type="button"
                  className={`btn btn-sm ${lockRatio ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setLockRatio(true)}
                >
                  🔒 Luôn khóa (Chống méo)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${!lockRatio ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setLockRatio(false)}
                >
                  🔓 Tự do kéo dãn
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            ↺ Khôi phục gốc
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={closeSettings}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              💾 Lưu làm mặc định
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
