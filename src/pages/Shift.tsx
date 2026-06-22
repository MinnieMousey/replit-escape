import React, { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useShift } from '@/context/ShiftContext';
import { SkyBackground } from '@/components/sky/SkyBackground';
import { ShiftHud } from '@/components/hud/ShiftHud';
import { TaskQueue } from '@/components/tasks/TaskQueue';
import { ActiveTask } from '@/components/tasks/ActiveTask';
import { BreakOverlay } from '@/components/hud/BreakOverlay';
import { eventToTaskType } from '@/lib/shifts';

const MIN_TASK_INTERVAL = 25_000;
const MAX_TASK_INTERVAL = 45_000;

export default function Shift() {
  const {
    isShiftActive, shiftEnded, isPaused, gameTimeMinutes,
    generateAndAddTask, addTaskOfType, tasks,
    shift, firedEventIds, fireEvent, startBreak,
  } = useShift();
  const navigate = useNavigate(); const setLocation = (to: string) => navigate({ to: to as any });

  const nextTaskTime = useRef(
    Date.now() + MIN_TASK_INTERVAL + Math.random() * (MAX_TASK_INTERVAL - MIN_TASK_INTERVAL)
  );

  // Route to report when the shift completes.
  useEffect(() => {
    if (shiftEnded) {
      setLocation('/report');
    }
  }, [shiftEnded, setLocation]);

  // No active shift and not ended → must go through pre-shift flow.
  useEffect(() => {
    if (!isShiftActive && !shiftEnded) {
      setLocation('/');
    }
  }, [isShiftActive, shiftEnded, setLocation]);

  // Periodic random task arrival — skips when paused.
  useEffect(() => {
    if (!isShiftActive) return;

    const interval = setInterval(() => {
      if (isPaused) return;
      if (Date.now() >= nextTaskTime.current) {
        generateAndAddTask();
        nextTaskTime.current =
          Date.now() + MIN_TASK_INTERVAL + Math.random() * (MAX_TASK_INTERVAL - MIN_TASK_INTERVAL);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isShiftActive, isPaused, generateAndAddTask]);

  // Scheduled-event engine: fire events whose time has been reached.
  useEffect(() => {
    if (!isShiftActive || !shift) return;
    for (const ev of shift.events) {
      if (gameTimeMinutes >= ev.atMinutes && !firedEventIds.includes(ev.id)) {
        fireEvent(ev.id);
        if (ev.kind === 'BREAK') {
          startBreak(ev.label);
        } else {
          const type = eventToTaskType(ev.kind);
          if (type) addTaskOfType(type);
        }
      }
    }
  }, [gameTimeMinutes, isShiftActive, shift, firedEventIds, fireEvent, startBreak, addTaskOfType]);

  if (!isShiftActive && !shiftEnded) {
    return null;
  }

  return (
    <>
      <SkyBackground />
      <BreakOverlay />
      <div className="h-screen w-full flex flex-col font-mono overflow-hidden">
        <ShiftHud />
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          <div className="w-72 flex-shrink-0 flex flex-col">
            <TaskQueue />
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <ActiveTask />
          </div>
        </div>
      </div>
    </>
  );
}
