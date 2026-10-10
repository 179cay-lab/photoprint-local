// ============================================================
// Ruler Component — Horizontal & Vertical (Attached to Paper)
// ============================================================

import { useRef, useEffect } from 'react';
import './Canvas.css';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  lengthMm: number;
  zoom: number;
  highlightRange?: { startMm: number; lengthMm: number } | null;
}

const PX_PER_MM = 96 / 25.4;
const RULER_SIZE = 24;

export function Ruler({ orientation, lengthMm, zoom, highlightRange }: RulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const totalPx = lengthMm * PX_PER_MM * zoom;
    const dpr = window.devicePixelRatio || 1;

    if (orientation === 'horizontal') {
      canvas.width = Math.round(totalPx * dpr);
      canvas.height = Math.round(RULER_SIZE * dpr);
      canvas.style.width = `${totalPx}px`;
      canvas.style.height = `${RULER_SIZE}px`;
    } else {
      canvas.width = Math.round(RULER_SIZE * dpr);
      canvas.height = Math.round(totalPx * dpr);
      canvas.style.width = `${RULER_SIZE}px`;
      canvas.style.height = `${totalPx}px`;
    }

    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#f8fafc';
    if (orientation === 'horizontal') {
      ctx.fillRect(0, 0, totalPx, RULER_SIZE);
    } else {
      ctx.fillRect(0, 0, RULER_SIZE, totalPx);
    }

    // Highlight active object span if available
    if (highlightRange && highlightRange.lengthMm > 0) {
      const startPx = Math.max(0, highlightRange.startMm * PX_PER_MM * zoom);
      const lengthPx = Math.min(totalPx - startPx, highlightRange.lengthMm * PX_PER_MM * zoom);

      ctx.fillStyle = 'rgba(37, 99, 235, 0.15)'; // light primary blue
      if (orientation === 'horizontal') {
        ctx.fillRect(startPx, 0, lengthPx, RULER_SIZE);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startPx, 0); ctx.lineTo(startPx, RULER_SIZE);
        ctx.moveTo(startPx + lengthPx, 0); ctx.lineTo(startPx + lengthPx, RULER_SIZE);
        ctx.stroke();
      } else {
        ctx.fillRect(0, startPx, RULER_SIZE, lengthPx);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, startPx); ctx.lineTo(RULER_SIZE, startPx);
        ctx.moveTo(0, startPx + lengthPx); ctx.lineTo(RULER_SIZE, startPx + lengthPx);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#94a3b8';
    ctx.font = '9px Inter, system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Draw marks every mm, labels every cm
    for (let mm = 0; mm <= lengthMm; mm++) {
      const pos = mm * PX_PER_MM * zoom;
      const isCm = mm % 10 === 0;
      const is5mm = mm % 5 === 0;

      let markLength: number;
      if (isCm) {
        markLength = 12;
        ctx.strokeStyle = '#334155';
      } else if (is5mm) {
        markLength = 8;
        ctx.strokeStyle = '#64748b';
      } else {
        markLength = 4;
        ctx.strokeStyle = '#cbd5e1';
      }

      // Filter marks when zoomed out
      if (!isCm && !is5mm && zoom < 0.5) continue;
      if (!isCm && zoom < 0.3) continue;

      ctx.beginPath();
      if (orientation === 'horizontal') {
        ctx.moveTo(pos, RULER_SIZE - markLength);
        ctx.lineTo(pos, RULER_SIZE);
      } else {
        ctx.moveTo(RULER_SIZE - markLength, pos);
        ctx.lineTo(RULER_SIZE, pos);
      }
      ctx.lineWidth = isCm ? 1 : 0.5;
      ctx.stroke();

      // Labels at cm marks (0, 1, 2, ...)
      if (isCm) {
        const label = `${mm / 10}`;
        if (orientation === 'horizontal') {
          if (pos + 14 > totalPx) {
            ctx.textAlign = 'right';
            ctx.fillText(label, pos - 2, 2);
            ctx.textAlign = 'left';
          } else {
            ctx.fillText(label, mm === 0 ? 2 : pos + 2, 2);
          }
        } else {
          if (pos + 14 > totalPx) {
            ctx.fillText(label, 2, pos - 10);
          } else {
            ctx.fillText(label, 2, mm === 0 ? 2 : pos + 2);
          }
        }
      }
    }

    // Border along the edge facing the paper sheet
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (orientation === 'horizontal') {
      ctx.moveTo(0, RULER_SIZE - 0.5);
      ctx.lineTo(totalPx, RULER_SIZE - 0.5);
    } else {
      ctx.moveTo(RULER_SIZE - 0.5, 0);
      ctx.lineTo(RULER_SIZE - 0.5, totalPx);
    }
    ctx.stroke();
  }, [orientation, lengthMm, zoom, highlightRange]);

  const totalPx = lengthMm * PX_PER_MM * zoom;

  return (
    <div
      className={`ruler ruler-${orientation}`}
      style={
        orientation === 'horizontal'
          ? { width: `${totalPx}px`, height: `${RULER_SIZE}px` }
          : { width: `${RULER_SIZE}px`, height: `${totalPx}px` }
      }
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
