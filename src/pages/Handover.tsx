import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useShift } from '@/context/ShiftContext';
import { SkyBackground } from '@/components/sky/SkyBackground';
import { GlossaryFab } from '@/components/glossary/GlossaryFab';
import { Button } from '@/components/ui/button';
import { localUtc } from '@/lib/shifts';

const TYPE_LABEL: Record<string, string> = {
  FLIGHT_PLAN: 'Flight Plan',
  NOTAM: 'NOTAM',
  PIB: 'Dissemination',
  PILOT_CALL: 'Radio Call',
  COVER_PAGE: 'Product Cover',
  AIS_HANDLING: 'AIS Handling',
  METAR: 'METAR',
  ATS_MESSAGE: 'ATS Message',
  INFO_REQUEST: 'Information Request',
  RFFS_CALL: 'RFFS Call',
  FPL_ROUTING: 'FPL Routing',
};

export default function Handover() {
  const navigate = useNavigate(); const setLocation = (to: string) => navigate({ to: to as any });
  const { shift, selectedShiftId, startShift } = useShift();

  if (!shift || !selectedShiftId) {
    setLocation('/select');
    return null;
  }

  const start = localUtc(shift.startMinutes);
  const end = localUtc(shift.endMinutes === 0 ? 24 * 60 : shift.endMinutes);

  const handleBegin = () => {
    startShift();
    setLocation('/shift');
  };

  return (
    <>
      <SkyBackground />
      <div className="min-h-screen flex items-center justify-center p-6 font-mono">
        <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 text-white shadow-2xl">
          <div className="text-center mb-1">
            <span className="text-white/40 text-xs uppercase tracking-widest">Shift Handover Briefing</span>
          </div>
          <h1 className="text-3xl font-bold mb-1 text-sky-400 text-center">{shift.label}</h1>
          <p className="text-center text-white/60 text-sm mb-6 font-mono">
            {start.local} – {end.local} Local &nbsp;·&nbsp; {start.utc} – {end.utc}
          </p>

          <div className="bg-black/20 border border-white/10 rounded-xl p-5 mb-6">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-3">Tasks to complete from last shift</div>
            <ul className="space-y-3">
              {shift.handover.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 text-sky-400 text-xs font-bold bg-sky-900/30 border border-sky-400/30 rounded px-2 py-0.5 shrink-0">
                    {TYPE_LABEL[item.type] ?? item.type}
                  </span>
                  <span className="text-white/80 text-sm leading-relaxed">{item.note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-black/20 border border-white/10 rounded-xl p-4 mb-6 text-left">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Shift briefing</div>
            <ul className="text-xs text-white/60 space-y-1 leading-relaxed">
              <li>• The shift clock runs the full duty period compressed into ~15 real minutes.</li>
              <li>• Random tasks arrive throughout. Scheduled events (RFFS call, breaks, info requests, FPL filing) fire at set times.</li>
              <li>• Expired tasks deduct <span className="text-red-400">25 points</span> each. Use the Glossary for references.</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-none border border-white/20 text-white/60 hover:text-white hover:bg-white/10 font-bold text-xs uppercase tracking-widest h-12 px-5"
              onClick={() => setLocation('/select')}
              data-testid="button-back-select"
            >
              Back
            </Button>
            <Button
              size="lg"
              className="flex-1 h-12 text-base bg-sky-500 hover:bg-sky-400 text-white font-bold"
              onClick={handleBegin}
              data-testid="button-begin-shift"
            >
              ACCEPT HANDOVER & START SHIFT
            </Button>
          </div>
        </div>
      </div>
      <GlossaryFab />
    </>
  );
}
