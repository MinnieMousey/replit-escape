import React from 'react';
import { useShift } from '@/context/ShiftContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export const PerformanceReport: React.FC = () => {
  const { score, maxPossibleScore, tasksCompleted, tasksExpired, shift } = useShift();
  const [, setLocation] = useLocation();

  const accuracy = maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0;
  
  let rating = 'TRAINEE';
  if (accuracy > 90) rating = 'OUTSTANDING';
  else if (accuracy > 80) rating = 'EXPERT';
  else if (accuracy > 60) rating = 'PROFICIENT';
  else if (accuracy > 40) rating = 'COMPETENT';

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-10 text-white shadow-2xl">
      <h1 className="text-4xl font-bold mb-2 text-sky-400 text-center">END OF SHIFT REPORT</h1>
      <p className="text-center text-white/70 mb-10">{shift ? shift.label : 'Shift complete'}</p>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="bg-black/30 rounded-xl p-6 border border-white/10 text-center">
          <div className="text-sm opacity-70 uppercase tracking-widest mb-2">Officer Rating</div>
          <div className="text-4xl font-bold text-white">{rating}</div>
        </div>
        <div className="bg-black/30 rounded-xl p-6 border border-white/10 text-center">
          <div className="text-sm opacity-70 uppercase tracking-widest mb-2">Accuracy</div>
          <div className="text-4xl font-bold text-sky-400">{accuracy.toFixed(1)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-12">
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 text-center">
          <div className="text-3xl font-bold">{score}</div>
          <div className="text-xs opacity-70 uppercase mt-1">Total Score</div>
        </div>
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 text-center">
          <div className="text-3xl font-bold text-green-400">{tasksCompleted}</div>
          <div className="text-xs opacity-70 uppercase mt-1">Tasks Completed</div>
        </div>
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 text-center">
          <div className="text-3xl font-bold text-red-400">{tasksExpired}</div>
          <div className="text-xs opacity-70 uppercase mt-1">Tasks Expired</div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button 
          className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-bold h-14 text-lg"
          onClick={() => setLocation('/select')}
          data-testid="button-new-shift"
        >
          START NEW SHIFT
        </Button>
        <Button 
          variant="outline"
          className="flex-1 border-white/20 bg-transparent hover:bg-white/10 text-white font-bold h-14 text-lg"
          onClick={() => setLocation('/')}
          data-testid="button-home"
        >
          SIGN OUT
        </Button>
      </div>
    </div>
  );
};
