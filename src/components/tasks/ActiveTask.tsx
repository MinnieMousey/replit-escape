import React from 'react';
import { useShift } from '@/context/ShiftContext';
import { FlightPlanGame } from '../games/FlightPlanGame';
import { NotamGame } from '../games/NotamGame';
import { PibGame } from '../games/PibGame';
import { PilotCallGame } from '../games/PilotCallGame';
import { CoverPageGame } from '../games/CoverPageGame';
import { AisHandlingGame } from '../games/AisHandlingGame';
import { MetarGame } from '../games/MetarGame';
import { AtsMessageGame } from '../games/AtsMessageGame';
import { InfoRequestGame } from '../games/InfoRequestGame';
import { RffsGame } from '../games/RffsGame';
import { FplRoutingGame } from '../games/FplRoutingGame';
import { FplApprovalGame } from '../games/FplApprovalGame';
import { FplCompareGame } from '../games/FplCompareGame';

export const ActiveTask: React.FC = () => {
  const { activeTaskId, tasks } = useShift();
  const activeTask = tasks.find(t => t.id === activeTaskId);

  if (!activeTask) {
    return (
      <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex flex-col items-center justify-center text-white/50">
        <div className="w-12 h-12 border-2 border-white/20 rounded-full animate-ping mb-4" />
        <p className="text-base">Select a task from the queue</p>
        <p className="text-xs mt-1 text-white/30">or wait for the next task to arrive</p>
      </div>
    );
  }

  if (activeTask.status === 'EXPIRED') {
    return (
      <div className="flex-1 bg-red-900/10 backdrop-blur-md rounded-2xl border border-red-500/30 flex flex-col items-center justify-center text-white/60 gap-3 p-6">
        <div className="text-4xl">⏰</div>
        <div className="text-center">
          <p className="text-red-400 font-bold text-lg mb-1">Task Expired</p>
          <p className="text-white/40 text-sm">{activeTask.title}</p>
          <p className="text-red-400/60 text-xs mt-2">−25 pts deducted</p>
        </div>
        <p className="text-white/30 text-xs mt-2">Select another task from the queue</p>
      </div>
    );
  }

  const renderGame = () => {
    switch (activeTask.type) {
      case 'FLIGHT_PLAN':  return <FlightPlanGame  key={activeTask.id} />;
      case 'NOTAM':        return <NotamGame        key={activeTask.id} />;
      case 'PIB':          return <PibGame          key={activeTask.id} />;
      case 'PILOT_CALL':   return <PilotCallGame    key={activeTask.id} />;
      case 'COVER_PAGE':   return <CoverPageGame    key={activeTask.id} />;
      case 'AIS_HANDLING': return <AisHandlingGame  key={activeTask.id} />;
      case 'METAR':        return <MetarGame        key={activeTask.id} />;
      case 'ATS_MESSAGE':  return <AtsMessageGame   key={activeTask.id} />;
      case 'INFO_REQUEST': return <InfoRequestGame  key={activeTask.id} />;
      case 'RFFS_CALL':    return <RffsGame         key={activeTask.id} />;
      case 'FPL_ROUTING':  return <FplRoutingGame   key={activeTask.id} />;
      case 'FPL_APPROVAL': return <FplApprovalGame  key={activeTask.id} />;
      case 'FPL_COMPARE':  return <FplCompareGame   key={activeTask.id} />;
      default: return null;
    }
  };

  const urgencyColour = {
    CRITICAL: 'border-red-400/60 bg-red-900/10',
    HIGH:     'border-orange-400/60 bg-orange-900/10',
    MEDIUM:   'border-yellow-400/40 bg-yellow-900/5',
    LOW:      'border-white/20 bg-white/5',
  }[activeTask.urgency];

  const typeLabel: Record<string, string> = {
    FLIGHT_PLAN:  'FPL',
    NOTAM:        'NOTAM',
    PIB:          'PIB',
    PILOT_CALL:   'RADIO',
    COVER_PAGE:   'COVER',
    AIS_HANDLING: 'HANDLING',
    METAR:        'METAR',
    ATS_MESSAGE:  'ATS MSG',
    INFO_REQUEST: 'INFO REQ',
    RFFS_CALL:    'RFFS',
    FPL_ROUTING:  'FPL FILE',
    FPL_APPROVAL: 'FPL APPR',
    FPL_COMPARE:  'FPL IN/OUT',
  };

  return (
    <div className={`flex-1 backdrop-blur-md rounded-2xl border flex flex-col overflow-hidden text-white p-5 ${urgencyColour}`}>
      <div className="mb-4 shrink-0 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
              activeTask.urgency === 'CRITICAL' ? 'bg-red-500/30 text-red-400' :
              activeTask.urgency === 'HIGH'     ? 'bg-orange-500/30 text-orange-400' :
              activeTask.urgency === 'MEDIUM'   ? 'bg-yellow-500/30 text-yellow-400' :
              'bg-white/10 text-white/50'
            }`}>{activeTask.urgency}</span>
            <span className="text-xs text-sky-400/70 font-mono font-bold bg-sky-900/20 border border-sky-400/20 px-2 py-0.5 rounded">
              {typeLabel[activeTask.type] ?? activeTask.type}
            </span>
            <span className="text-xs text-white/30 uppercase tracking-widest">{activeTask.difficulty}</span>
          </div>
          <h2 className="text-lg font-bold text-sky-400">{activeTask.title}</h2>
          <p className="text-white/60 text-xs mt-0.5">{activeTask.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-white/30 uppercase">Max Score</div>
          <div className="text-xl font-bold text-white">{activeTask.maxScore}</div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderGame()}
      </div>
    </div>
  );
};
