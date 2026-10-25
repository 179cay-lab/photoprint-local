// ============================================================
// PhotoPrint Local — Main Application
// ============================================================

import { Header } from './components/Header/Header';
import { LeftSidebar } from './components/Sidebar/LeftSidebar';
import { RightSidebar } from './components/Sidebar/RightSidebar';
import { CanvasEditor } from './components/Canvas/CanvasEditor';
import { BottomBar } from './components/Canvas/BottomBar';
import { SizePickerDialog } from './components/Dialogs/SizePickerDialog';
import { CropEditor } from './components/Dialogs/CropEditor';
import { PrintPreview } from './components/Dialogs/PrintPreview';
import { SettingsDialog } from './components/Dialogs/SettingsDialog';
import { PrintContainer } from './components/Print/PrintContainer';
import { useProjectStore } from './store/useProjectStore';
import { useKeyboard } from './hooks/useKeyboard';
import './App.css';

function App() {
  useKeyboard();

  const showSizePicker = useProjectStore((s) => s.showSizePicker);
  const showCropEditor = useProjectStore((s) => s.showCropEditor);
  const showPreview = useProjectStore((s) => s.showPreview);
  const showSettings = useProjectStore((s) => s.showSettings);

  return (
    <>
      <Header />
      <div className="app-body">
        <LeftSidebar />
        <div className="canvas-area">
          <CanvasEditor />
          <BottomBar />
        </div>
        <RightSidebar />
      </div>

      {/* Dialogs */}
      {showSizePicker && <SizePickerDialog />}
      {showCropEditor && <CropEditor />}
      {showPreview && <PrintPreview />}
      {showSettings && <SettingsDialog />}

      {/* Hidden print container */}
      <PrintContainer />

      {/* Global Toast Feedback */}
      <Toast />
    </>
  );
}

function Toast() {
  const toastMessage = useProjectStore((s) => s.toastMessage);
  if (!toastMessage) return null;
  return (
    <div className="toast-notification">
      <span>{toastMessage}</span>
    </div>
  );
}

export default App;
