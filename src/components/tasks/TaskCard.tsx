import React, { useEffect, useState } from 'react';
import { AISTask } from '@/types/game';
import { useShift } from '@/context/ShiftContext';
import { Plane, Bell, FileText, Radio, Phone, Flame, FolderInput } from 'lucide-react';

export const TaskCard: React.FC<{ task: AISTask }> = ({ task }) => {
  const { activeTaskId, setActiveTask } = useShift();
  const [timeLeft, setTimeLeft] = useState(Math.max(0, task.expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, task.expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [task.expiresAt]);

  const isActive = activeTaskId === task.id;

  const getUrgencyColor = () => {
    switch (task.urgency) {
      case 'CRITICAL': return 'bg-red-500/80 border-red-400 text-white';
      case 'HIGH': return 'bg-orange-500/80 border-orange-400 text-white';
      case 'MEDIUM': return 'bg-amber-400/80 border-amber-300 text-black';
      case 'LOW': return 'bg-green-400/80 border-green-300 text-black';
    }
  };

  const getIcon = () => {
    switch (task.type) {
      case 'FLIGHT_PLAN':  return <Plane size={16} />;
      case 'NOTAM':        return <Bell size={16} />;
      case 'PIB':          return <FileText size={16} />;
      case 'PILOT_CALL':   return <Radio size={16} />;
      case 'COVER_PAGE':   return <FileText size={16} />;
      case 'AIS_HANDLING': return <FileText size={16} />;
      case 'METAR':        return <Bell size={16} />;
      case 'ATS_MESSAGE':  return <Radio size={16} />;
      case 'INFO_REQUEST': return <Phone size={16} />;
      case 'RFFS_CALL':    return <Flame size={16} />;
      case 'FPL_ROUTING':  return <FolderInput size={16} />;
      default:             return <FileText size={16} />;
    }
  };

  return (
    <div 
      className={`
        p-4 rounded-xl border cursor-pointer transition-all duration-200
        ${isActive ? 'bg-white/20 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-black/20 border-white/10 hover:bg-black/30'}
      `}
      onClick={() => setActiveTask(task.id)}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 text-white">
          {getIcon()}
          <span className="font-bold text-sm truncate">{task.title}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getUrgencyColor()}`}>
          {task.urgency}
        </span>
      </div>
      
      <p className="text-white/70 text-xs mb-3 line-clamp-2">{task.description}</p>
      
      <div className="flex justify-between items-center text-xs">
        <span className="text-white/50">{task.difficulty}</span>
        <span className={`font-mono font-bold ${timeLeft < 15000 ? 'text-red-400 animate-pulse' : 'text-sky-300'}`}>
          {Math.floor(timeLeft / 1000)}s
        </span>
      </div>
    </div>
  );
};
