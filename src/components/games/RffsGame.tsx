import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';

export const RffsGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [head, setHead] = useState<string | null>(null);
  const [staff, setStaff] = useState<number | null>(null);
  const [trucks, setTrucks] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (task) {
      setHead(null);
      setStaff(null);
      setTrucks(null);
      setSubmitted(false);
    }
  }, [task?.id]);

  if (!task || task.type !== 'RFFS_CALL') return null;

  const { category, scenarioNote, board, headOptions, staffOptions, trucksOptions } = task.scenario as {
    category: string;
    scenarioNote: string;
    board: { head: string; staff: number; trucks: number };
    headOptions: string[];
    staffOptions: number[];
    trucksOptions: number[];
  };
  const ca = task.correctAnswer as { head: string; staff: number; trucks: number };

  const allChosen = head !== null && staff !== null && trucks !== null;

  const headOk   = head === ca.head;
  const staffOk  = staff === ca.staff;
  const trucksOk = trucks === ca.trucks;
  const correctCount = [headOk, staffOk, trucksOk].filter(Boolean).length;

  const handleSubmit = () => {
    if (!allChosen || submitted) return;
    setSubmitted(true);
    const score = Math.round((correctCount / 3) * task.maxScore);
    const feedback = correctCount === 3
      ? 'All three figures reported correctly.'
      : `Reported ${correctCount}/3 correctly. Correct status: ${ca.head}, ${ca.staff} staff, ${ca.trucks} appliances.`;
    submitTask(task.id, score, task.maxScore, feedback);
  };

  const pill = (
    selected: boolean,
    ok: boolean,
    isAnswer: boolean,
  ) =>
    submitted
      ? isAnswer
        ? 'border-green-500 bg-green-900/30 text-green-200'
        : selected
        ? 'border-red-500 bg-red-900/30 text-red-200'
        : 'border-white/5 bg-black/10 text-white/30'
      : selected
      ? 'border-sky-400 bg-sky-900/30 text-white'
      : 'border-white/20 bg-black/20 text-white/80 hover:bg-white/10 hover:border-white/40';

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-3">
      {/* Watch board */}
      <div className="shrink-0 bg-red-950/40 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-red-300/80 font-bold uppercase tracking-widest">RFFS Watch Board — Grantley Adams</div>
          <div className="text-red-200 font-bold text-lg font-mono">{category}</div>
        </div>
        <p className="text-white/80 text-sm leading-relaxed mb-3">{scenarioNote}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-black/30 rounded-lg p-2 border border-white/10">
            <div className="text-[10px] uppercase text-white/40 tracking-widest">Head on Duty</div>
            <div className="text-white font-bold text-sm mt-1">{board.head}</div>
          </div>
          <div className="bg-black/30 rounded-lg p-2 border border-white/10">
            <div className="text-[10px] uppercase text-white/40 tracking-widest">Staff on Duty</div>
            <div className="text-white font-bold text-sm mt-1">{board.staff}</div>
          </div>
          <div className="bg-black/30 rounded-lg p-2 border border-white/10">
            <div className="text-[10px] uppercase text-white/40 tracking-widest">Appliances</div>
            <div className="text-white font-bold text-sm mt-1">{board.trucks}</div>
          </div>
        </div>
      </div>

      <p className="text-xs text-white/40 uppercase tracking-widest shrink-0">
        Report the current category status to the watch room:
      </p>

      {/* Head on duty */}
      <div className="shrink-0">
        <div className="text-xs text-white/50 mb-1.5">Head on duty</div>
        <div className="flex flex-wrap gap-2">
          {headOptions.map(opt => (
            <button
              key={opt}
              disabled={submitted}
              onClick={() => setHead(opt)}
              style={{ touchAction: 'manipulation' }}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${pill(head === opt, headOk, opt === ca.head)}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Staff */}
      <div className="shrink-0">
        <div className="text-xs text-white/50 mb-1.5">Number of staff</div>
        <div className="flex flex-wrap gap-2">
          {staffOptions.map(opt => (
            <button
              key={opt}
              disabled={submitted}
              onClick={() => setStaff(opt)}
              style={{ touchAction: 'manipulation' }}
              className={`px-4 py-2 rounded-lg border text-sm font-mono font-bold transition-colors ${pill(staff === opt, staffOk, opt === ca.staff)}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Trucks */}
      <div className="shrink-0">
        <div className="text-xs text-white/50 mb-1.5">Number of trucks / appliances</div>
        <div className="flex flex-wrap gap-2">
          {trucksOptions.map(opt => (
            <button
              key={opt}
              disabled={submitted}
              onClick={() => setTrucks(opt)}
              style={{ touchAction: 'manipulation' }}
              className={`px-4 py-2 rounded-lg border text-sm font-mono font-bold transition-colors ${pill(trucks === opt, trucksOk, opt === ca.trucks)}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allChosen}
          style={{ touchAction: 'manipulation' }}
          className={`shrink-0 mt-1 h-11 rounded-xl font-bold text-sm transition-colors ${
            allChosen
              ? 'bg-sky-500 hover:bg-sky-400 text-white'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          Report Category Status
        </button>
      )}

      {submitted && (
        <div className={`shrink-0 rounded-xl p-4 border ${correctCount === 3 ? 'bg-green-900/30 border-green-500/40' : 'bg-amber-900/30 border-amber-500/40'}`}>
          <div className={`font-bold text-base mb-1 ${correctCount === 3 ? 'text-green-400' : 'text-amber-400'}`}>
            {correctCount === 3 ? `✓ Accurate report — ${task.maxScore} pts` : `${correctCount}/3 correct — ${Math.round((correctCount / 3) * task.maxScore)} pts`}
          </div>
          <p className="text-white/70 text-xs leading-relaxed">
            Correct status: <span className="text-white font-bold">{ca.head}</span>, {ca.staff} staff, {ca.trucks} appliances.
          </p>
          <p className="text-white/30 text-xs mt-2">Select another task from the queue to continue.</p>
        </div>
      )}
    </div>
  );
};
