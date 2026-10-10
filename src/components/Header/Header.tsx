// ============================================================
// Header Component (with Project Save/Load and Auto-Update)
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import type { PaperSizeType, UpdateStatusData } from '../../types';
import { triggerPrint } from '../../utils/print';
import './Header.css';

export function Header() {
  const paperSize = useProjectStore((s) => s.paperSize);
  const setPaperSize = useProjectStore((s) => s.setPaperSize);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const undoStack = useProjectStore((s) => s.undoStack);
  const redoStack = useProjectStore((s) => s.redoStack);
  const setShowPreview = useProjectStore((s) => s.setShowPreview);
  const objects = useProjectStore((s) => s.objects);
  const exportProject = useProjectStore((s) => s.exportProject);
  const importProject = useProjectStore((s) => s.importProject);
  const showToast = useProjectStore((s) => s.showToast);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appVersion, setAppVersion] = useState<string>('v1.0.0');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusData | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);

  useEffect(() => {
    // Lấy phiên bản app từ Electron nếu có
    if (window.electronEnv?.getAppVersion) {
      window.electronEnv.getAppVersion().then((ver) => {
        if (ver) setAppVersion(`v${ver}`);
      });
    }

    // Lắng nghe tiến trình auto-updater
    if (window.electronEnv?.onUpdateStatus) {
      const unsubscribe = window.electronEnv.onUpdateStatus((data) => {
        setUpdateStatus(data);
        setIsCheckingUpdate(false);

        if (data.status === 'checking') {
          showToast('Đang kiểm tra bản cập nhật mới...');
        } else if (data.status === 'available') {
          showToast(`Tìm thấy bản cập nhật v${data.version}! Đang tự động tải...`);
        } else if (data.status === 'not-available') {
          showToast(`Bạn đang sử dụng phiên bản mới nhất (${appVersion})`);
        } else if (data.status === 'downloading') {
          if (data.percent && data.percent % 25 === 0) {
            showToast(`Đang tải bản cập nhật: ${data.percent}%`);
          }
        } else if (data.status === 'downloaded') {
          showToast(`Đã tải xong bản cập nhật v${data.version}! Sẵn sàng nâng cấp.`);
        } else if (data.status === 'error') {
          showToast(`Lỗi kiểm tra cập nhật: ${data.error || 'Không kết nối được server'}`);
        }
      });
      return unsubscribe;
    }
  }, [appVersion, showToast]);

  const handlePrint = () => {
    if (objects.length === 0) {
      alert('Chưa có ảnh nào để in. Hãy thêm ảnh trước!');
      return;
    }
    triggerPrint();
  };

  const handleOpenProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importProject(content);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleCheckUpdateClick = async () => {
    if (!window.electronEnv?.checkForUpdates) {
      showToast(`Phiên bản Web (${appVersion}) — Luôn tự động dùng bản mới nhất!`);
      return;
    }

    if (updateStatus?.status === 'downloaded') {
      window.electronEnv.quitAndInstall();
      return;
    }

    setIsCheckingUpdate(true);
    showToast('Đang kết nối kiểm tra cập nhật...');
    try {
      const res = await window.electronEnv.checkForUpdates();
      if (!res.success && res.message) {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err?.message || 'Không thể kiểm tra cập nhật'}`);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <span className="logo-icon">🖨️</span>
          <span className="logo-text">PhotoPrint Local</span>
        </div>

        {/* Project Actions: Save & Open */}
        <div className="header-actions-left">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={exportProject}
            title="Lưu toàn bộ bố cục và ảnh ra file .photoprint"
          >
            💾 Lưu dự án
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Mở file dự án .photoprint đã lưu trước đó"
          >
            📂 Mở dự án
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".photoprint,.json"
            style={{ display: 'none' }}
            onChange={handleOpenProjectFile}
          />
        </div>
      </div>

      <div className="header-center">
        {/* Paper Size Selector */}
        <div className="paper-selector">
          {(['A4', 'A5'] as PaperSizeType[]).map((size) => (
            <button
              key={size}
              className={`paper-btn ${paperSize === size ? 'active' : ''}`}
              onClick={() => setPaperSize(size)}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="header-divider" />

        {/* Undo / Redo */}
        <button
          className="btn-icon"
          title="Hoàn tác (Ctrl+Z)"
          onClick={undo}
          disabled={undoStack.length === 0}
        >
          ↶
        </button>
        <button
          className="btn-icon"
          title="Làm lại (Ctrl+Y)"
          onClick={redo}
          disabled={redoStack.length === 0}
        >
          ↷
        </button>

        <div className="header-divider" />

        {/* Preview */}
        <button
          className="btn btn-secondary"
          onClick={() => setShowPreview(true)}
          disabled={objects.length === 0}
        >
          👁️ Xem trước
        </button>

        {/* Print */}
        <button
          className="btn btn-primary btn-print"
          onClick={handlePrint}
          disabled={objects.length === 0}
        >
          🖨️ In
        </button>
      </div>

      <div className="header-right" style={{ gap: '8px' }}>
        <span className="object-count">
          {objects.length > 0 ? `${objects.length} ảnh` : ''}
        </span>

        {/* Version & Update Check Button */}
        <button
          type="button"
          className={`version-btn ${updateStatus?.status === 'downloaded' ? 'has-update' : ''}`}
          onClick={handleCheckUpdateClick}
          disabled={isCheckingUpdate}
          title="Bấm để kiểm tra và tải bản cập nhật mới nhất"
        >
          {updateStatus?.status === 'downloaded' ? (
            <>⚡ Cài đặt bản v{updateStatus.version}</>
          ) : updateStatus?.status === 'downloading' ? (
            <>⬇️ Đang tải {updateStatus.percent}%</>
          ) : isCheckingUpdate ? (
            <>⏳ Đang kiểm tra...</>
          ) : (
            <>🔄 {appVersion}</>
          )}
        </button>
      </div>
    </header>
  );
}
