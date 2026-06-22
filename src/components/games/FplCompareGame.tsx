import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';
import { FplCompareRow } from '@/lib/taskGenerator';

// Normalise a value for comparison. Routes keep single spaces between tokens;
// every other field strips spaces entirely so minor spacing slips don't matter.
const normVal = (key: string, s: string) => {
  const up = (s ?? '').trim().toUpperCase();
  return key === 'route' ? up.replace(/\s+/g, ' ') : up.replace(/\s+/g, '');
};

export const FplCompareGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const scenario = task?.scenario as {
    operator: string;
    aircraftType: string;
    wake: string;
    flightRules: string;
    speed: string;
    inboundDesc: string;
    outboundDesc: string;
    rows: FplCompareRow[];
  } | undefined;

  const rows = scenario?.rows ?? [];

  // The outbound plan starts as a COPY of the inbound plan (the authentic
  // "duplicate then amend" workflow). The officer edits each field that should
  // change and leaves the ones that stay the same.
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map(r => [r.key, r.inbound])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults]     = useState<Record<string, boolean>>({});
  const [earned, setEarned]       = useState(0);

  useEffect(() => {
    if (task) {
      setForm(Object.fromEntries(rows.map(r => [r.key, r.inbound])));
      setSubmitted(false);
      setResults({});
      setEarned(0);
    }
  }, [task?.id]);

  if (!task || task.type !== 'FPL_COMPARE' || !scenario) return null;

  const upd = (key: string, val: string) => {
    if (!submitted) setForm(prev => ({ ...prev, [key]: val.toUpperCase() }));
  };

  const handleSubmit = () => {
    if (submitted) return;
    const res: Record<string, boolean> = {};
    let correct = 0;
    rows.forEach(r => {
      const ok = normVal(r.key, form[r.key] ?? '') === normVal(r.key, r.outbound);
      res[r.key] = ok;
      if (ok) correct++;
    });
    const score = Math.round((correct / Math.max(rows.length, 1)) * task.maxScore);
    setResults(res);
    setEarned(score);
    setSubmitted(true);
    submitTask(task.id, score, task.maxScore, `${correct}/${rows.length} fields matched the correct outbound plan`);
  };

  const ca = task.correctAnswer as { rows: FplCompareRow[]; explanation: string };

  const inputCls = (key: string) => {
    const r = submitted ? results[key] : undefined;
    return `w-full border px-2 py-1.5 font-mono text-[13px] leading-tight text-slate-900 outline-none transition-colors ${
      r === true  ? 'border-green-600 bg-green-50' :
      r === false ? 'border-red-500 bg-red-50'     :
      'border-slate-400 bg-white focus:border-sky-600'
    }`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header / aircraft summary ── */}
      <div className="shrink-0 mb-3">
        <div className="text-xs text-white/40 font-bold uppercase tracking-widest">Inbound vs Outbound FPL — {scenario.operator}</div>
        <p className="text-xs text-white/40 mt-1">
          The <span className="text-sky-300">inbound</span> plan is shown on the left. The same aircraft turns around and flies back out.
          Edit the <span className="text-emerald-300">outbound</span> plan so each field is correct for the return leg, then submit.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
          <span>Type <span className="font-mono text-white/80">{scenario.aircraftType}</span></span>
          <span>Wake <span className="font-mono text-white/80">{scenario.wake}</span></span>
          <span>Rules <span className="font-mono text-white/80">{scenario.flightRules}</span></span>
          <span>Speed <span className="font-mono text-white/80">{scenario.speed}</span></span>
          <span className="text-white/30 italic">(these carry over unchanged)</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3">
        {/* ── Leg descriptions ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 shrink-0">
          <div className="rounded-lg border border-sky-400/30 bg-sky-900/15 p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-sky-300 mb-0.5">Inbound leg</div>
            <div className="text-[11px] text-sky-100/80 leading-snug">{scenario.inboundDesc}</div>
          </div>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-900/15 p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mb-0.5">Outbound leg</div>
            <div className="text-[11px] text-emerald-100/80 leading-snug">{scenario.outboundDesc}</div>
          </div>
        </div>

        {/* ── Field-by-field comparison ── */}
        <div className="space-y-2">
          {rows.map(r => {
            const changed = normVal(r.key, r.inbound) !== normVal(r.key, r.outbound);
            const userChanged = normVal(r.key, form[r.key] ?? '') !== normVal(r.key, r.inbound);
            return (
              <div key={r.key} className="rounded-xl border border-white/12 bg-black/20 p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold font-mono text-slate-300 bg-white/10 rounded px-1.5 py-0.5">{/^\d+$/.test(r.item) ? `Item ${r.item}` : r.item}</span>
                  <span className="text-[11px] uppercase tracking-wide text-white/55 font-semibold">{r.label}</span>
                  {!submitted && userChanged && (
                    <span className="text-[9px] uppercase tracking-widest text-amber-300/80 border border-amber-400/30 rounded px-1.5 py-0.5">edited</span>
                  )}
                  {submitted && (
                    <span className={`ml-auto text-[11px] font-bold ${results[r.key] ? 'text-green-400' : 'text-red-400'}`}>
                      {results[r.key] ? '✓ correct' : '✗'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                  {/* Inbound (read-only reference) */}
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-sky-400/70 mb-0.5">Inbound</div>
                    <div className="border border-slate-500/40 bg-slate-800/40 px-2 py-1.5 font-mono text-[13px] text-sky-100/90 break-words min-h-[34px] flex items-center">
                      {r.inbound || <span className="text-white/30 italic font-sans text-[11px]">— blank —</span>}
                    </div>
                  </div>

                  {/* Outbound (editable) */}
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-emerald-400/70 mb-0.5">Outbound</div>
                    {r.key === 'route' ? (
                      <textarea
                        className={`${inputCls(r.key)} resize-none`}
                        rows={2}
                        style={{ touchAction: 'manipulation' }}
                        value={form[r.key] ?? ''}
                        onChange={e => upd(r.key, e.target.value)}
                        readOnly={submitted}
                      />
                    ) : (
                      <input
                        type="text"
                        className={inputCls(r.key)}
                        style={{ touchAction: 'manipulation' }}
                        value={form[r.key] ?? ''}
                        onChange={e => upd(r.key, e.target.value)}
                        readOnly={submitted}
                      />
                    )}
                  </div>
                </div>

                {submitted && (
                  <div className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-relaxed">
                    {!results[r.key] && (
                      <div className="text-red-300/90 mb-1">
                        Correct outbound value: <span className="font-mono font-bold text-red-200">{r.outbound || '(blank)'}</span>
                      </div>
                    )}
                    <div className={changed ? 'text-amber-200/80' : 'text-white/50'}>
                      <span className="font-bold">{changed ? 'Changes:' : 'Unchanged:'}</span> {r.why}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {submitted && (
          <div className={`p-4 rounded-xl border ${earned >= task.maxScore * 0.7 ? 'border-green-400/50 bg-green-900/20' : earned >= task.maxScore * 0.4 ? 'border-amber-400/50 bg-amber-900/20' : 'border-red-400/50 bg-red-900/20'}`}>
            <div className="text-white font-bold text-base">Score: {earned} / {task.maxScore}</div>
            <div className="text-white/60 text-xs mt-1 mb-2">
              {Object.values(results).filter(Boolean).length} / {rows.length} fields matched the correct outbound plan
            </div>
            <div className="text-[12px] text-white/70 leading-relaxed border-t border-white/10 pt-2">{ca.explanation}</div>
          </div>
        )}
      </div>

      {!submitted && (
        <button
          type="button"
          onClick={handleSubmit}
          style={{ touchAction: 'manipulation' }}
          className="mt-3 shrink-0 w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-bold py-3 rounded-xl transition-colors text-xs tracking-widest uppercase"
        >
          Submit Outbound Plan
        </button>
      )}
    </div>
  );
};
