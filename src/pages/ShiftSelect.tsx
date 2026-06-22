import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useShift } from '@/context/ShiftContext';
import { SkyBackground } from '@/components/sky/SkyBackground';
import { GlossaryFab } from '@/components/glossary/GlossaryFab';
import { SHIFT_LIST, localUtc } from '@/lib/shifts';

export default function ShiftSelect() {
  const navigate = useNavigate(); const setLocation = (to: string) => navigate({ to: to as any });
  const { selectShift } = useShift();

  const handlePick = (id: 'A' | 'B' | 'C' | 'D') => {
    selectShift(id);
    setLocation('/handover');
  };

  return (
    <>
      <SkyBackground />
      <div className="min-h-screen flex items-center justify-center p-6 font-mono">
        <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 text-white shadow-2xl">
          <div className="text-center mb-2">
            <span className="text-white/40 text-xs uppercase tracking-widest">Cromos OS — Duty Roster</span>
          </div>
          <h1 className="text-3xl font-bold mb-1 text-sky-400 text-center">Select your shift</h1>
          <p className="text-center text-white/50 text-sm mb-8">
            All times shown as Local and UTC (Local + 4 = UTC). The shift runs compressed into ~15 minutes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SHIFT_LIST.map(shift => {
              const start = localUtc(shift.startMinutes);
              const end = localUtc(shift.endMinutes === 0 ? 24 * 60 : shift.endMinutes);
              return (
                <button
                  key={shift.id}
                  onClick={() => handlePick(shift.id)}
                  data-testid={`button-shift-${shift.id}`}
                  style={{ touchAction: 'manipulation' }}
                  className="text-left bg-black/20 hover:bg-black/30 border border-white/10 hover:border-sky-400/60 rounded-xl p-5 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 font-bold text-lg group-hover:bg-sky-500/30">
                      {shift.id}
                    </div>
                    <span className="text-xs uppercase tracking-widest text-white/40">{shift.label.split('—')[1]?.trim()}</span>
                  </div>
                  <div className="font-bold text-white mb-1">{shift.label.split('—')[0]?.trim()}</div>
                  <div className="text-sm text-white/70 font-mono">
                    {start.local} – {end.local} <span className="text-white/40">Local</span>
                  </div>
                  <div className="text-xs text-sky-300/70 font-mono">
                    {start.utc} – {end.utc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-emerald-300">Practice activities</h2>
                <p className="text-sm text-white/50">
                  Drill any single activity with no shift clock, no expiry and unlimited repeats.
                </p>
              </div>
              <button
                onClick={() => setLocation('/practice')}
                data-testid="button-open-practice"
                style={{ touchAction: 'manipulation' }}
                className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 hover:border-emerald-400/70 text-emerald-200 font-bold rounded-xl px-5 py-3 transition-colors"
              >
                Open practice mode →
              </button>
            </div>
          </div>
        </div>
      </div>
      <GlossaryFab />
    </>
  );
}
