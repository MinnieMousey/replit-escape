import React, { useState, useRef, useEffect } from 'react';

interface SelectPickerProps {
  value: string;
  opts: [string, string][];
  onChange: (v: string) => void;
  disabled?: boolean;
  isCorrect?: boolean;
  placeholder?: string;
}

export const SelectPicker: React.FC<SelectPickerProps> = ({
  value, opts, onChange, disabled = false, isCorrect, placeholder = 'Select…',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = opts.find(([v]) => v === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  const borderCls =
    isCorrect === true  ? 'border-green-400 bg-green-900/10' :
    isCorrect === false ? 'border-red-400 bg-red-900/10' :
    open ? 'border-sky-400' : 'border-white/20 hover:border-white/40';

  return (
    <div ref={ref} className="relative select-none">
      <button
        type="button"
        disabled={disabled}
        style={{ touchAction: 'manipulation' }}
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        className={`w-full text-left bg-black/30 border rounded px-2 py-2 text-xs font-mono text-white flex items-center justify-between gap-2 transition-colors outline-none ${borderCls} ${disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
      >
        <span className="truncate min-w-0">
          {current
            ? <><span className="text-sky-300 font-bold mr-1">{current[0]}</span><span className="text-white/70">— {current[1]}</span></>
            : <span className="text-white/30">{placeholder}</span>}
        </span>
        <span className="shrink-0 text-white/30 text-xs ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && !disabled && (
        <div className="absolute z-40 top-full mt-1 left-0 right-0 bg-slate-900 border border-sky-400/40 rounded-lg overflow-hidden shadow-2xl" style={{ maxHeight: '220px', overflowY: 'auto' }}>
          {opts.map(([v, l]) => (
            <button
              key={v}
              type="button"
              style={{ touchAction: 'manipulation' }}
              onClick={() => { onChange(v); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs border-b border-white/5 last:border-0 transition-colors ${
                v === value
                  ? 'bg-sky-900/60 text-white'
                  : 'text-white/70 hover:bg-white/10 active:bg-white/20'
              }`}
            >
              <span className="font-mono font-bold text-sky-400 mr-1.5">{v}</span>
              <span>{l}</span>
              {v === value && <span className="float-right text-sky-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
