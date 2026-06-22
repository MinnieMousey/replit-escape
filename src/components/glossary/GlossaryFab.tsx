import React, { useState } from 'react';
import { GlossaryOverlay } from '@/components/glossary/GlossaryOverlay';

/**
 * Floating glossary launcher. Drop on any authenticated screen that doesn't
 * already expose the glossary through its own chrome (the shift HUD has its own
 * button). Fixed to the bottom-right so it never collides with page layout.
 */
export const GlossaryFab: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <GlossaryOverlay isOpen={open} onClose={() => setOpen(false)} />
      <button
        onClick={() => setOpen(true)}
        data-testid="button-glossary-fab"
        title="Open glossary & references"
        style={{ touchAction: 'manipulation' }}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-sky-500/90 hover:bg-sky-400 text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-sky-900/40 border border-sky-300/40 px-4 py-3 transition-colors backdrop-blur-md"
      >
        <span className="text-base leading-none">📖</span>
        <span className="hidden sm:inline">Glossary</span>
      </button>
    </>
  );
};
