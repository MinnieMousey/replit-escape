import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';

// ── Static data ───────────────────────────────────────────────────────────────
const CRITERIA = [
  {
    id: 'urgency' as const,
    label: 'Urgency',
    icon: '⏱',
    options: [
      'Immediate (< 24 hours)',
      'Non-immediate (planned publication)',
    ],
  },
  {
    id: 'operationalSignificance' as const,
    label: 'Operational Significance',
    icon: '⚠️',
    options: [
      'Essential — safety critical',
      'Significant — operationally relevant',
      'Informational — advisory only',
    ],
  },
  {
    id: 'scope' as const,
    label: 'Scope',
    icon: '🌐',
    options: [
      'Local / Aerodrome',
      'National',
      'International',
    ],
  },
  {
    id: 'volume' as const,
    label: 'Volume of Information',
    icon: '📄',
    options: [
      'Brief (NOTAM-sized)',
      'Moderate (one or two pages)',
      'Extensive (multiple pages / graphics)',
    ],
  },
  {
    id: 'duration' as const,
    label: 'Duration',
    icon: '📅',
    options: [
      'Temporary (hours / days)',
      'Long-term (> 3 months)',
      'Permanent',
    ],
  },
] as const;

type CriteriaId = typeof CRITERIA[number]['id'];

const PUB_OPTIONS = [
  { type: 'NOTAM',           color: 'text-red-300',    border: 'border-red-500/40',    bg: 'bg-red-900/20',    selBorder: 'border-red-400',    selBg: 'bg-red-900/40' },
  { type: 'AIP Supplement',  color: 'text-orange-300', border: 'border-orange-500/40', bg: 'bg-orange-900/20', selBorder: 'border-orange-400', selBg: 'bg-orange-900/40' },
  { type: 'AIRAC Amendment', color: 'text-amber-300',  border: 'border-amber-500/40',  bg: 'bg-amber-900/20',  selBorder: 'border-amber-400',  selBg: 'bg-amber-900/40' },
  { type: 'AIP Amendment',   color: 'text-yellow-300', border: 'border-yellow-500/40', bg: 'bg-yellow-900/20', selBorder: 'border-yellow-400', selBg: 'bg-yellow-900/40' },
  { type: 'AIC',             color: 'text-sky-300',    border: 'border-sky-500/40',    bg: 'bg-sky-900/20',    selBorder: 'border-sky-400',    selBg: 'bg-sky-900/40' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const AisHandlingGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const initCriteria = () => ({
    urgency: '', operationalSignificance: '', scope: '', volume: '', duration: '',
  } as Record<CriteriaId, string>);

  const [criteria, setCriteria]   = useState<Record<CriteriaId, string>>(initCriteria);
  const [pubType, setPubType]     = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(true);

  useEffect(() => {
    if (task) { setCriteria(initCriteria()); setPubType(''); setSubmitted(false); setScenarioOpen(true); }
  }, [task?.id]);

  if (!task || task.type !== 'AIS_HANDLING') return null;

  const ca = task.correctAnswer as Record<string, string>;
  const allFilled = CRITERIA.every(c => criteria[c.id] !== '') && pubType !== '';

  const handleCriteria = (id: CriteriaId, val: string) => {
    if (!submitted) setCriteria(prev => ({ ...prev, [id]: val }));
  };

  const handlePubType = (val: string) => {
    if (!submitted) setPubType(val);
  };

  const handleSubmit = () => {
    if (submitted || !allFilled) return;
    setSubmitted(true);
    let correct = 0;
    let total = 0;
    CRITERIA.forEach(c => { total++; if (criteria[c.id] === ca[c.id]) correct++; });
    total++;
    if (pubType === ca.publicationType) correct++;
    const score = Math.round((correct / total) * task.maxScore);
    submitTask(task.id, score, task.maxScore, `${correct}/${total} criteria correct.`);
  };

  const criteriaOk  = (id: CriteriaId) => submitted && criteria[id] === ca[id];
  const criteriaErr = (id: CriteriaId) => submitted && criteria[id] !== ca[id];
  const pubOk  = submitted && pubType === ca.publicationType;
  const pubErr = submitted && pubType !== ca.publicationType;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-0">

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">

        {/* Collapsible situation */}
        <div className="bg-black/20 border border-white/10 rounded-xl overflow-hidden">
          <button
            style={{ touchAction: 'manipulation' }}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            onClick={() => setScenarioOpen(o => !o)}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Situation</span>
            <span className="text-white/40 text-xs">{scenarioOpen ? '▲ collapse' : '▼ expand'}</span>
          </button>
          {scenarioOpen && (
            <div className="px-4 pb-4 text-sm text-white/80 leading-relaxed border-t border-white/10 pt-3">
              {task.scenario.situation}
            </div>
          )}
        </div>

        {/* ── 5 Criteria ── */}
        <div className="text-xs text-white/40 uppercase tracking-widest px-1">Step 1 — Assess the 5 criteria</div>

        {CRITERIA.map(c => {
          const ok  = criteriaOk(c.id);
          const err = criteriaErr(c.id);
          return (
            <div key={c.id} className={`bg-black/20 border rounded-xl p-3 ${ok ? 'border-green-500/40' : err ? 'border-red-500/40' : 'border-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white/80">
                  <span className="mr-1.5">{c.icon}</span>{c.label}
                </span>
                {ok  && <span className="text-green-400 text-xs font-bold">✓ Correct</span>}
                {err && <span className="text-red-400 text-xs font-bold">✗ → {ca[c.id]}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {c.options.map(opt => {
                  const sel = criteria[c.id] === opt;
                  const isCorrectOpt = submitted && ca[c.id] === opt;
                  const isWrongSel   = submitted && sel && !ok;
                  return (
                    <button
                      key={opt}
                      style={{ touchAction: 'manipulation' }}
                      onClick={() => handleCriteria(c.id, opt)}
                      disabled={submitted}
                      className={`text-xs px-3 py-2 rounded-lg border transition-colors text-left leading-snug ${
                        isCorrectOpt
                          ? 'border-green-500 bg-green-900/30 text-green-300'
                          : isWrongSel
                          ? 'border-red-500 bg-red-900/30 text-red-300'
                          : sel
                          ? 'border-sky-400 bg-sky-900/30 text-white'
                          : submitted
                          ? 'border-white/5 bg-black/10 text-white/20 cursor-default'
                          : 'border-white/20 bg-black/20 text-white/60 hover:border-white/40 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Publication type ── */}
        <div className="text-xs text-white/40 uppercase tracking-widest px-1 pt-1">Step 2 — Select dissemination channel</div>

        <div className={`bg-black/20 border rounded-xl p-3 space-y-2 ${pubOk ? 'border-green-500/40' : pubErr ? 'border-red-500/40' : 'border-white/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80">Publication Type</span>
            {pubOk  && <span className="text-green-400 text-xs font-bold">✓ Correct</span>}
            {pubErr && <span className="text-red-400 text-xs font-bold">✗ → {ca.publicationType}</span>}
          </div>
          {PUB_OPTIONS.map(opt => {
            const sel = pubType === opt.type;
            const isCorrectOpt = submitted && ca.publicationType === opt.type;
            const isWrongSel   = submitted && sel && !pubOk;
            return (
              <button
                key={opt.type}
                style={{ touchAction: 'manipulation' }}
                onClick={() => handlePubType(opt.type)}
                disabled={submitted}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                  isCorrectOpt
                    ? 'border-green-500 bg-green-900/30 text-green-300'
                    : isWrongSel
                    ? 'border-red-500 bg-red-900/30 text-red-300'
                    : sel
                    ? `${opt.selBorder} ${opt.selBg} text-white`
                    : submitted
                    ? 'border-white/5 bg-black/10 text-white/20 cursor-default'
                    : `${opt.border} ${opt.bg} ${opt.color} hover:brightness-125`
                }`}
              >
                {opt.type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit / result — always at bottom */}
      <div className="shrink-0 pt-3">
        {!submitted ? (
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={handleSubmit}
            disabled={!allFilled}
            className="w-full bg-sky-500 disabled:opacity-40 hover:bg-sky-400 active:bg-sky-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            {allFilled ? 'Submit Assessment' : `Complete all criteria (${CRITERIA.filter(c => criteria[c.id]).length + (pubType ? 1 : 0)}/6)`}
          </button>
        ) : (
          <div className={`text-center py-3 px-4 rounded-xl font-bold text-base border ${
            pubOk && CRITERIA.every(c => criteriaOk(c.id))
              ? 'bg-green-900/30 text-green-400 border-green-500/30'
              : 'bg-amber-900/30 text-amber-400 border-amber-500/30'
          }`}>
            {task.maxScore > 0
              ? `${Math.round((([...CRITERIA.map(c => criteriaOk(c.id)), pubOk].filter(Boolean).length) / 6) * task.maxScore)} / ${task.maxScore} pts`
              : 'Submitted'}
            {' — '}
            {[...CRITERIA.map(c => criteriaOk(c.id)), pubOk].filter(Boolean).length}/6 correct
          </div>
        )}
      </div>
    </div>
  );
};
