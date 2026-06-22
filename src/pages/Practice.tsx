import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useShift } from '@/context/ShiftContext';
import { SkyBackground } from '@/components/sky/SkyBackground';
import { GlossaryFab } from '@/components/glossary/GlossaryFab';
import { ActiveTask } from '@/components/tasks/ActiveTask';
import { TaskType } from '@/types/game';

interface ActivityDef {
  type: TaskType;
  name: string;
  blurb: string;
  icon: string;
}

const ACTIVITIES: ActivityDef[] = [
  { type: 'FLIGHT_PLAN', name: 'Flight Plan', blurb: 'Complete an ICAO flight plan form from a filing request.', icon: '✈️' },
  { type: 'NOTAM', name: 'NOTAM', blurb: 'Build a NOTAM with the correct Q-line and items A–G.', icon: '📋' },
  { type: 'ATS_MESSAGE', name: 'ATS Message', blurb: 'Classify and complete ATS messages (FPL, DLA, CHG…).', icon: '📨' },
  { type: 'METAR', name: 'METAR Decode', blurb: 'Decode an aviation routine weather report.', icon: '🌦️' },
  { type: 'PIB', name: 'Pre-flight Bulletin', blurb: 'Assemble a pre-flight information bulletin (PIB).', icon: '📑' },
  { type: 'INFO_REQUEST', name: 'Information Request', blurb: 'Pick the best response to a department or agency call.', icon: '☎️' },
  { type: 'FPL_ROUTING', name: 'FPL Routing', blurb: 'Transmit approved flight plans to the correct AFTN addressees.', icon: '🗂️' },
  { type: 'FPL_APPROVAL', name: 'FPL Approval', blurb: 'Vet a pre-filled flight plan, then approve & file to SELX or reject it.', icon: '🖊️' },
  { type: 'FPL_COMPARE', name: 'Inbound vs Outbound', blurb: 'Turn an inbound plan into its correct outbound return and learn what changes.', icon: '🔁' },
  { type: 'RFFS_CALL', name: 'RFFS Call', blurb: 'Report fire-category status: head, staff and trucks.', icon: '🚒' },
  { type: 'PILOT_CALL', name: 'Pilot Call', blurb: 'Respond correctly to a pilot radio call.', icon: '🎧' },
  { type: 'AIS_HANDLING', name: 'AIS Handling', blurb: 'Handle an AIS query with the correct procedure.', icon: '🧭' },
  { type: 'COVER_PAGE', name: 'Cover Page', blurb: 'Prepare an AIS publication cover page.', icon: '📰' },
];

export default function Practice() {
  const navigate = useNavigate(); const setLocation = (to: string) => navigate({ to: to as any });
  const { isPractice, startPractice, practiceTask, exitPractice, activeTaskId } = useShift();
  const [selected, setSelected] = useState<ActivityDef | null>(null);

  // Initialise a clean practice session when landing here.
  useEffect(() => {
    if (!isPractice) startPractice();
  }, [isPractice, startPractice]);

  const pick = (activity: ActivityDef) => {
    setSelected(activity);
    practiceTask(activity.type);
  };

  const backToMenu = () => {
    setSelected(null);
    startPractice();
  };

  const leave = () => {
    exitPractice();
    setLocation('/select');
  };

  return (
    <>
      <SkyBackground />
      <div className="h-screen w-full flex flex-col font-mono overflow-hidden text-white">
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold text-sky-400">Practice Mode</span>
            <span className="text-xs uppercase tracking-widest text-emerald-300/80 border border-emerald-400/30 rounded px-2 py-0.5">
              No time limit
            </span>
          </div>
          <button
            onClick={leave}
            data-testid="button-exit-practice"
            style={{ touchAction: 'manipulation' }}
            className="text-sm text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
          >
            Exit to Duty Roster
          </button>
        </header>

        {selected && activeTaskId ? (
          <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <button
                onClick={backToMenu}
                data-testid="button-practice-menu"
                style={{ touchAction: 'manipulation' }}
                className="text-sm text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
              >
                ← Practice menu
              </button>
              <div className="text-sm text-white/50">{selected.icon} {selected.name}</div>
              <button
                onClick={() => practiceTask(selected.type)}
                data-testid="button-new-scenario"
                style={{ touchAction: 'manipulation' }}
                className="text-sm text-sky-300 hover:text-white border border-sky-400/40 hover:border-sky-400/70 bg-sky-500/10 rounded-lg px-3 py-1.5 transition-colors"
              >
                ↻ New scenario
              </button>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <ActiveTask />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              <p className="text-white/50 text-sm mb-6">
                Pick any activity to practise on its own. There's no shift clock, no expiry and you can repeat
                each one as many times as you like.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ACTIVITIES.map(activity => (
                  <button
                    key={activity.type}
                    onClick={() => pick(activity)}
                    data-testid={`button-practice-${activity.type}`}
                    style={{ touchAction: 'manipulation' }}
                    className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sky-400/60 rounded-xl p-5 transition-colors group"
                  >
                    <div className="text-2xl mb-2">{activity.icon}</div>
                    <div className="font-bold text-white mb-1 group-hover:text-sky-300">{activity.name}</div>
                    <div className="text-xs text-white/50 leading-relaxed">{activity.blurb}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <GlossaryFab />
    </>
  );
}
