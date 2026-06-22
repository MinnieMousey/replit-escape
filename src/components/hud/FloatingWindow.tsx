import React, { useCallback, useEffect, useRef, useState } from 'react';

// ── Reusable floating window ──────────────────────────────────────────────────
// A draggable + resizable panel: drag the title bar to move, drag the edges /
// corner to resize, click anywhere to bring to front, and close with ×. Stays
// clamped within the viewport. Uses pointer events so it works with mouse and
// touch (iPad) alike.

export interface FloatingWindowProps {
  title: string;
  icon?: string;
  /** Optional element shown on the right side of the title bar (e.g. a badge). */
  headerExtra?: React.ReactNode;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  minWidth?: number;
  minHeight?: number;
  zIndex: number;
  onFocus: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

interface Box { x: number; y: number; w: number; h: number; }

type DragMode = 'move' | 'resize-se' | 'resize-e' | 'resize-s' | null;

const TOP_MARGIN = 64; // keep the title bar below the HUD bar

function clampBox(box: Box, minW: number, minH: number): Box {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.max(minW, Math.min(box.w, vw));
  const h = Math.max(minH, Math.min(box.h, vh - TOP_MARGIN));
  const x = Math.max(0, Math.min(box.x, vw - w));
  const y = Math.max(TOP_MARGIN, Math.min(box.y, vh - h));
  return { x, y, w, h };
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  title, icon, headerExtra,
  initialX, initialY, initialWidth, initialHeight,
  minWidth = 280, minHeight = 200,
  zIndex, onFocus, onClose, children,
}) => {
  const [box, setBox] = useState<Box>(() =>
    clampBox({ x: initialX, y: initialY, w: initialWidth, h: initialHeight }, minWidth, minHeight),
  );

  const dragMode = useRef<DragMode>(null);
  const start = useRef<{ px: number; py: number; box: Box }>({ px: 0, py: 0, box });

  const beginDrag = useCallback((mode: DragMode, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragMode.current = mode;
    start.current = { px: e.clientX, py: e.clientY, box };
    onFocus();
  }, [box, onFocus]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragMode.current) return;
    e.preventDefault();
    const dx = e.clientX - start.current.px;
    const dy = e.clientY - start.current.py;
    const s = start.current.box;
    let next: Box;
    if (dragMode.current === 'move') {
      next = { ...s, x: s.x + dx, y: s.y + dy };
    } else if (dragMode.current === 'resize-se') {
      next = { ...s, w: s.w + dx, h: s.h + dy };
    } else if (dragMode.current === 'resize-e') {
      next = { ...s, w: s.w + dx };
    } else {
      next = { ...s, h: s.h + dy };
    }
    setBox(clampBox(next, minWidth, minHeight));
  }, [minWidth, minHeight]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!dragMode.current) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    dragMode.current = null;
  }, []);

  // Re-clamp when the viewport is resized so the window can't end up off-screen.
  useEffect(() => {
    const onResize = () => setBox(b => clampBox(b, minWidth, minHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [minWidth, minHeight]);

  return (
    <div
      className="fixed flex flex-col bg-slate-900/98 border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h, zIndex }}
      onPointerDown={onFocus}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Title bar — drag handle */}
      <div
        onPointerDown={e => beginDrag('move', e)}
        style={{ touchAction: 'none', cursor: 'move' }}
        className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5 select-none"
      >
        {icon && <span className="text-base">{icon}</span>}
        <h2 className="text-sm font-bold text-sky-300 truncate">{title}</h2>
        <div className="ml-auto flex items-center gap-2" onPointerDown={e => e.stopPropagation()}>
          {headerExtra}
          <button
            onClick={onClose}
            style={{ touchAction: 'manipulation' }}
            data-testid={`window-close-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="text-white/40 hover:text-white text-2xl leading-none px-1"
            title="Close"
          >×</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {children}
      </div>

      {/* Resize handles */}
      <div
        onPointerDown={e => beginDrag('resize-e', e)}
        style={{ touchAction: 'none', cursor: 'ew-resize' }}
        className="absolute top-8 right-0 w-2 bottom-4"
      />
      <div
        onPointerDown={e => beginDrag('resize-s', e)}
        style={{ touchAction: 'none', cursor: 'ns-resize' }}
        className="absolute bottom-0 left-4 right-4 h-2"
      />
      <div
        onPointerDown={e => beginDrag('resize-se', e)}
        style={{ touchAction: 'none', cursor: 'nwse-resize' }}
        className="absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end p-0.5"
      >
        <span className="text-white/30 text-xs leading-none">⠿</span>
      </div>
    </div>
  );
};
