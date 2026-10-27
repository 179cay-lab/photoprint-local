// ============================================================
// PhotoPrint Local — Main Project Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  PrintObject,
  PaperSizeType,
  UnitType,
} from '../types';
import { PAPER_SIZES, DEFAULT_SPACING_MM } from '../constants/paper';
import { autoLayout, calculateOptimalSpacing } from '../utils/layout';
import { getRotatedPositionAroundCenter } from '../utils/geometry';

// ---- Undo/Redo State Snapshot ----
interface UndoSnapshot {
  objects: PrintObject[];
  paperSize: PaperSizeType;
}

interface ProjectState {
  // Paper
  paperSize: PaperSizeType;
  setPaperSize: (size: PaperSizeType) => void;
  fitObjectsToPaper: (targetSize?: PaperSizeType) => void;

  // Objects
  objects: PrintObject[];
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectObject: (id: string | null) => void;
  selectObjects: (ids: string[]) => void;

  // Add image
  addObject: (obj: Omit<PrintObject, 'id'>) => string;
  removeObject: (id: string) => void;
  removeSelected: () => void;
  updateObject: (id: string, updates: Partial<PrintObject>) => void;
  rotateObject: (id: string, deltaDeg: number) => void;
  fitSelectedToFullPaper: () => void;
  clearAll: () => void;

  // Duplicate
  duplicateObject: (id: string, count?: number) => void;
  duplicateSelected: (count?: number) => void;

  // Clipboard (Copy / Paste)
  clipboard: PrintObject[];
  copySelected: () => void;
  paste: () => void;

  // Auto layout & Spacing
  spacingMm: number;
  setSpacingMm: (spacing: number) => void;
  runAutoLayout: () => void;
  autoFitSpacing: () => void;
  fillPaper: () => void;

  // Senior / Easy Mode
  easyMode: boolean;
  toggleEasyMode: () => void;

  // Safe Margin (Lề an toàn)
  marginEnabled: boolean;
  setMarginEnabled: (enabled: boolean) => void;
  marginMm: number;
  setMarginMm: (margin: number) => void;

  // Cutting Border (Viền đen cắt ảnh thẻ)
  borderEnabled: boolean;
  setBorderEnabled: (enabled: boolean) => void;
  borderWidthMm: number;
  setBorderWidthMm: (width: number) => void;
  borderColor: string;
  setBorderColor: (color: string) => void;

  // Aspect ratio lock (Khóa / mở khóa kéo méo ảnh)
  lockRatio: boolean;
  setLockRatio: (locked: boolean) => void;
  toggleLockRatio: () => void;

  // Alignment & Distribution
  alignObjects: (
    type:
      | 'left'
      | 'center-h'
      | 'right'
      | 'top'
      | 'center-v'
      | 'bottom'
      | 'center-paper'
  ) => void;
  distributeObjects: (axis: 'horizontal' | 'vertical') => void;

  // Snap
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;

  // Unit display
  unit: UnitType;
  setUnit: (unit: UnitType) => void;

  // Zoom (visual only, does not affect print)
  zoom: number;
  setZoom: (zoom: number) => void;

  // Last used size preset (mm)
  lastUsedSize: { widthMm: number; heightMm: number } | null;
  setLastUsedSize: (size: { widthMm: number; heightMm: number }) => void;

  // Undo / Redo
  undoStack: UndoSnapshot[];
  redoStack: UndoSnapshot[];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Size picker dialog
  showSizePicker: boolean;
  pendingImages: Array<{
    dataUrl: string;
    width: number;
    height: number;
    fileName: string;
  }>;
  openSizePicker: (images: Array<{
    dataUrl: string;
    width: number;
    height: number;
    fileName: string;
  }>) => void;
  closeSizePicker: () => void;

  // Crop editor
  showCropEditor: boolean;
  cropTargetId: string | null;
  cropTargetRatio: number | null;
  openCropEditor: (objectId: string, targetRatio: number) => void;
  closeCropEditor: () => void;

  // Print preview
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;

  // Settings dialog & defaults
  showSettings: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  saveAllSettingsAsDefault: (settings?: {
    paperSize?: PaperSizeType;
    unit?: UnitType;
    borderEnabled?: boolean;
    borderWidthMm?: number;
    borderColor?: string;
    marginEnabled?: boolean;
    marginMm?: number;
    spacingMm?: number;
    lockRatio?: boolean;
  }) => void;
  resetDefaultSettings: () => void;

  // Project save/open (.photoprint)
  exportProject: () => void;
  importProject: (jsonData: string) => void;

  // Toast feedback
  toastMessage: string | null;
  showToast: (message: string) => void;
}

let _toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useProjectStore = create<ProjectState>((set, get) => ({
  // ---- Paper ----
  paperSize: (localStorage.getItem('photoprint_paperSize') as PaperSizeType) || 'A4',
  setPaperSize: (size) => {
    const currentPaper = get().paperSize;
    if (currentPaper === size) return;

    localStorage.setItem('photoprint_paperSize', size);
    get().pushUndo();

    const currentObjects = get().objects;
    const newPaper = PAPER_SIZES[size];
    const margin = get().marginEnabled ? get().marginMm : 0;
    const maxAllowedW = Math.max(10, newPaper.widthMm - 2 * margin);
    const maxAllowedH = Math.max(10, newPaper.heightMm - 2 * margin);

    let needsReformat = false;
    const adjustedObjects = currentObjects.map((obj) => {
      let w = obj.widthMm;
      let h = obj.heightMm;

      // If photo itself is larger than the printable paper area (crucial when switching A4 -> A5!)
      if (w > maxAllowedW || h > maxAllowedH) {
        needsReformat = true;
        const ratio = w / (h || 1);
        if (w / maxAllowedW > h / maxAllowedH) {
          w = maxAllowedW;
          h = maxAllowedW / ratio;
        } else {
          h = maxAllowedH;
          w = maxAllowedH * ratio;
        }
      }

      // Check if position is out of paper bounds
      if (obj.xMm + w > newPaper.widthMm || obj.yMm + h > newPaper.heightMm) {
        needsReformat = true;
      }

      return {
        ...obj,
        widthMm: Number(w.toFixed(1)),
        heightMm: Number(h.toFixed(1)),
      };
    });

    if (needsReformat && adjustedObjects.length > 0) {
      const layoutRes = autoLayout(
        adjustedObjects,
        newPaper.widthMm,
        newPaper.heightMm,
        get().spacingMm,
        margin
      );
      set({ paperSize: size, objects: layoutRes.objects });
      get().showToast(`✓ Đã đổi sang khổ ${size} & tự động xếp vừa trang!`);
    } else {
      set({ paperSize: size });
      get().showToast(`Đã chuyển sang khổ ${size}`);
    }
  },

  fitObjectsToPaper: (targetSize?: PaperSizeType) => {
    const state = get();
    const size = targetSize || state.paperSize;
    const paper = PAPER_SIZES[size];
    const margin = state.marginEnabled ? state.marginMm : 0;
    const maxAllowedW = Math.max(10, paper.widthMm - 2 * margin);
    const maxAllowedH = Math.max(10, paper.heightMm - 2 * margin);

    if (state.objects.length === 0) return;

    state.pushUndo();

    const adjusted = state.objects.map((obj) => {
      let w = obj.widthMm;
      let h = obj.heightMm;
      if (w > maxAllowedW || h > maxAllowedH) {
        const ratio = w / (h || 1);
        if (w / maxAllowedW > h / maxAllowedH) {
          w = maxAllowedW;
          h = maxAllowedW / ratio;
        } else {
          h = maxAllowedH;
          w = maxAllowedH * ratio;
        }
      }
      return {
        ...obj,
        widthMm: Number(w.toFixed(1)),
        heightMm: Number(h.toFixed(1)),
      };
    });

    const layoutRes = autoLayout(
      adjusted,
      paper.widthMm,
      paper.heightMm,
      state.spacingMm,
      margin
    );

    set({ objects: layoutRes.objects });
    state.showToast(`✓ Đã thu gọn và dàn đều các ảnh vừa vặn khổ ${size}`);
  },

  // ---- Objects ----
  objects: [],
  selectedObjectId: null,
  selectedObjectIds: [],
  selectObject: (id) =>
    set({
      selectedObjectId: id,
      selectedObjectIds: id ? [id] : [],
    }),
  selectObjects: (ids) =>
    set({
      selectedObjectIds: ids,
      selectedObjectId: ids.length === 1 ? ids[0] : ids[0] || null,
    }),

  addObject: (obj) => {
    const id = uuidv4();
    const newObj: PrintObject = { ...obj, id };
    get().pushUndo();
    set((s) => ({ objects: [...s.objects, newObj] }));
    return id;
  },

  removeObject: (id) => {
    get().pushUndo();
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
      selectedObjectIds: s.selectedObjectIds.filter((item) => item !== id),
    }));
  },

  removeSelected: () => {
    const state = get();
    const idsToRemove = new Set(
      state.selectedObjectIds.length > 0
        ? state.selectedObjectIds
        : state.selectedObjectId
        ? [state.selectedObjectId]
        : []
    );
    if (idsToRemove.size === 0) return;
    state.pushUndo();
    set((s) => ({
      objects: s.objects.filter((o) => !idsToRemove.has(o.id)),
      selectedObjectId: null,
      selectedObjectIds: [],
    }));
  },

  updateObject: (id, updates) => {
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    }));
  },

  rotateObject: (id, deltaDeg) => {
    const state = get();
    const obj = state.objects.find((o) => o.id === id);
    if (!obj) return;

    state.pushUndo();
    const newPos = getRotatedPositionAroundCenter(
      obj.xMm,
      obj.yMm,
      obj.widthMm,
      obj.heightMm,
      obj.rotation,
      deltaDeg
    );

    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === id
          ? {
              ...o,
              ...newPos,
            }
          : o
      ),
    }));
  },

  fitSelectedToFullPaper: () => {
    const state = get();
    const id = state.selectedObjectId || (state.selectedObjectIds && state.selectedObjectIds[0]);
    if (!id) return;
    const obj = state.objects.find((o) => o.id === id);
    if (!obj) return;

    state.pushUndo();
    const paper = PAPER_SIZES[state.paperSize];

    // Set photo to full paper dimensions without any offset (borderless)
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === id
          ? {
              ...o,
              xMm: 0,
              yMm: 0,
              widthMm: paper.widthMm,
              heightMm: paper.heightMm,
              rotation: 0,
            }
          : o
      ),
      marginEnabled: false, // Turn off safe margin guide so user sees clean full bleed
    }));
    get().showToast(
      `Đã căn tràn toàn khổ ${state.paperSize} (${paper.widthMm / 10}×${paper.heightMm / 10}cm). Khi in nhớ chọn "Borderless" (In tràn lề)!`
    );
  },

  clearAll: () => {
    get().pushUndo();
    set({ objects: [], selectedObjectId: null, selectedObjectIds: [] });
    get().showToast('Đã xóa toàn bộ ảnh trên giấy');
  },

  // ---- Duplicate ----
  duplicateObject: (id, count = 1) => {
    const state = get();
    const source = state.objects.find((o) => o.id === id);
    if (!source) return;

    state.pushUndo();
    const newObjects: PrintObject[] = [];
    const newIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const newId = uuidv4();
      newIds.push(newId);
      newObjects.push({
        ...source,
        id: newId,
        xMm: source.xMm + (i + 1) * 5,
        yMm: source.yMm + (i + 1) * 5,
      });
    }
    set((s) => ({
      objects: [...s.objects, ...newObjects],
      selectedObjectId: newIds[0] || null,
      selectedObjectIds: newIds,
    }));
    get().showToast(`Đã nhân bản ${newObjects.length} ảnh`);
  },

  duplicateSelected: (count = 1) => {
    const state = get();
    const targets =
      state.selectedObjectIds.length > 0
        ? state.objects.filter((o) => state.selectedObjectIds.includes(o.id))
        : state.selectedObjectId
        ? state.objects.filter((o) => o.id === state.selectedObjectId)
        : [];
    if (targets.length === 0) return;

    state.pushUndo();
    const newObjects: PrintObject[] = [];
    const newIds: string[] = [];

    for (let i = 0; i < count; i++) {
      for (const source of targets) {
        const id = uuidv4();
        newIds.push(id);
        newObjects.push({
          ...source,
          id,
          xMm: source.xMm + (i + 1) * 5,
          yMm: source.yMm + (i + 1) * 5,
        });
      }
    }

    set((s) => ({
      objects: [...s.objects, ...newObjects],
      selectedObjectId: newIds[0] || null,
      selectedObjectIds: newIds,
    }));
    get().showToast(`Đã nhân bản thêm ${newObjects.length} ảnh`);
  },

  // ---- Clipboard (Copy / Paste) ----
  clipboard: [],

  copySelected: () => {
    const state = get();
    let toCopy: PrintObject[] = [];
    if (state.selectedObjectIds && state.selectedObjectIds.length > 0) {
      const setIds = new Set(state.selectedObjectIds);
      toCopy = state.objects.filter((o) => setIds.has(o.id));
    } else if (state.selectedObjectId) {
      const found = state.objects.find((o) => o.id === state.selectedObjectId);
      if (found) toCopy = [found];
    }
    if (toCopy.length > 0) {
      set({ clipboard: JSON.parse(JSON.stringify(toCopy)) });
      get().showToast(`Đã sao chép ${toCopy.length} ảnh`);
    }
  },

  paste: () => {
    const state = get();
    if (!state.clipboard || state.clipboard.length === 0) return;

    state.pushUndo();
    const offsetMm = 5;
    const newObjects: PrintObject[] = [];
    const newIds: string[] = [];

    for (const src of state.clipboard) {
      const id = uuidv4();
      newIds.push(id);
      newObjects.push({
        ...src,
        id,
        xMm: src.xMm + offsetMm,
        yMm: src.yMm + offsetMm,
      });
    }

    // Advance clipboard coordinates so consecutive pastes step outward
    const updatedClipboard = state.clipboard.map((c) => ({
      ...c,
      xMm: c.xMm + offsetMm,
      yMm: c.yMm + offsetMm,
    }));

    set((s) => ({
      objects: [...s.objects, ...newObjects],
      clipboard: updatedClipboard,
      selectedObjectId: newIds[0] || null,
      selectedObjectIds: newIds,
    }));
    get().showToast(`Đã dán ${newObjects.length} ảnh vào giấy`);
  },

  // ---- Auto Layout & Spacing ----
  spacingMm: (() => {
    const saved = localStorage.getItem('photoprint_spacing');
    return saved ? Number(saved) : DEFAULT_SPACING_MM;
  })(),
  setSpacingMm: (spacing) => {
    localStorage.setItem('photoprint_spacing', String(spacing));
    set({ spacingMm: spacing });
  },

  // ---- Safe Margin (Lề an toàn) ----
  marginEnabled: localStorage.getItem('photoprint_marginEnabled') !== 'false',
  setMarginEnabled: (enabled) => {
    localStorage.setItem('photoprint_marginEnabled', String(enabled));
    set({ marginEnabled: enabled });
  },
  marginMm: (() => {
    const saved = localStorage.getItem('photoprint_marginMm');
    return saved ? Number(saved) : 5; // 5mm = 0.5cm
  })(),
  setMarginMm: (margin) => {
    localStorage.setItem('photoprint_marginMm', String(margin));
    set({ marginMm: Math.max(0, margin) });
  },

  // ---- Cutting Border (Viền cắt ảnh) ----
  borderEnabled: localStorage.getItem('photoprint_borderEnabled') !== 'false',
  setBorderEnabled: (enabled) => {
    localStorage.setItem('photoprint_borderEnabled', String(enabled));
    set({ borderEnabled: enabled });
  },
  borderWidthMm: (() => {
    const saved = localStorage.getItem('photoprint_borderWidthMm');
    return saved ? Number(saved) : 0.25; // 0.25mm viền đen mảnh chuẩn cắt ảnh thẻ
  })(),
  setBorderWidthMm: (width) => {
    localStorage.setItem('photoprint_borderWidthMm', String(width));
    set({ borderWidthMm: Math.max(0.05, width) });
  },
  borderColor: localStorage.getItem('photoprint_borderColor') || '#000000',
  setBorderColor: (color) => {
    localStorage.setItem('photoprint_borderColor', color);
    set({ borderColor: color });
  },

  // ---- Aspect Ratio Lock (Khóa / mở khóa kéo méo ảnh) ----
  lockRatio: localStorage.getItem('photoprint_lockRatio') !== 'false',
  setLockRatio: (locked) => {
    localStorage.setItem('photoprint_lockRatio', String(locked));
    set({ lockRatio: locked });
  },
  toggleLockRatio: () => {
    const next = !get().lockRatio;
    localStorage.setItem('photoprint_lockRatio', String(next));
    set({ lockRatio: next });
  },

  runAutoLayout: () => {
    const state = get();
    if (state.objects.length === 0) return;

    state.pushUndo();
    const paper = PAPER_SIZES[state.paperSize];
    const margin = state.marginEnabled ? state.marginMm : 0;
    const result = autoLayout(
      state.objects,
      paper.widthMm,
      paper.heightMm,
      state.spacingMm,
      margin
    );
    set({ objects: result.objects });
  },

  autoFitSpacing: () => {
    const state = get();
    if (state.objects.length < 2) return;
    const paper = PAPER_SIZES[state.paperSize];
    const margin = state.marginEnabled ? state.marginMm : 0;
    const optimal = calculateOptimalSpacing(
      state.objects,
      paper.widthMm,
      margin,
      state.spacingMm
    );
    state.setSpacingMm(optimal);
    state.runAutoLayout();
  },

  fillPaper: () => {
    const state = get();
    if (state.objects.length === 0) {
      state.showToast('Vui lòng thêm ít nhất 1 ảnh để xếp kín giấy');
      return;
    }
    const target =
      state.selectedObjectIds.length > 0
        ? state.objects.find((o) => state.selectedObjectIds.includes(o.id))
        : state.selectedObjectId
        ? state.objects.find((o) => o.id === state.selectedObjectId)
        : state.objects[0];

    if (!target) return;

    state.pushUndo();
    const paper = PAPER_SIZES[state.paperSize];
    const margin = state.marginEnabled ? state.marginMm : 0;
    const spacing = state.spacingMm;
    const usableW = Math.max(10, paper.widthMm - 2 * margin);
    const usableH = Math.max(10, paper.heightMm - 2 * margin);

    const w = target.widthMm;
    const h = target.heightMm;

    const cols = Math.max(1, Math.floor((usableW + spacing) / (w + spacing)));
    const rows = Math.max(1, Math.floor((usableH + spacing) / (h + spacing)));
    const totalCount = cols * rows;

    const gridW = cols * w + (cols - 1) * spacing;
    const gridH = rows * h + (rows - 1) * spacing;
    const startX = margin + (usableW - gridW) / 2;
    const startY = margin + (usableH - gridH) / 2;

    const newObjects: PrintObject[] = [];
    const newIds: string[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r === 0 && c === 0 ? target.id : uuidv4();
        newIds.push(id);
        newObjects.push({
          ...target,
          id,
          xMm: parseFloat((startX + c * (w + spacing)).toFixed(2)),
          yMm: parseFloat((startY + r * (h + spacing)).toFixed(2)),
          rotation: 0,
        });
      }
    }

    set({
      objects: newObjects,
      selectedObjectId: newIds[0],
      selectedObjectIds: newIds,
    });
    state.showToast(`✨ Đã xếp kín ${totalCount} ảnh (${cols}×${rows}) trên khổ ${state.paperSize}!`);
  },

  // ---- Senior / Easy Mode ----
  easyMode: localStorage.getItem('photoprint_easyMode') === 'true',
  toggleEasyMode: () => {
    const next = !get().easyMode;
    localStorage.setItem('photoprint_easyMode', String(next));
    set({ easyMode: next });
    if (next) {
      document.body.classList.add('easy-mode');
      get().showToast('👓 Đã bật Chế độ Dễ nhìn (Chữ to, Nút to)');
    } else {
      document.body.classList.remove('easy-mode');
      get().showToast('Đã tắt Chế độ Dễ nhìn');
    }
  },

  // ---- Photoshop-style Align & Distribute ----
  alignObjects: (type) => {
    const state = get();
    if (state.objects.length === 0) return;
    state.pushUndo();
    const paper = PAPER_SIZES[state.paperSize];
    const margin = state.marginEnabled ? state.marginMm : 0;

    // Determine target objects (selected or all)
    let targets = state.objects;
    if (state.selectedObjectIds && state.selectedObjectIds.length > 0) {
      const selectedSet = new Set(state.selectedObjectIds);
      targets = state.objects.filter((o) => selectedSet.has(o.id));
    } else if (state.selectedObjectId) {
      const found = state.objects.find((o) => o.id === state.selectedObjectId);
      if (found) targets = [found];
    }

    if (targets.length === 0) return;

    // Single object selected: align relative to page/margin
    if (targets.length === 1) {
      const obj = targets[0];
      let newX = obj.xMm;
      let newY = obj.yMm;

      if (type === 'left') newX = margin;
      if (type === 'center-h') newX = (paper.widthMm - obj.widthMm) / 2;
      if (type === 'right') newX = paper.widthMm - margin - obj.widthMm;
      if (type === 'top') newY = margin;
      if (type === 'center-v') newY = (paper.heightMm - obj.heightMm) / 2;
      if (type === 'bottom') newY = paper.heightMm - margin - obj.heightMm;
      if (type === 'center-paper') {
        newX = (paper.widthMm - obj.widthMm) / 2;
        newY = (paper.heightMm - obj.heightMm) / 2;
      }

      set({
        objects: state.objects.map((o) =>
          o.id === obj.id
            ? { ...o, xMm: Math.max(0, newX), yMm: Math.max(0, newY) }
            : o
        ),
      });
      return;
    }

    // Multiple objects: align relative to common bounding box
    const minX = Math.min(...targets.map((o) => o.xMm));
    const maxX = Math.max(...targets.map((o) => o.xMm + o.widthMm));
    const minY = Math.min(...targets.map((o) => o.yMm));
    const maxY = Math.max(...targets.map((o) => o.yMm + o.heightMm));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    if (type === 'center-paper') {
      const boxW = maxX - minX;
      const boxH = maxY - minY;
      const targetBoxX = (paper.widthMm - boxW) / 2;
      const targetBoxY = (paper.heightMm - boxH) / 2;
      const shiftX = targetBoxX - minX;
      const shiftY = targetBoxY - minY;

      const targetIds = new Set(targets.map((t) => t.id));
      set({
        objects: state.objects.map((o) =>
          targetIds.has(o.id)
            ? { ...o, xMm: Math.max(0, o.xMm + shiftX), yMm: Math.max(0, o.yMm + shiftY) }
            : o
        ),
      });
      return;
    }

    const targetIds = new Set(targets.map((t) => t.id));
    set({
      objects: state.objects.map((o) => {
        if (!targetIds.has(o.id)) return o;
        let x = o.xMm;
        let y = o.yMm;
        if (type === 'left') x = minX;
        if (type === 'right') x = maxX - o.widthMm;
        if (type === 'center-h') x = centerX - o.widthMm / 2;
        if (type === 'top') y = minY;
        if (type === 'bottom') y = maxY - o.heightMm;
        if (type === 'center-v') y = centerY - o.heightMm / 2;
        return { ...o, xMm: Math.max(0, x), yMm: Math.max(0, y) };
      }),
    });
  },

  distributeObjects: (axis) => {
    const state = get();
    let targets = state.objects;
    if (state.selectedObjectIds && state.selectedObjectIds.length > 0) {
      const selectedSet = new Set(state.selectedObjectIds);
      targets = state.objects.filter((o) => selectedSet.has(o.id));
    } else if (state.selectedObjectId) {
      const found = state.objects.find((o) => o.id === state.selectedObjectId);
      if (found) targets = [found];
    }

    if (targets.length < 2) return;
    state.pushUndo();

    if (targets.length === 2) {
      const [first, second] =
        axis === 'horizontal'
          ? [...targets].sort((a, b) => a.xMm - b.xMm)
          : [...targets].sort((a, b) => a.yMm - b.yMm);

      if (axis === 'horizontal') {
        const newX = first.xMm + first.widthMm + state.spacingMm;
        set({
          objects: state.objects.map((o) =>
            o.id === second.id ? { ...o, xMm: newX } : o
          ),
        });
      } else {
        const newY = first.yMm + first.heightMm + state.spacingMm;
        set({
          objects: state.objects.map((o) =>
            o.id === second.id ? { ...o, yMm: newY } : o
          ),
        });
      }
      return;
    }

    if (axis === 'horizontal') {
      const sorted = [...targets].sort((a, b) => a.xMm - b.xMm);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpan = last.xMm - (first.xMm + first.widthMm);
      const intermediateTotalW = sorted
        .slice(1, -1)
        .reduce((sum, o) => sum + o.widthMm, 0);
      const gap = Math.max(
        0,
        (totalSpan - intermediateTotalW) / (sorted.length - 1)
      );

      let currentX = first.xMm + first.widthMm + gap;
      const posMap = new Map<string, number>();
      posMap.set(first.id, first.xMm);
      posMap.set(last.id, last.xMm);

      for (let i = 1; i < sorted.length - 1; i++) {
        posMap.set(sorted[i].id, currentX);
        currentX += sorted[i].widthMm + gap;
      }

      set({
        objects: state.objects.map((o) =>
          posMap.has(o.id) ? { ...o, xMm: posMap.get(o.id)! } : o
        ),
      });
    } else {
      const sorted = [...targets].sort((a, b) => a.yMm - b.yMm);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSpan = last.yMm - (first.yMm + first.heightMm);
      const intermediateTotalH = sorted
        .slice(1, -1)
        .reduce((sum, o) => sum + o.heightMm, 0);
      const gap = Math.max(
        0,
        (totalSpan - intermediateTotalH) / (sorted.length - 1)
      );

      let currentY = first.yMm + first.heightMm + gap;
      const posMap = new Map<string, number>();
      posMap.set(first.id, first.yMm);
      posMap.set(last.id, last.yMm);

      for (let i = 1; i < sorted.length - 1; i++) {
        posMap.set(sorted[i].id, currentY);
        currentY += sorted[i].heightMm + gap;
      }

      set({
        objects: state.objects.map((o) =>
          posMap.has(o.id) ? { ...o, yMm: posMap.get(o.id)! } : o
        ),
      });
    }
  },

  // ---- Snap ----
  snapEnabled: localStorage.getItem('photoprint_snap') !== 'false',
  setSnapEnabled: (enabled) => {
    localStorage.setItem('photoprint_snap', String(enabled));
    set({ snapEnabled: enabled });
  },

  // ---- Unit ----
  unit: (localStorage.getItem('photoprint_unit') as UnitType) || 'mm',
  setUnit: (unit) => {
    localStorage.setItem('photoprint_unit', unit);
    set({ unit });
  },

  // ---- Zoom ----
  zoom: 0.7,
  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(3, zoom)) }),

  // ---- Last used size ----
  lastUsedSize: (() => {
    const saved = localStorage.getItem('photoprint_lastSize');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  })(),
  setLastUsedSize: (size) => {
    localStorage.setItem('photoprint_lastSize', JSON.stringify(size));
    set({ lastUsedSize: size });
  },

  // ---- Undo / Redo ----
  undoStack: [],
  redoStack: [],

  pushUndo: () => {
    const { objects, paperSize } = get();
    set((s) => ({
      undoStack: [...s.undoStack.slice(-50), { objects: JSON.parse(JSON.stringify(objects)), paperSize }],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, objects, paperSize } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, { objects: JSON.parse(JSON.stringify(objects)), paperSize }],
      objects: prev.objects,
      paperSize: prev.paperSize,
    });
  },

  redo: () => {
    const { redoStack, objects, paperSize } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, { objects: JSON.parse(JSON.stringify(objects)), paperSize }],
      objects: next.objects,
      paperSize: next.paperSize,
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  // ---- Size Picker Dialog ----
  showSizePicker: false,
  pendingImages: [],
  openSizePicker: (images) => set({ showSizePicker: true, pendingImages: images }),
  closeSizePicker: () => set({ showSizePicker: false, pendingImages: [] }),

  // ---- Crop Editor ----
  showCropEditor: false,
  cropTargetId: null,
  cropTargetRatio: null,
  openCropEditor: (objectId, targetRatio) =>
    set({ showCropEditor: true, cropTargetId: objectId, cropTargetRatio: targetRatio }),
  closeCropEditor: () =>
    set({ showCropEditor: false, cropTargetId: null, cropTargetRatio: null }),

  // ---- Print Preview ----
  showPreview: false,
  setShowPreview: (show) => set({ showPreview: show }),

  // ---- Settings Dialog & Defaults ----
  showSettings: false,
  openSettings: () => set({ showSettings: true }),
  closeSettings: () => set({ showSettings: false }),

  saveAllSettingsAsDefault: (customSettings) => {
    const state = get();
    const paperSize = customSettings?.paperSize ?? state.paperSize;
    const unit = customSettings?.unit ?? state.unit;
    const borderEnabled = customSettings?.borderEnabled ?? state.borderEnabled;
    const borderWidthMm = customSettings?.borderWidthMm ?? state.borderWidthMm;
    const borderColor = customSettings?.borderColor ?? state.borderColor;
    const marginEnabled = customSettings?.marginEnabled ?? state.marginEnabled;
    const marginMm = customSettings?.marginMm ?? state.marginMm;
    const spacingMm = customSettings?.spacingMm ?? state.spacingMm;
    const lockRatio = customSettings?.lockRatio ?? state.lockRatio;

    localStorage.setItem('photoprint_paperSize', paperSize);
    localStorage.setItem('photoprint_unit', unit);
    localStorage.setItem('photoprint_borderEnabled', String(borderEnabled));
    localStorage.setItem('photoprint_borderWidthMm', String(borderWidthMm));
    localStorage.setItem('photoprint_borderColor', borderColor);
    localStorage.setItem('photoprint_marginEnabled', String(marginEnabled));
    localStorage.setItem('photoprint_marginMm', String(marginMm));
    localStorage.setItem('photoprint_spacing', String(spacingMm));
    localStorage.setItem('photoprint_lockRatio', String(lockRatio));

    set({
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

    state.showToast('✓ Đã lưu tất cả cài đặt làm mặc định khi mở ứng dụng!');
  },

  resetDefaultSettings: () => {
    localStorage.removeItem('photoprint_paperSize');
    localStorage.removeItem('photoprint_unit');
    localStorage.removeItem('photoprint_borderEnabled');
    localStorage.removeItem('photoprint_borderWidthMm');
    localStorage.removeItem('photoprint_borderColor');
    localStorage.removeItem('photoprint_marginEnabled');
    localStorage.removeItem('photoprint_marginMm');
    localStorage.removeItem('photoprint_spacing');
    localStorage.removeItem('photoprint_lockRatio');

    set({
      paperSize: 'A4',
      unit: 'cm',
      borderEnabled: true,
      borderWidthMm: 0.25,
      borderColor: '#000000',
      marginEnabled: true,
      marginMm: 5,
      spacingMm: 2,
      lockRatio: true,
    });

    get().showToast('✓ Đã khôi phục cài đặt gốc của ứng dụng');
  },

  // ---- Project Save / Open ----
  exportProject: () => {
    const state = get();
    if (state.objects.length === 0) {
      state.showToast('Không có ảnh nào để lưu');
      return;
    }
    const data = {
      app: 'PhotoPrint Local',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      paperSize: state.paperSize,
      marginEnabled: state.marginEnabled,
      marginMm: state.marginMm,
      borderEnabled: state.borderEnabled,
      borderWidthMm: state.borderWidthMm,
      borderColor: state.borderColor,
      spacingMm: state.spacingMm,
      objects: state.objects,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photoprint_${state.paperSize}_${new Date().toISOString().slice(0, 10)}.photoprint`;
    a.click();
    URL.revokeObjectURL(url);
    state.showToast('✓ Đã tải về file dự án (.photoprint)');
  },

  importProject: (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (!Array.isArray(data.objects)) {
        throw new Error('Định dạng file không hợp lệ');
      }
      get().pushUndo();
      set({
        paperSize: data.paperSize || 'A4',
        marginEnabled: data.marginEnabled ?? true,
        marginMm: data.marginMm ?? 3,
        borderEnabled: data.borderEnabled ?? true,
        borderWidthMm: data.borderWidthMm ?? 0.25,
        borderColor: data.borderColor ?? '#000000',
        spacingMm: data.spacingMm ?? 2,
        objects: data.objects,
        selectedObjectId: null,
        selectedObjectIds: [],
      });
      get().showToast(`✓ Đã mở dự án thành công (${data.objects.length} ảnh)`);
    } catch (e: any) {
      alert('Không thể mở file dự án: ' + (e?.message || 'File lỗi'));
    }
  },

  // ---- Toast Feedback ----
  toastMessage: null,
  showToast: (message: string) => {
    set({ toastMessage: message });
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      set({ toastMessage: null });
    }, 2200);
  },
}));
