import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';

export const InfoRequestGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (task) {
      setSelectedIdx(null);
      setSubmitted(false);
    }
  }, [task?.id]);

  if (!task || task.type !== 'INFO_REQUEST') return null;

  const { caller, request, options } = task.scenario as {
    caller: string;
    request: string;
    options: string[];
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

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">
      <div className="shrink-0 bg-indigo-900/30 border border-indigo-400/30 rounded-xl p-4">
        <div className="text-xs text-indigo-300/70 font-bold uppercase tracking-widest mb-0.5">Information Request</div>
        <div className="text-indigo-200 font-bold text-base mb-2">{caller}</div>
        <p className="text-white/90 italic text-sm leading-relaxed">"{request}"</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        <p className="text-xs text-white/40 uppercase tracking-widest shrink-0 mb-1">Select the best response:</p>
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
              {opt}
              {isCorrectOpt && <span className="ml-2 text-green-400 font-bold">✓</span>}
              {isWrongOpt   && <span className="ml-2 text-red-400 font-bold">✗</span>}
            </button>
          );
        })}
      </div>

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
