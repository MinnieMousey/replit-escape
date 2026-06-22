import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';

export const MetarGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults]   = useState<Record<string, boolean>>({});
  const [earned, setEarned]     = useState(0);
  const [showRef, setShowRef]   = useState(false);

  useEffect(() => {
    if (task) {
      setAnswers({});
      setSubmitted(false);
      setResults({});
      setEarned(0);
    }
  }, [task?.id]);

  if (!task || task.type !== 'METAR') return null;

  const { metar, questions, mode } = task.scenario as {
    metar: string;
    mode: 'decode' | 'encode';
    questions: { id: string; prompt: string; hint?: string }[];
  };
  const ca: Record<string, string | string[]> = task.correctAnswer;

  // Open-ended answers accept flexible formats: case/space/punctuation-insensitive,
  // and each question may list several acceptable phrasings.
  const norm = (s: string) =>
    (s ?? '')
      .toUpperCase()
      .replace(/[°*]/g, '')
      .replace(/[.,;:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const accepted = (correct: string | string[]): string[] =>
    Array.isArray(correct) ? correct : [correct];
  const matches = (ans: string, correct: string | string[]) => {
    const a = norm(ans);
    return accepted(correct).some(c => norm(c) === a);
  };
  const shownAnswer = (correct: string | string[]) => accepted(correct)[0];

  const allAnswered = task.scenario.questions.every((q: { id: string }) => (answers[q.id] ?? '').trim() !== '');

  const handleSubmit = () => {
    if (submitted || !allAnswered) return;
    const res: Record<string, boolean> = {};
    let correct = 0;
    questions.forEach((q: { id: string }) => {
      const ok = matches(answers[q.id] ?? '', ca[q.id] ?? '');
      res[q.id] = ok;
      if (ok) correct++;
    });
    const score = Math.round((correct / questions.length) * task.maxScore);
    setResults(res);
    setEarned(score);
    setSubmitted(true);
    submitTask(task.id, score, task.maxScore, `${correct}/${questions.length} questions correct.`);
  };

  const pct = earned / task.maxScore;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">

      {/* Mode label + METAR strip */}
      <div className="shrink-0 bg-black/30 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            {mode === 'decode' ? 'METAR Decoding' : 'METAR Encoding'}
          </span>
          <button
            className="text-xs text-white/40 hover:text-sky-400 underline underline-offset-2"
            onClick={() => setShowRef(r => !r)}
          >
            {showRef ? 'Hide reference' : 'METAR format reference'}
          </button>
        </div>

        {mode === 'decode' ? (
          <div className="font-mono text-lg text-sky-300 tracking-wide break-all">{metar}</div>
        ) : (
          <p className="text-white/80 text-sm leading-relaxed">{task.scenario.situation}</p>
        )}
      </div>

      {/* Quick reference */}
      {showRef && (
        <div className="shrink-0 bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white/60 space-y-1 font-mono">
          <div><span className="text-white/30">Format: </span><span className="text-sky-300">METAR ICAO DDHHMM Z wind vis [wx] cloud T/DP QPHPH [trend]</span></div>
          <div><span className="text-white/30">Wind: </span>DDDSSKT &nbsp;|&nbsp; VRB05KT &nbsp;|&nbsp; 00000KT (calm)</div>
          <div><span className="text-white/30">Vis: </span>0600, 9999 (≥10km), CAVOK (vis≥10km, no cloud&lt;5000ft, no sig wx)</div>
          <div><span className="text-white/30">Cloud: </span>FEW=1-2 oktas &nbsp;|&nbsp; SCT=3-4 &nbsp;|&nbsp; BKN=5-7 &nbsp;|&nbsp; OVC=8 &nbsp;|&nbsp; height in 100s ft (030=3000ft)</div>
          <div><span className="text-white/30">Wx: </span>RA=rain &nbsp;|&nbsp; SH=shower &nbsp;|&nbsp; TS=thunderstorm &nbsp;|&nbsp; BR=mist &nbsp;|&nbsp; FG=fog &nbsp;|&nbsp; DZ=drizzle</div>
          <div><span className="text-white/30">Temp: </span>27/22 (T=27°C, DP=22°C) &nbsp;|&nbsp; M02 = −2°C</div>
          <div><span className="text-white/30">QNH: </span>Q1015 (hectopascals)</div>
          <div><span className="text-white/30">Trend: </span>NOSIG &nbsp;|&nbsp; TEMPO &nbsp;|&nbsp; BECMG</div>
        </div>
      )}

      {/* Questions */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {questions.map((q: { id: string; prompt: string; hint?: string }, i: number) => {
          const ok = results[q.id];
          return (
            <div
              key={q.id}
              className={`bg-black/20 border rounded-xl p-4 ${
                submitted
                  ? ok ? 'border-green-500/40' : 'border-red-500/40'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-white/30 text-xs mr-2">Q{i + 1}.</span>
                  <span className="text-white text-sm">{q.prompt}</span>
                  {q.hint && <span className="block text-white/30 text-xs mt-0.5 italic">{q.hint}</span>}
                </div>
                {submitted && (
                  <span className={`shrink-0 text-sm font-bold ${ok ? 'text-green-400' : 'text-red-400'}`}>
                    {ok ? '✓' : `✗ → ${shownAnswer(ca[q.id] ?? '')}`}
                  </span>
                )}
              </div>
              <input
                className={`w-full bg-black/30 border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none placeholder-white/20 ${
                  submitted
                    ? ok ? 'border-green-500/60' : 'border-red-500/60'
                    : 'border-white/20 focus:border-sky-400'
                }`}
                value={answers[q.id] ?? ''}
                onChange={e => !submitted && setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                disabled={submitted}
                placeholder="Type answer…"
                spellCheck={false}
              />
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="shrink-0">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="w-full bg-sky-500 disabled:opacity-40 hover:bg-sky-400 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
          >
            {allAnswered ? 'Submit Answers' : `Answer all questions (${Object.values(answers).filter(v => v.trim()).length}/${questions.length})`}
          </button>
        ) : (
          <div className={`text-center py-3 rounded-lg font-bold text-lg ${pct >= 0.6 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {earned} / {task.maxScore} pts — {Object.values(results).filter(Boolean).length}/{questions.length} correct
          </div>
        )}
      </div>
    </div>
  );
};
