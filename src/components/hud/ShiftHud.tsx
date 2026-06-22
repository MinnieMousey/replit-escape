import React, { useMemo, useRef, useState } from 'react';
import { useShift } from '@/context/ShiftContext';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { GlossaryOverlay } from '@/components/glossary/GlossaryOverlay';
import { FileStoreBody } from '@/components/hud/FileStoreOverlay';
import { FloatingWindow } from '@/components/hud/FloatingWindow';
import { FlightBoard } from '@/components/hud/FlightBoard';
import { localUtc } from '@/lib/shifts';
import { deriveFlightStatus } from '@/lib/flightStatus';

type WinKind = 'files' | 'active' | 'inactive';

interface WinState { open: boolean; z: number; }

const WINDOW_DEFAULTS: Record<WinKind, { x: number; y: number; w: number; h: number; title: string; icon: string }> = {
  active:   { x: 24,  y: 96,  w: 360, h: 420, title: 'Active Flights',   icon: '🛫' },
  inactive: { x: 400, y: 128, w: 360, h: 380, title: 'Inactive Flights', icon: '🕒' },
  files:    { x: 220, y: 160, w: 760, h: 520, title: 'Shift File Store',  icon: '📂' },
};

export const ShiftHud: React.FC = () => {
  const {
    gameTimeMinutes, durationMinutes, currentLocalMinutes, shift,
    score, tasksCompleted, tasksExpired,
    isPaused, clockSpeed, pauseShift, resumeShift, setClockSpeed, endShift,
    fileStore,
  } = useShift();
  const navigate = useNavigate(); const setLocation = (to: string) => navigate({ to: to as any });
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const [windows, setWindows] = useState<Record<WinKind, WinState>>({
    files:    { open: false, z: 0 },
    active:   { open: false, z: 0 },
    inactive: { open: false, z: 0 },
  });
  const zCounter = useRef(60);

  const openWindow = (k: WinKind) =>
    setWindows(w => ({ ...w, [k]: { open: true, z: ++zCounter.current } }));
  const focusWindow = (k: WinKind) =>
    setWindows(w => ({ ...w, [k]: { ...w[k], z: ++zCounter.current } }));
  const closeWindow = (k: WinKind) =>
    setWindows(w => ({ ...w, [k]: { ...w[k], open: false } }));

  // Live Active / Inactive flight boards, recomputed as the clock advances.
  const { active, inactive } = useMemo(
    () => deriveFlightStatus(fileStore, currentLocalMinutes),
    [fileStore, currentLocalMinutes],
  );

  const unackedCount = fileStore.filter(m => !m.acked).length;

  const { local, utc } = localUtc(currentLocalMinutes);
  const progress = Math.min(gameTimeMinutes / Math.max(durationMinutes, 1), 1);

  const startLabel = shift ? localUtc(shift.startMinutes) : { local: '--:--', utc: '----Z' };
  const endLabel = shift ? localUtc(shift.endMinutes === 0 ? 24 * 60 : shift.endMinutes) : { local: '--:--', utc: '----Z' };

  const handleEndShift = () => {
    if (confirm('End your shift early and go to the report?')) {
      endShift();
      setLocation('/report');
    }
  };

  const speedBtn = (s: 1 | 2 | 4, label: string) => (
    <button
      key={s}
      onClick={() => { setClockSpeed(s); if (isPaused) resumeShift(); }}
      className={`h-7 px-2.5 text-xs font-bold rounded border transition-colors ${
        !isPaused && clockSpeed === s
          ? 'bg-sky-500/30 border-sky-400 text-sky-300'
          : 'bg-white/5 border-white/20 text-white/50 hover:border-white/40 hover:text-white/80'
      }`}
    >
      {label}
    </button>
  );

  const winBtn = (k: WinKind, label: string, badge?: number) => (
    <Button
      variant="ghost"
      onClick={() => (windows[k].open ? focusWindow(k) : openWindow(k))}
      className={`relative border text-xs font-bold uppercase tracking-widest h-8 px-3 ${
        windows[k].open
          ? 'border-sky-400/60 text-sky-200 bg-sky-500/15 hover:bg-sky-500/25'
          : 'border-white/20 text-white/70 hover:text-white hover:bg-white/10'
      }`}
      data-testid={`button-window-${k}`}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold">
          {badge}
        </span>
      )}
    </Button>
  );

  return (
    <>
      <GlossaryOverlay isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />

      {windows.active.open && (
        <FloatingWindow
          title={WINDOW_DEFAULTS.active.title} icon={WINDOW_DEFAULTS.active.icon}
          initialX={WINDOW_DEFAULTS.active.x} initialY={WINDOW_DEFAULTS.active.y}
          initialWidth={WINDOW_DEFAULTS.active.w} initialHeight={WINDOW_DEFAULTS.active.h}
          headerExtra={
            <span className="font-mono text-[10px] font-bold rounded-full px-2 py-0.5 bg-green-500/20 text-green-200 border border-green-400/40">
              {active.length}
            </span>
          }
          zIndex={windows.active.z}
          onFocus={() => focusWindow('active')}
          onClose={() => closeWindow('active')}
        >
          <FlightBoard
            flights={active}
            nowLocalMinutes={currentLocalMinutes}
            emptyLabel="No flights airborne / active right now."
          />
        </FloatingWindow>
      )}

      {windows.inactive.open && (
        <FloatingWindow
          title={WINDOW_DEFAULTS.inactive.title} icon={WINDOW_DEFAULTS.inactive.icon}
          initialX={WINDOW_DEFAULTS.inactive.x} initialY={WINDOW_DEFAULTS.inactive.y}
          initialWidth={WINDOW_DEFAULTS.inactive.w} initialHeight={WINDOW_DEFAULTS.inactive.h}
          headerExtra={
            <span className="font-mono text-[10px] font-bold rounded-full px-2 py-0.5 bg-amber-500/20 text-amber-200 border border-amber-400/40">
              {inactive.length}
            </span>
          }
          zIndex={windows.inactive.z}
          onFocus={() => focusWindow('inactive')}
          onClose={() => closeWindow('inactive')}
        >
          <FlightBoard
            flights={inactive}
            nowLocalMinutes={currentLocalMinutes}
            emptyLabel="No flights due to become active within the next hour."
          />
        </FloatingWindow>
      )}

      {windows.files.open && (
        <FloatingWindow
          title={WINDOW_DEFAULTS.files.title} icon={WINDOW_DEFAULTS.files.icon}
          initialX={WINDOW_DEFAULTS.files.x} initialY={WINDOW_DEFAULTS.files.y}
          initialWidth={WINDOW_DEFAULTS.files.w} initialHeight={WINDOW_DEFAULTS.files.h}
          minWidth={420} minHeight={320}
          headerExtra={
            unackedCount > 0 ? (
              <span className="font-mono text-[10px] font-bold rounded-full px-2 py-0.5 bg-amber-500/20 text-amber-200 border border-amber-400/40">
                {unackedCount}
              </span>
            ) : undefined
          }
          zIndex={windows.files.z}
          onFocus={() => focusWindow('files')}
          onClose={() => closeWindow('files')}
        >
          <FileStoreBody />
        </FloatingWindow>
      )}

      <div className="h-16 bg-white/10 backdrop-blur-md border-b border-white/20 px-4 flex items-center justify-between text-white flex-shrink-0 gap-3">

        {/* Left: clock + stats */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col">
            <div className={`text-xl font-bold tracking-wider font-mono leading-none ${isPaused ? 'text-amber-400 animate-pulse' : 'text-sky-400'}`}>
              {local}{isPaused && <span className="text-xs ml-1">⏸</span>}
            </div>
            <div className="text-xs text-sky-300/60 font-mono leading-none mt-0.5">{utc}</div>
          </div>

          {shift && (
            <span className="text-xs uppercase tracking-widest text-white/40 hidden md:inline">
              {shift.id}
            </span>
          )}

          <div className="h-8 w-px bg-white/20" />

          <div className="flex flex-col">
            <span className="text-xs uppercase opacity-50">Score</span>
            <span className={`font-bold text-base ${score < 0 ? 'text-red-400' : 'text-white'}`}>{score}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs uppercase opacity-50">Done</span>
            <span className="font-bold text-base text-green-400">{tasksCompleted}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs uppercase opacity-50">Expired</span>
            <span className="font-bold text-base text-red-400">{tasksExpired}</span>
          </div>
        </div>

        {/* Centre: progress bar */}
        <div className="flex-1 max-w-xs mx-4 hidden sm:block">
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>{startLabel.local}</span>
            <span className="text-white/30">Shift Progress</span>
            <span>{endLabel.local}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-400 rounded-full transition-all duration-1000"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Right: playback controls + buttons */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Pause / Resume */}
          <button
            onClick={isPaused ? resumeShift : pauseShift}
            title={isPaused ? 'Resume shift' : 'Pause shift (break)'}
            data-testid="button-pause"
            className={`h-8 w-8 rounded border flex items-center justify-center transition-colors ${
              isPaused
                ? 'bg-amber-500/20 border-amber-400 text-amber-400 hover:bg-amber-500/30'
                : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40 hover:text-white'
            }`}
          >
            {isPaused ? '▶' : '⏸'}
          </button>

          {/* Speed */}
          <div className="flex gap-1">
            {speedBtn(1, '1×')}
            {speedBtn(2, '2×')}
            {speedBtn(4, '4×')}
          </div>

          <div className="h-6 w-px bg-white/20" />

          {winBtn('active', 'Active', active.length)}
          {winBtn('inactive', 'Inactive', inactive.length)}
          {winBtn('files', 'Files', unackedCount)}

          <Button
            variant="ghost"
            onClick={() => setGlossaryOpen(true)}
            className="border border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs font-bold uppercase tracking-widest h-8 px-3"
            data-testid="button-glossary"
          >
            Glossary
          </Button>

          <Button
            variant="destructive"
            onClick={handleEndShift}
            className="bg-red-500/80 hover:bg-red-500 text-white font-bold text-xs h-8 px-3"
            data-testid="button-end-shift"
          >
            End Shift
          </Button>
        </div>
      </div>
    </>
  );
};
