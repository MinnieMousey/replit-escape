import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';

const PUB_OPTIONS = [
  {
    type: 'NOTAM',
    icon: '📡',
    desc: 'Immediate — time-critical, brief text, worldwide distribution',
    border: 'border-red-500/40', bg: 'bg-red-900/20', text: 'text-red-300',
    selBorder: 'border-red-400', selBg: 'bg-red-900/40',
  },
  {
    type: 'AIP Supplement',
    icon: '📋',
    desc: 'Temporary significant change — maps/diagrams, limited AIRAC cycle',
    border: 'border-orange-500/40', bg: 'bg-orange-900/20', text: 'text-orange-300',
    selBorder: 'border-orange-400', selBg: 'bg-orange-900/40',
  },
  {
    type: 'AIRAC Amendment',
    icon: '🗂️',
    desc: 'Permanent — nav database update required, 28-day AIRAC cycle',
    border: 'border-amber-500/40', bg: 'bg-amber-900/20', text: 'text-amber-300',
    selBorder: 'border-amber-400', selBg: 'bg-amber-900/40',
  },
  {
    type: 'AIP Amendment',
    icon: '📄',
    desc: 'Permanent — immediate AIP update, no AIRAC cycle required',
    border: 'border-yellow-500/40', bg: 'bg-yellow-900/20', text: 'text-yellow-300',
    selBorder: 'border-yellow-400', selBg: 'bg-yellow-900/40',
  },
  {
    type: 'AIC',
    icon: '📢',
    desc: 'Advisory only — no operational change to AIP or chart data',
    border: 'border-sky-500/40', bg: 'bg-sky-900/20', text: 'text-sky-300',
    selBorder: 'border-sky-400', selBg: 'bg-sky-900/40',
  },
];

export const PibGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [selected, setSelected]   = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (task) { setSelected(null); setSubmitted(false); }
  }, [task?.id]);

  if (!task || task.type !== 'PIB') return null;

  const correct: string = task.correctAnswer.channel;
  const isCorrect = selected === correct;

  const handleSelect = (type: string) => {
    if (submitted) return;
    setSelected(type);
    setSubmitted(true);
    const score = type === correct ? task.maxScore : 0;
    submitTask(task.id, score, task.maxScore,
      type === correct ? 'Correct dissemination channel.' : `Incorrect. ${task.correctAnswer.explanation}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">

      {/* Situation */}
      <div className="shrink-0 bg-black/20 border border-white/10 rounded-xl p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Situation</div>
        <p className="text-white/80 text-sm leading-relaxed">{task.scenario.description}</p>
      </div>

      <p className="shrink-0 text-xs text-white/40 uppercase tracking-widest">
        Which dissemination channel should be used?
      </p>

      {/* Options */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {PUB_OPTIONS.map(opt => {
          const isThis     = selected === opt.type;
          const showCorrect = submitted && correct === opt.type;
          const showWrong   = submitted && isThis && !isCorrect;

          return (
            <button
              key={opt.type}
              style={{ touchAction: 'manipulation' }}
              onClick={() => handleSelect(opt.type)}
              disabled={submitted}
              className={`w-full text-left p-4 rounded-xl border transition-colors ${
                showCorrect
                  ? 'border-green-500 bg-green-900/30 text-green-200'
                  : showWrong
                  ? 'border-red-500 bg-red-900/30 text-red-200'
                  : isThis
                  ? `${opt.selBorder} ${opt.selBg} text-white`
                  : submitted
                  ? 'border-white/5 bg-black/10 text-white/25 cursor-default'
                  : `${opt.border} ${opt.bg} hover:brightness-125`
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">{opt.icon}</span>
                <div>
                  <div className={`font-bold text-sm mb-0.5 flex items-center gap-2 ${
                    showCorrect ? 'text-green-300' : showWrong ? 'text-red-300' : opt.text
                  }`}>
                    {opt.type}
                    {showCorrect && <span className="text-green-400 text-xs font-bold">✓ Correct</span>}
                    {showWrong   && <span className="text-red-400 text-xs font-bold">✗ Incorrect</span>}
                  </div>
                  <p className={`text-xs leading-relaxed ${submitted && !showCorrect && !showWrong ? 'text-white/20' : 'text-white/50'}`}>
                    {opt.desc}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Result */}
      {submitted && (
        <div className={`shrink-0 rounded-xl p-4 border ${isCorrect ? 'bg-green-900/30 border-green-500/40' : 'bg-red-900/30 border-red-500/40'}`}>
          <div className={`font-bold text-sm mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect
              ? `✓ Correct — ${task.maxScore} pts`
              : `✗ Incorrect — 0 pts  ·  Correct answer: ${correct}`}
          </div>
          <p className="text-white/60 text-xs leading-relaxed">{task.correctAnswer.explanation}</p>
        </div>
      )}
    </div>
  );
};
