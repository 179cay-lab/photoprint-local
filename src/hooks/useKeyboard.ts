// ============================================================
// Keyboard Shortcuts Hook (Undo, Redo, Copy, Paste, Nudge, Delete)
// ============================================================

import { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { loadImageFile } from '../utils/image';

export function useKeyboard() {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const copySelected = useProjectStore((s) => s.copySelected);
  const paste = useProjectStore((s) => s.paste);
  const removeSelected = useProjectStore((s) => s.removeSelected);
  const duplicateSelected = useProjectStore((s) => s.duplicateSelected);
  const selectObjects = useProjectStore((s) => s.selectObjects);
  const selectObject = useProjectStore((s) => s.selectObject);
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  const selectedObjectIds = useProjectStore((s) => s.selectedObjectIds);
  const updateObject = useProjectStore((s) => s.updateObject);
  const pushUndo = useProjectStore((s) => s.pushUndo);
  const openSizePicker = useProjectStore((s) => s.openSizePicker);
  const showSizePicker = useProjectStore((s) => s.showSizePicker);
  const closeSizePicker = useProjectStore((s) => s.closeSizePicker);
  const showCropEditor = useProjectStore((s) => s.showCropEditor);
  const closeCropEditor = useProjectStore((s) => s.closeCropEditor);
  const showPreview = useProjectStore((s) => s.showPreview);
  const setShowPreview = useProjectStore((s) => s.setShowPreview);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in a real text field or form input
      const target = e.target as HTMLElement | null;
      const isRealTextInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
        !target.closest('.canvas-paper') &&
        !target.closest('.canvas-container');

      if (isRealTextInput) return;

      // Allow either Ctrl or Cmd (Meta) on all platforms
      const modifier = e.ctrlKey || e.metaKey;

      // Select All: Ctrl+A / Cmd+A
      if (modifier && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = useProjectStore.getState().objects.map((o) => o.id);
        if (allIds.length > 0) {
          selectObjects(allIds);
        }
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if (modifier && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        (modifier && (e.key === 'y' || e.key === 'Y')) ||
        (modifier && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Copy: Ctrl+C / Cmd+C
      if (modifier && (e.key === 'c' || e.key === 'C')) {
        const state = useProjectStore.getState();
        if (state.selectedObjectId || (state.selectedObjectIds && state.selectedObjectIds.length > 0)) {
          e.preventDefault();
          copySelected();
        }
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if (modifier && (e.key === 'v' || e.key === 'V')) {
        const state = useProjectStore.getState();
        if (state.clipboard && state.clipboard.length > 0) {
          e.preventDefault();
          paste();
          return;
        }
      }

      // Duplicate: Ctrl+D / Cmd+D
      if (modifier && (e.key === 'd' || e.key === 'D')) {
        const state = useProjectStore.getState();
        if (state.selectedObjectId || (state.selectedObjectIds && state.selectedObjectIds.length > 0)) {
          e.preventDefault();
          duplicateSelected(1);
          return;
        }
      }

      // Escape: Close open modals or deselect
      if (e.key === 'Escape') {
        if (showPreview) {
          setShowPreview(false);
          return;
        }
        if (showCropEditor) {
          closeCropEditor();
          return;
        }
        if (showSizePicker) {
          closeSizePicker();
          return;
        }
        if (selectedObjectId || selectedObjectIds.length > 0) {
          selectObject(null);
          selectObjects([]);
          return;
        }
      }

      // Delete / Backspace: Remove selected object(s)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = useProjectStore.getState();
        if (state.selectedObjectId || (state.selectedObjectIds && state.selectedObjectIds.length > 0)) {
          e.preventDefault();
          removeSelected();
          return;
        }
      }

      // Arrow keys: Nudge selected object(s)
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const state = useProjectStore.getState();
        const activeIds =
          state.selectedObjectIds.length > 0
            ? state.selectedObjectIds
            : state.selectedObjectId
            ? [state.selectedObjectId]
            : [];

        if (activeIds.length === 0) return;

        e.preventDefault();
        const step = e.shiftKey ? 2 : 0.5; // mm
        let dx = 0;
        let dy = 0;

        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        pushUndo();
        activeIds.forEach((id) => {
          const obj = state.objects.find((o) => o.id === id);
          if (obj) {
            updateObject(id, {
              xMm: Math.max(0, obj.xMm + dx),
              yMm: Math.max(0, obj.yMm + dy),
            });
          }
        });
      }
    };

    // System Clipboard Paste handler (for screenshot / image file paste from OS)
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isRealTextInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
        !target.closest('.canvas-paper') &&
        !target.closest('.canvas-container');

      if (isRealTextInput) return;

      const items = e.clipboardData?.items;
      if (items) {
        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) imageFiles.push(file);
          }
        }

        if (imageFiles.length > 0) {
          e.preventDefault();
          const loaded = await Promise.all(
            imageFiles.map(async (f) => {
              const res = await loadImageFile(f);
              return { ...res, fileName: f.name || 'Ảnh dán.png' };
            })
          );
          openSizePicker(loaded);
          return;
        }
      }

      // Fallback: If no system image file in clipboard, paste copied canvas objects
      const state = useProjectStore.getState();
      if (state.clipboard && state.clipboard.length > 0) {
        e.preventDefault();
        paste();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [
    undo,
    redo,
    copySelected,
    paste,
    removeSelected,
    duplicateSelected,
    selectObjects,
    selectObject,
    selectedObjectId,
    selectedObjectIds,
    updateObject,
    pushUndo,
    openSizePicker,
    showSizePicker,
    closeSizePicker,
    showCropEditor,
    closeCropEditor,
    showPreview,
    setShowPreview,
  ]);
}
