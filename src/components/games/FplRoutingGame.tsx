import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';
import { ROUTING_FOLDERS } from '@/lib/taskGenerator';
import { folderForAddressee, SHIFT_DOF } from '@/lib/fileStore';

type Decision = 'transmit' | 'disregard';

export const FplRoutingGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask, addStoreMessage } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<{ perfect: boolean; award: number; decision: Decision } | null>(null);

  useEffect(() => {
    if (task) {
      setSelected([]);
      setResult(null);
    }
  }, [task?.id]);

  if (!task || task.type !== 'FPL_ROUTING') return null;

  const s = task.scenario as {
    messageType: 'FPL' | 'CNL';
    callsign: string; aircraftType: string; flightRules: string;
    dep: string; depName: string; dest: string; destName: string;
    eobt: string; routeText: string;
  };
  const ca = task.correctAnswer as { aftn: string[]; disregard: boolean; explanation: string };
  const correct = new Set(ca.aftn);
  const submitted = result !== null;
  const isCnl = s.messageType === 'CNL';

  const toggle = (aftn: string) => {
    if (submitted) return;
    setSelected(prev =>
      prev.includes(aftn) ? prev.filter(a => a !== aftn) : [...prev, aftn]);
  };

  const decide = (decision: Decision) => {
    if (submitted) return;
    if (decision === 'transmit' && selected.length === 0) return;

    const sel = new Set(selected);
    let perfect = false;
    let award = 0;
    let summary = '';
    const floor = Math.round(task.maxScore * 0.1);

    if (ca.disregard) {
      perfect = decision === 'disregard';
      award = perfect ? task.maxScore : floor;
      summary = perfect
        ? 'Correctly disregarded — this message is not for AIS Barbados to transmit.'
        : `Incorrect — this message should have been disregarded. ${ca.explanation}`;
    } else if (decision === 'disregard') {
      perfect = false;
      award = floor;
      summary = `Incorrect — this message needed transmitting, not disregarding. ${ca.explanation}`;
    } else {
      const hit   = ca.aftn.filter(a => sel.has(a)).length;
      const miss  = ca.aftn.filter(a => !sel.has(a)).length;
      const extra = selected.filter(a => !correct.has(a)).length;
      const required = ca.aftn.length || 1; // guard against divide-by-zero
      perfect = hit === ca.aftn.length && extra === 0;
      const frac = Math.max(0, (hit - extra) / required);
      award = perfect ? task.maxScore : Math.max(floor, Math.round(task.maxScore * frac));
      summary = perfect
        ? 'Correctly addressed to all required AFTN addressees.'
        : `${hit}/${ca.aftn.length} required addressees correct` +
          (extra > 0 ? `, ${extra} incorrect` : '') +
          (miss > 0 ? `, ${miss} missing` : '') + `. ${ca.explanation}`;
    }

    setResult({ perfect, award, decision });
    submitTask(task.id, award, task.maxScore, summary);

    // Only a correct transmission (all required addressees, no extras) files a
    // copy into each addressee's folder in the shift file store as processed
    // work. This keeps the store a trustworthy record of what was actually and
    // correctly transmitted — failed attempts must not fabricate filed records.
    if (decision === 'transmit' && perfect) {
      for (const aftn of selected) {
        addStoreMessage({
          kind: s.messageType,
          callsign: s.callsign,
          folderId: folderForAddressee(aftn),
          addressee: aftn,
          flightDate: SHIFT_DOF,
          dep: s.dep,
          dest: s.dest,
          detail: isCnl
            ? `Cancellation transmitted — ${s.dep} → ${s.dest}`
            : `FPL transmitted — ${s.dep} → ${s.dest}, EOBT ${s.eobt}`,
          acked: true,
          processed: true,
        });
      }
    }
  };

  const isPerfect = result?.perfect ?? false;

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-3">
      <div className="shrink-0">
        <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
          AFTN Message Routing
        </div>
        <p className="text-xs text-white/40 mt-1">
          Read the message, then transmit it to the correct AFTN addressees — or disregard it if AIS Barbados has no part in it.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        {/* LEFT — the message + the addressee field */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Plain-language message */}
          <div className="rounded-xl p-4 border bg-black/30 border-white/15">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {isCnl ? 'Flight Plan Cancellation' : 'Approved Flight Plan'}
              </span>
              {isCnl ? (
                <span className="text-[10px] -rotate-6 border-2 border-orange-400/70 text-orange-300 font-bold uppercase tracking-widest px-1.5 py-0.5 rounded">
                  CNL ✕
                </span>
              ) : (
                <span className="text-[10px] -rotate-6 border-2 border-emerald-400/70 text-emerald-300 font-bold uppercase tracking-widest px-1.5 py-0.5 rounded">
                  Approved ✓
                </span>
              )}
            </div>
            <div className="font-mono text-sm space-y-1.5">
              <Row label="Message type" value={isCnl ? 'CNL — Cancellation' : 'FPL — Flight Plan'} bold />
              <Row label="Callsign / Reg" value={s.callsign} />
              <Row label="Aircraft type" value={s.aircraftType} />
              <Row label="Flight rules" value={s.flightRules} />
              <Row label="Departure" value={`${s.dep} (${s.depName}), off ${s.eobt}Z`} />
              <Row label="Destination" value={`${s.dest} (${s.destName})`} />
              <Row label="Routing" value={s.routeText} />
            </div>
          </div>

          {/* Addressee field */}
          <div className="rounded-xl p-3 border bg-black/20 border-white/15">
            <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-2">
              AFTN Addressees
            </div>
            {selected.length === 0 ? (
              <p className="text-xs text-white/30 italic py-1.5">
                Click folders in the address book to add the AFTN addresses this message must be sent to — or disregard it if it isn't ours.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selected.map(aftn => {
                  const ok = submitted && correct.has(aftn);
                  const bad = submitted && !correct.has(aftn);
                  return (
                    <span
                      key={aftn}
                      className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold rounded-md px-2 py-1 border ${
                        ok
                          ? 'bg-green-900/40 border-green-500/50 text-green-200'
                          : bad
                          ? 'bg-red-900/40 border-red-500/50 text-red-200'
                          : 'bg-sky-900/40 border-sky-400/50 text-sky-100'
                      }`}
                    >
                      {aftn}
                      {submitted ? (ok ? ' ✓' : ' ✗') : (
                        <button
                          onClick={() => toggle(aftn)}
                          style={{ touchAction: 'manipulation' }}
                          className="text-white/50 hover:text-white"
                          aria-label={`Remove ${aftn}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {!submitted && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => decide('transmit')}
                disabled={selected.length === 0}
                data-testid="button-submit-routing"
                style={{ touchAction: 'manipulation' }}
                className="flex-1 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold text-sm transition-colors"
              >
                Transmit to {selected.length || 'selected'} addressee{selected.length === 1 ? '' : 's'}
              </button>
              <button
                onClick={() => decide('disregard')}
                data-testid="button-disregard-routing"
                style={{ touchAction: 'manipulation' }}
                className="h-11 px-4 rounded-xl border border-white/20 bg-black/20 hover:bg-white/10 text-white/70 hover:text-white font-bold text-sm transition-colors"
              >
                Disregard
              </button>
            </div>
          )}
        </div>

        {/* RIGHT — file-explorer style AFTN address book */}
        <div className="w-full lg:w-72 shrink-0 rounded-xl border border-white/15 bg-black/20 p-2 flex flex-col">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest px-2 py-1.5">
            📂 AFTN Address Book
          </div>
          <div className="space-y-1">
            {ROUTING_FOLDERS.map(folder => {
              const isSelected = selected.includes(folder.aftn);
              const isRequired = correct.has(folder.aftn);
              const showCorrect = submitted && isRequired && isSelected;
              const showMissed  = submitted && isRequired && !isSelected;
              const showWrong   = submitted && !isRequired && isSelected;
              return (
                <button
                  key={folder.id}
                  onClick={() => toggle(folder.aftn)}
                  disabled={submitted}
                  data-testid={`folder-${folder.id}`}
                  style={{ touchAction: 'manipulation' }}
                  className={`w-full text-left p-2.5 rounded-lg border text-sm transition-colors ${
                    showCorrect
                      ? 'border-green-500 bg-green-900/30'
                      : showMissed
                      ? 'border-amber-500 bg-amber-900/20'
                      : showWrong
                      ? 'border-red-500 bg-red-900/30'
                      : isSelected
                      ? 'border-sky-400 bg-sky-900/30'
                      : submitted
                      ? 'border-white/5 bg-black/10'
                      : 'border-white/15 bg-black/20 hover:bg-white/10 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{isSelected ? '📂' : '📁'}</span>
                    <span className="font-semibold text-white/90 text-xs leading-tight">
                      {folder.country}
                    </span>
                    {showCorrect && <span className="ml-auto text-green-400 font-bold">✓</span>}
                    {showMissed  && <span className="ml-auto text-amber-400 font-bold text-[10px] uppercase">missed</span>}
                    {showWrong   && <span className="ml-auto text-red-400 font-bold">✗</span>}
                  </div>
                  <div className="flex items-center justify-between mt-1 pl-7">
                    <span className="text-[11px] text-white/40 leading-tight">{folder.unit}</span>
                    <span className="font-mono text-[11px] font-bold text-sky-300/80">{folder.aftn}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {submitted && (
        <div className={`shrink-0 rounded-xl p-4 border ${isPerfect ? 'bg-green-900/30 border-green-500/40' : 'bg-red-900/30 border-red-500/40'}`}>
          <div className={`font-bold text-base mb-1 ${isPerfect ? 'text-green-400' : 'text-red-400'}`}>
            {isPerfect
              ? `✓ ${ca.disregard ? 'Correctly disregarded' : 'Correctly addressed'} — ${task.maxScore} pts`
              : `✗ ${ca.disregard ? 'Should have been disregarded' : (result?.decision === 'disregard' ? 'Should have been transmitted' : 'Addressing errors')} — ${result?.award} pts`}
          </div>
          <p className="text-white/70 text-xs leading-relaxed">{ca.explanation}</p>
          <p className="text-white/40 text-xs mt-2">
            {ca.disregard
              ? 'Correct action: Disregard — do not transmit.'
              : <>Required addressees: <span className="font-mono text-sky-300/80">{ca.aftn.join('  ·  ')}</span></>}
          </p>
          <p className="text-white/30 text-xs mt-2">Select another task from the queue to continue.</p>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div className="flex gap-2">
    <span className="text-white/40 w-28 shrink-0">{label}</span>
    <span className={bold ? 'text-white font-bold' : 'text-white/90'}>{value}</span>
  </div>
);
