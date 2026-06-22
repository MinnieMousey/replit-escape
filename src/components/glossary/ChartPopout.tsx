import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Full-screen pop-out shell for the chart-backed glossary tabs. Renders above the
// glossary modal (which is z-50) via a portal to <body>; dismissible with Esc, the
// Close button, or a click on the dimmed backdrop. The normal pinned/collapsible
// chart in the page is left untouched — this is an additive overlay.
export const ChartPopout: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] bg-slate-950/95 backdrop-blur-sm flex flex-col p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden border border-white/12 bg-slate-900 shadow-2xl shadow-black/60"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border-b border-white/10 shrink-0">
          <span className="text-sky-300 font-bold text-sm truncate">{title}</span>
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={onClose}
            className="ml-auto px-3 py-1.5 rounded-lg border border-white/15 bg-black/30 text-white/70 hover:text-white text-xs font-bold transition-colors shrink-0"
          >Close ✕</button>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

// Large image viewer for the pop-out: fits to the screen by default, with a toggle
// to view the chart at actual pixels (scroll/pan).
export const PopoutImage: React.FC<{ src: string; alt: string; caption?: string }> = ({ src, alt, caption }) => {
  const [actual, setActual] = useState(false);
  return (
    <div className="w-full h-full flex flex-col bg-slate-950">
      <div className="px-3 py-1.5 bg-slate-900/80 border-b border-white/10 flex items-center gap-2 shrink-0">
        <button
          style={{ touchAction: 'manipulation' }}
          onClick={() => setActual(a => !a)}
          className="px-2.5 py-1 rounded-md border border-white/15 bg-black/30 text-white/70 hover:text-white text-[11px] font-bold transition-colors"
        >{actual ? 'Fit to screen' : 'Actual size'}</button>
        <span className="text-white/30 text-[10px]">{actual ? 'Scroll to pan the full-resolution chart.' : 'Tap “Actual size” to zoom in.'}</span>
        {caption && <span className="ml-auto text-white/25 text-[10px] truncate hidden sm:block">{caption}</span>}
      </div>
      <div className={`flex-1 min-h-0 ${actual ? 'overflow-auto' : 'overflow-hidden flex items-center justify-center'} ${actual ? 'bg-white' : 'bg-slate-950'}`}>
        <img src={src} alt={alt} className={actual ? 'max-w-none block' : 'max-w-full max-h-full object-contain'} />
      </div>
    </div>
  );
};
