import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';

export const PilotCallGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (task) {
      setSelectedIdx(null);
      setSubmitted(false);
      setShowHint(false);
    }
  }, [task?.id]);

  if (!task || task.type !== 'PILOT_CALL') return null;

  const { callsign, pilotMessage, options, callerType } = task.scenario as {
    callsign: string;
    pilotMessage: string;
    options: string[];
    callerType?: string;
  };
  const ca = task.correctAnswer as { index: number; explanation: string };

  const isCorrect = selectedIdx === ca.index;

  const handleSelect = (idx: number) => {
    if (submitted) return;
    setSelectedIdx(idx);
    setSubmitted(true);
    const score = idx === ca.index ? task.maxScore : Math.round(task.maxScore * 0.1);
    submitTask(task.id, score, task.maxScore,
      idx === ca.index ? 'Correct response.' : `Incorrect. ${ca.explanation}`);
  };

  const callerLabel = callerType ?? 'Incoming Call';

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">

      {/* Caller info */}
      <div className="shrink-0 bg-sky-900/30 border border-sky-400/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs text-sky-400/70 font-bold uppercase tracking-widest mb-0.5">{callerLabel}</div>
            <div className="text-sky-300 font-bold text-base">{callsign}</div>
          </div>
          {!submitted && (
            <button
              onClick={() => setShowHint(h => !h)}
              className="text-xs text-white/40 hover:text-amber-400 border border-white/20 hover:border-amber-400/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              {showHint ? 'Hide hint' : '💡 Hint'}
            </button>
          )}
        </div>
        <p className="text-white/90 italic text-sm leading-relaxed">"{pilotMessage}"</p>
      </div>

      {/* Hint */}
      {showHint && !submitted && (
        <div className="shrink-0 bg-amber-900/20 border border-amber-400/30 rounded-xl px-4 py-3 text-amber-200 text-xs leading-relaxed">
          <span className="font-bold text-amber-400 uppercase tracking-widest text-xs">Hint: </span>
          {ca.explanation}
        </div>
      )}

      {/* Options */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <p className="text-xs text-white/40 uppercase tracking-widest shrink-0 mb-1">Select the correct AIS response:</p>
        {options.map((opt: string, i: number) => {
          const isSelected = selectedIdx === i;
          const isCorrectOpt = submitted && i === ca.index;
          const isWrongOpt   = submitted && isSelected && i !== ca.index;

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={submitted}
              style={{ touchAction: 'manipulation' }}
              className={`w-full text-left p-4 rounded-xl border text-sm transition-colors leading-relaxed ${
                isCorrectOpt
                  ? 'border-green-500 bg-green-900/30 text-green-200'
                  : isWrongOpt
                  ? 'border-red-500 bg-red-900/30 text-red-200'
                  : isSelected
                  ? 'border-sky-400 bg-sky-900/30 text-white'
                  : submitted
                  ? 'border-white/5 bg-black/10 text-white/30 cursor-default'
                  : 'border-white/20 bg-black/20 text-white/80 hover:bg-white/10 hover:border-white/40'
              }`}
            >
              <span className="text-white/30 mr-2 font-mono">{String.fromCharCode(65 + i)}.</span>
              "{opt}"
              {isCorrectOpt && <span className="ml-2 text-green-400 font-bold">✓ Correct</span>}
              {isWrongOpt   && <span className="ml-2 text-red-400 font-bold">✗ Incorrect</span>}
            </button>
          );
        })}
      </div>

      {/* Result panel */}
      {submitted && (
        <div className={`shrink-0 rounded-xl p-4 border ${isCorrect ? 'bg-green-900/30 border-green-500/40' : 'bg-red-900/30 border-red-500/40'}`}>
          <div className={`font-bold text-base mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? `✓ Correct — ${task.maxScore} pts` : `✗ Incorrect — ${Math.round(task.maxScore * 0.1)} pts`}
          </div>
          <p className="text-white/70 text-xs leading-relaxed">{ca.explanation}</p>
          <p className="text-white/30 text-xs mt-2">Select another task from the queue to continue.</p>
        </div>
      )}
    </div>
  );
};
