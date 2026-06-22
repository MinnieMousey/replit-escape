import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';

const MESSAGE_TYPES = [
  { code: 'FPL',     category: 'Flight Plan',  label: 'Filed Flight Plan' },
  { code: 'CPL',     category: 'Flight Plan',  label: 'Current FPL (airborne)' },
  { code: 'DEP',     category: 'Movement',     label: 'Departure' },
  { code: 'ARR',     category: 'Movement',     label: 'Arrival' },
  { code: 'DLA',     category: 'Movement',     label: 'Delay (> 30 min)' },
  { code: 'CHG',     category: 'Movement',     label: 'Change / Amendment' },
  { code: 'CNL',     category: 'Movement',     label: 'Cancellation' },
  { code: 'EST',     category: 'Flight Info',  label: 'Estimate' },
  { code: 'RQP',     category: 'Flight Info',  label: 'Request Flight Plan' },
  { code: 'RQS',     category: 'Flight Info',  label: 'Request Suppl. FPL' },
  { code: 'CDN',     category: 'Control',      label: 'Coordination' },
  { code: 'ACP',     category: 'Control',      label: 'Acceptance' },
  { code: 'INCERFA', category: 'Alerting',     label: 'Uncertainty Phase' },
  { code: 'ALERFA',  category: 'Alerting',     label: 'Alert Phase' },
  { code: 'DETRESFA',category: 'Alerting',     label: 'Distress Phase' },
  { code: 'RCF',     category: 'Alerting',     label: 'Radio Comm Failure' },
];

interface AtsForm { messageType: string; [key: string]: string; }

export const AtsMessageGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [form, setForm]           = useState<AtsForm>({ messageType: '' });
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults]     = useState<Record<string, boolean>>({});
  const [earned, setEarned]       = useState(0);
  const [showRef, setShowRef]     = useState(false);

  useEffect(() => {
    if (task) { setForm({ messageType: '' }); setSubmitted(false); setResults({}); setEarned(0); }
  }, [task?.id]);

  if (!task || task.type !== 'ATS_MESSAGE') return null;

  const ca: AtsForm = task.correctAnswer;
  const extraFields: { id: string; label: string; hint?: string }[] = task.scenario.fields ?? [];
  const scoredFields = ['messageType', ...extraFields.map((f: { id: string }) => f.id)];

  const upd = (f: string, v: string) => { if (!submitted) setForm(prev => ({ ...prev, [f]: v })); };

  const canSubmit = form.messageType !== '';

  const handleSubmit = () => {
    if (submitted || !canSubmit) return;
    const res: Record<string, boolean> = {};
    let correct = 0;
    scoredFields.forEach(f => {
      const ok = (form[f] ?? '').trim().toUpperCase() === (ca[f] ?? '').trim().toUpperCase();
      res[f] = ok;
      if (ok) correct++;
    });
    const score = Math.round((correct / scoredFields.length) * task.maxScore);
    setResults(res); setEarned(score); setSubmitted(true);
    submitTask(task.id, score, task.maxScore, `${correct}/${scoredFields.length} fields correct.`);
  };

  const fieldBorder = (f: string) =>
    submitted
      ? results[f] ? 'border-green-500/60 bg-green-900/10' : 'border-red-500/60 bg-red-900/10'
      : 'border-white/20 focus:border-sky-400';

  return (
    <div className="flex flex-col h-full overflow-hidden gap-0">

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">

        {/* Situation */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Situation</span>
            <button
              style={{ touchAction: 'manipulation' }}
              className="text-xs text-white/40 hover:text-sky-400 underline underline-offset-2"
              onClick={() => setShowRef(r => !r)}
            >
              {showRef ? 'Hide reference' : 'Show message types'}
            </button>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">{task.scenario.situation}</p>
        </div>

        {/* Quick reference */}
        {showRef && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs space-y-2">
            {['Flight Plan','Movement','Flight Info','Control','Alerting'].map(cat => (
              <div key={cat}>
                <div className="text-white/30 uppercase tracking-widest mb-1">{cat}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {MESSAGE_TYPES.filter(m => m.category === cat).map(m => (
                    <div key={m.code}>
                      <span className="font-mono text-sky-400 font-bold">{m.code}</span>
                      <span className="text-white/50 ml-1">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-1 border-t border-white/10 text-white/30">
              DLA = delay &gt; 30 min · INCERFA = 30 min overdue · ALERFA = further delay / concern · DETRESFA = distress confirmed
            </div>
          </div>
        )}

        {/* Message type selector */}
        <div className={`bg-black/20 border rounded-xl p-4 ${submitted ? results['messageType'] ? 'border-green-500/40' : 'border-red-500/40' : 'border-white/10'}`}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white font-semibold text-sm">Select the ATS Message Type</label>
            {submitted && (
              <span className={results['messageType'] ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
                {results['messageType'] ? '✓ Correct' : `✗ → ${ca.messageType}`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {MESSAGE_TYPES.map(m => {
              const selected  = form.messageType === m.code;
              const isCorrect = submitted && ca.messageType === m.code;
              const isWrong   = submitted && selected && !results['messageType'];
              return (
                <button
                  key={m.code}
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => upd('messageType', m.code)}
                  disabled={submitted}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    isCorrect ? 'border-green-500 bg-green-900/30 text-green-300'
                    : isWrong ? 'border-red-500 bg-red-900/30 text-red-300'
                    : selected ? 'border-sky-400 bg-sky-900/30 text-white'
                    : 'border-white/10 bg-black/20 text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span className="font-mono font-bold text-sm">{m.code}</span>
                  <span className="text-white/40 text-xs ml-2">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Additional text fields */}
        {extraFields.length > 0 && (
          <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-white font-semibold text-sm">
              Complete Key Fields
              <span className="text-white/40 text-xs font-normal ml-2">(for bonus points)</span>
            </div>
            {extraFields.map((f: { id: string; label: string; hint?: string }) => (
              <div key={f.id}>
                <label className="block text-xs text-white/50 uppercase tracking-widest mb-1">
                  {f.label}
                  {submitted && (
                    <span className={`ml-2 normal-case font-normal ${results[f.id] ? 'text-green-400' : 'text-red-400'}`}>
                      {results[f.id] ? '✓ Correct' : `✗ → ${ca[f.id]}`}
                    </span>
                  )}
                </label>
                {f.hint && <p className="text-white/30 text-xs mb-1">{f.hint}</p>}
                <input
                  className={`w-full bg-black/30 border rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none placeholder-white/20 transition-colors ${fieldBorder(f.id)}`}
                  value={form[f.id] ?? ''}
                  onChange={e => upd(f.id, e.target.value)}
                  disabled={submitted}
                  placeholder="Type answer…"
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit / result — always visible at bottom */}
      <div className="shrink-0 pt-3">
        {!submitted ? (
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-sky-500 disabled:opacity-40 hover:bg-sky-400 active:bg-sky-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            {canSubmit ? 'Submit Response' : 'Select a message type above'}
          </button>
        ) : (
          <div className={`text-center py-3 px-4 rounded-xl font-bold text-lg ${earned / task.maxScore >= 0.6 ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'}`}>
            {earned} / {task.maxScore} pts — {Object.values(results).filter(Boolean).length}/{scoredFields.length} correct
          </div>
        )}
      </div>
    </div>
  );
};
