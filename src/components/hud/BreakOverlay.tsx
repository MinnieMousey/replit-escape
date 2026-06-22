import React from 'react';
import { useShift } from '@/context/ShiftContext';
import { Button } from '@/components/ui/button';
import { localUtc } from '@/lib/shifts';

export const BreakOverlay: React.FC = () => {
  const { onBreak, breakLabel, isPaused, endBreak, resumeShift, currentLocalMinutes } = useShift();

  // Show only for scheduled breaks (onBreak) or any manual pause.
  if (!isPaused) return null;

  const { local, utc } = localUtc(currentLocalMinutes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-mono">
      <div className="max-w-md w-full mx-6 bg-white/10 border border-white/20 rounded-2xl p-8 text-white text-center shadow-2xl">
        <div className="text-5xl mb-4">{onBreak ? '☕' : '⏸'}</div>
        <h2 className="text-2xl font-bold text-amber-400 mb-1">
          {onBreak ? 'On Break' : 'Shift Paused'}
        </h2>
        <p className="text-white/60 text-sm mb-1">
          {onBreak ? (breakLabel ?? 'Scheduled break') : 'You paused the shift.'}
        </p>
        <p className="text-white/40 text-xs font-mono mb-6">
          {local} Local · {utc}
        </p>
        <p className="text-white/50 text-xs mb-6">
          The shift clock and task arrivals are stopped. Resume when you are ready to return to duty.
        </p>
        <Button
          onClick={onBreak ? endBreak : resumeShift}
          className="w-full h-12 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm uppercase tracking-widest"
          data-testid="button-resume-break"
        >
          {onBreak ? 'Return from break' : 'Resume shift'}
        </Button>
      </div>
    </div>
  );
};
