import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AISTask, TaskStatus, TaskType } from '../types/game';
import {
  generateFlightPlanTask, generateNotamTask,
  generatePibTask, generatePilotCallTask,
  generateCoverPageTask, generateAisHandlingTask,
  generateMetarTask, generateAtsMessageTask,
  generateInfoRequestTask, generateRffsTask, generateFplRoutingTask,
  generateFplApprovalTask, generateFplCompareTask,
} from '../lib/taskGenerator';
import { ShiftDef, SHIFTS, SHIFT_REAL_SECONDS, wrapMinutes } from '../lib/shifts';
import {
  StoreMessage, seedFileStore, makeStoreMessage,
} from '../lib/fileStore';

type ClockSpeed = 1 | 2 | 4;
type ShiftId = 'A' | 'B' | 'C' | 'D';

const FILE_STORE_KEY = 'ais-shift-file-store';

// The file store is persisted per shift so that, within a shift session, ack /
// process / newly filed messages survive page reloads and screen navigation.
// We scope the saved payload by shift id and only ever persist while a shift is
// active — this prevents transient resets (returning to shift-select, entering
// practice mode) from clobbering the persisted store with an empty array.
interface PersistedFileStore {
  shiftId: string;
  messages: StoreMessage[];
}

function loadPersistedFileStore(): PersistedFileStore | null {
  try {
    const raw = localStorage.getItem(FILE_STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.messages) && typeof parsed.shiftId === 'string') {
      return parsed as PersistedFileStore;
    }
    return null;
  } catch {
    return null;
  }
}

/** Return the persisted messages for a given shift id, or null if none saved. */
function loadFileStoreForShift(shiftId: string): StoreMessage[] | null {
  const persisted = loadPersistedFileStore();
  return persisted && persisted.shiftId === shiftId ? persisted.messages : null;
}

function saveFileStore(shiftId: string, messages: StoreMessage[]) {
  try {
    localStorage.setItem(FILE_STORE_KEY, JSON.stringify({ shiftId, messages }));
  } catch {
    /* ignore quota / availability errors */
  }
}

interface ShiftState {
  selectedShiftId: ShiftId | null;
  isShiftActive: boolean;
  shiftEnded: boolean;
  isPaused: boolean;
  onBreak: boolean;
  breakLabel: string | null;
  clockSpeed: ClockSpeed;
  gameTimeMinutes: number;
  durationMinutes: number;
  startMinutes: number;
  score: number;
  maxPossibleScore: number;
  tasks: AISTask[];
  activeTaskId: string | null;
  tasksCompleted: number;
  tasksExpired: number;
  firedEventIds: string[];
  isPractice: boolean;
  fileStore: StoreMessage[];
}

interface ShiftContextType extends ShiftState {
  shift: ShiftDef | null;
  currentLocalMinutes: number;
  selectShift: (id: ShiftId) => void;
  startShift: () => void;
  endShift: () => void;
  pauseShift: () => void;
  resumeShift: () => void;
  startBreak: (label: string) => void;
  endBreak: () => void;
  fireEvent: (eventId: string) => void;
  setClockSpeed: (s: ClockSpeed) => void;
  setActiveTask: (taskId: string | null) => void;
  submitTask: (taskId: string, score: number, maxScore: number, feedback?: string) => void;
  generateAndAddTask: () => void;
  addTaskOfType: (type: TaskType) => void;
  startPractice: () => void;
  practiceTask: (type: TaskType) => void;
  exitPractice: () => void;
  ackMessage: (id: string) => void;
  processMessage: (id: string) => void;
  forwardMessage: (id: string) => void;
  addStoreMessage: (
    msg: Omit<StoreMessage, 'id' | 'timeSent' | 'timeSentMin' | 'acked' | 'processed'> &
      Partial<Pick<StoreMessage, 'acked' | 'processed'>>,
  ) => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const useShift = () => {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used within a ShiftProvider');
  return ctx;
};

const BASE_STATE: ShiftState = {
  selectedShiftId: null,
  isShiftActive: false,
  shiftEnded: false,
  isPaused: false,
  onBreak: false,
  breakLabel: null,
  clockSpeed: 1,
  gameTimeMinutes: 0,
  durationMinutes: 330,
  startMinutes: 7 * 60,
  score: 0,
  maxPossibleScore: 0,
  tasks: [],
  activeTaskId: null,
  tasksCompleted: 0,
  tasksExpired: 0,
  firedEventIds: [],
  isPractice: false,
  fileStore: [],
};

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ShiftState>(() => ({ ...BASE_STATE }));

  // Persist the file store only while a shift is active, scoped by shift id, so
  // returning to shift-select / practice (which reset to BASE_STATE) never
  // overwrites the persisted store with an empty array.
  useEffect(() => {
    if (state.isShiftActive && state.selectedShiftId) {
      saveFileStore(state.selectedShiftId, state.fileStore);
    }
  }, [state.fileStore, state.isShiftActive, state.selectedShiftId]);

  const usedFplIds        = useRef<Set<string>>(new Set());
  const usedNotamIds      = useRef<Set<string>>(new Set());
  const usedPibIds        = useRef<Set<string>>(new Set());
  const usedPcIds         = useRef<Set<string>>(new Set());
  const usedCoverPageIds  = useRef<Set<string>>(new Set());
  const usedHandlingIds   = useRef<Set<string>>(new Set());
  const usedMetarIds      = useRef<Set<string>>(new Set());
  const usedAtsIds        = useRef<Set<string>>(new Set());
  const usedInfoIds       = useRef<Set<string>>(new Set());
  const usedRffsIds       = useRef<Set<string>>(new Set());
  const usedRoutingIds    = useRef<Set<string>>(new Set());
  const usedApprovalIds   = useRef<Set<string>>(new Set());
  const usedCompareIds    = useRef<Set<string>>(new Set());

  const resetUsedIds = () => {
    usedFplIds.current        = new Set();
    usedNotamIds.current      = new Set();
    usedPibIds.current        = new Set();
    usedPcIds.current         = new Set();
    usedCoverPageIds.current  = new Set();
    usedHandlingIds.current   = new Set();
    usedMetarIds.current      = new Set();
    usedAtsIds.current        = new Set();
    usedInfoIds.current       = new Set();
    usedRffsIds.current       = new Set();
    usedRoutingIds.current    = new Set();
    usedApprovalIds.current   = new Set();
    usedCompareIds.current    = new Set();
  };

  const buildTask = (type: TaskType, pct: number): AISTask | null => {
    switch (type) {
      case 'FLIGHT_PLAN':  return generateFlightPlanTask(usedFplIds.current, pct);
      case 'NOTAM':        return generateNotamTask(usedNotamIds.current, pct);
      case 'PIB':          return generatePibTask(usedPibIds.current, pct);
      case 'PILOT_CALL':   return generatePilotCallTask(usedPcIds.current, pct);
      case 'COVER_PAGE':   return generateCoverPageTask(usedCoverPageIds.current, pct);
      case 'AIS_HANDLING': return generateAisHandlingTask(usedHandlingIds.current, pct);
      case 'METAR':        return generateMetarTask(usedMetarIds.current, pct);
      case 'ATS_MESSAGE':  return generateAtsMessageTask(usedAtsIds.current, pct);
      case 'INFO_REQUEST': return generateInfoRequestTask(usedInfoIds.current, pct);
      case 'RFFS_CALL':    return generateRffsTask(usedRffsIds.current, pct);
      case 'FPL_ROUTING':  return generateFplRoutingTask(usedRoutingIds.current, pct);
      case 'FPL_APPROVAL': return generateFplApprovalTask(usedApprovalIds.current, pct);
      case 'FPL_COMPARE':  return generateFplCompareTask(usedCompareIds.current, pct);
      default: return null;
    }
  };

  const selectShift = useCallback((id: ShiftId) => {
    const def = SHIFTS[id];
    setState(prev => ({
      ...BASE_STATE,
      selectedShiftId: id,
      durationMinutes: def.durationMinutes,
      startMinutes: def.startMinutes,
      fileStore: prev.fileStore,
    }));
  }, []);

  const startShift = useCallback(() => {
    resetUsedIds();
    setState(prev => {
      const id = prev.selectedShiftId ?? 'A';
      const def = SHIFTS[id];
      // Seed handover tasks into the queue.
      const pct = 0;
      const seeded: AISTask[] = [];
      for (const item of def.handover) {
        const t = buildTask(item.type, pct);
        if (t) {
          seeded.push({
            ...t,
            title: `Handover — ${t.title}`,
            description: `${item.note} (${t.description})`,
          });
        }
      }
      // Resume the persisted store for this shift if one exists (e.g. after a
      // page reload mid-session); otherwise seed a fresh store for the shift.
      const persisted = loadFileStoreForShift(id);
      return {
        ...BASE_STATE,
        selectedShiftId: id,
        isShiftActive: true,
        durationMinutes: def.durationMinutes,
        startMinutes: def.startMinutes,
        tasks: seeded,
        fileStore: persisted ?? seedFileStore(id),
      };
    });
  }, []);

  const endShift = useCallback(() => {
    setState(prev => ({ ...prev, isShiftActive: false, shiftEnded: true }));
  }, []);

  const pauseShift = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeShift = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false, onBreak: false, breakLabel: null }));
  }, []);

  const startBreak = useCallback((label: string) => {
    setState(prev => ({ ...prev, isPaused: true, onBreak: true, breakLabel: label }));
  }, []);

  const endBreak = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false, onBreak: false, breakLabel: null }));
  }, []);

  const fireEvent = useCallback((eventId: string) => {
    setState(prev => {
      if (prev.firedEventIds.includes(eventId)) return prev;
      return { ...prev, firedEventIds: [...prev.firedEventIds, eventId] };
    });
  }, []);

  const setClockSpeed = useCallback((speed: ClockSpeed) => {
    setState(prev => ({ ...prev, clockSpeed: speed }));
  }, []);

  const setActiveTask = useCallback((taskId: string | null) => {
    setState(prev => ({ ...prev, activeTaskId: taskId }));
  }, []);

  const submitTask = useCallback((taskId: string, score: number, maxScore: number, feedback?: string) => {
    setState(prev => {
      const tasks = prev.tasks.map(t =>
        t.id === taskId
          ? { ...t, status: 'COMPLETED' as TaskStatus, score, maxScore, feedback, completedAt: Date.now() }
          : t
      );
      return {
        ...prev,
        tasks,
        score: prev.score + score,
        maxPossibleScore: prev.maxPossibleScore + maxScore,
        tasksCompleted: prev.tasksCompleted + 1,
      };
    });
  }, []);

  const generateAndAddTask = useCallback(() => {
    setState(prev => {
      if (!prev.isShiftActive || prev.isPaused) return prev;
      if (prev.tasks.filter(t => t.status === 'PENDING').length >= 12) return prev;

      const pct = prev.gameTimeMinutes / Math.max(prev.durationMinutes, 1);
      const types: TaskType[] = [
        'FLIGHT_PLAN', 'NOTAM', 'PIB', 'PILOT_CALL',
        'COVER_PAGE', 'AIS_HANDLING', 'METAR', 'ATS_MESSAGE',
        'INFO_REQUEST', 'FPL_ROUTING', 'FPL_APPROVAL', 'FPL_COMPARE',
      ];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      const task = buildTask(chosenType, pct);
      if (!task) return prev;
      return { ...prev, tasks: [...prev.tasks, task] };
    });
  }, []);

  const addTaskOfType = useCallback((type: TaskType) => {
    setState(prev => {
      if (!prev.isShiftActive) return prev;
      const pct = prev.gameTimeMinutes / Math.max(prev.durationMinutes, 1);
      const task = buildTask(type, pct);
      if (!task) return prev;
      return { ...prev, tasks: [...prev.tasks, task] };
    });
  }, []);

  // ── Practice mode (no clock, no expiry, no scoring pressure) ──────────────────
  const startPractice = useCallback(() => {
    resetUsedIds();
    setState(prev => ({ ...BASE_STATE, isPractice: true, fileStore: prev.fileStore }));
  }, []);

  const practiceTask = useCallback((type: TaskType) => {
    setState(prev => {
      const pct = Math.random();
      let task = buildTask(type, pct);
      if (!task) {
        resetUsedIds();
        task = buildTask(type, pct);
      }
      if (!task) return prev;
      return { ...prev, tasks: [task], activeTaskId: task.id };
    });
  }, []);

  const exitPractice = useCallback(() => {
    setState(prev => ({ ...BASE_STATE, fileStore: prev.fileStore }));
  }, []);

  const ackMessage = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      fileStore: prev.fileStore.map(m => (m.id === id ? { ...m, acked: true } : m)),
    }));
  }, []);

  const processMessage = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      fileStore: prev.fileStore.map(m =>
        m.id === id ? { ...m, processed: true, acked: true } : m),
    }));
  }, []);

  // Forward/relay a foreign inbound/overflight message on to the relevant ATC
  // unit. This implies acknowledgement and counts as processing the item.
  const forwardMessage = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      fileStore: prev.fileStore.map(m =>
        m.id === id ? { ...m, forwarded: true, acked: true, processed: true } : m),
    }));
  }, []);

  const addStoreMessage = useCallback<ShiftContextType['addStoreMessage']>((msg) => {
    setState(prev => {
      const localMinutes = wrapMinutes(prev.startMinutes + prev.gameTimeMinutes);
      return { ...prev, fileStore: [...prev.fileStore, makeStoreMessage(msg, localMinutes)] };
    });
  }, []);

  // Game clock: tick every second, check expiries
  useEffect(() => {
    if (!state.isShiftActive) return;

    const interval = setInterval(() => {
      setState(prev => {
        if (prev.isPaused) return prev;

        const ratePerSecond = prev.durationMinutes / SHIFT_REAL_SECONDS; // game-min per real-sec at 1x
        const delta = ratePerSecond * prev.clockSpeed;
        const newTime = prev.gameTimeMinutes + delta;
        if (newTime >= prev.durationMinutes) {
          return { ...prev, gameTimeMinutes: prev.durationMinutes, isShiftActive: false, shiftEnded: true };
        }

        const now = Date.now();
        let expiredDelta = 0;
        const newTasks = prev.tasks.map(t => {
          if (t.status === 'PENDING' && now > t.expiresAt) {
            expiredDelta++;
            return { ...t, status: 'EXPIRED' as TaskStatus, score: -25 };
          }
          return t;
        });

        return {
          ...prev,
          gameTimeMinutes: newTime,
          tasks: newTasks,
          tasksExpired: prev.tasksExpired + expiredDelta,
          score: prev.score - expiredDelta * 25,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isShiftActive]);

  const shift = state.selectedShiftId ? SHIFTS[state.selectedShiftId] : null;
  const currentLocalMinutes = wrapMinutes(state.startMinutes + state.gameTimeMinutes);

  return (
    <ShiftContext.Provider value={{
      ...state,
      shift,
      currentLocalMinutes,
      selectShift, startShift, endShift, pauseShift, resumeShift,
      startBreak, endBreak, fireEvent, setClockSpeed,
      setActiveTask, submitTask, generateAndAddTask, addTaskOfType,
      startPractice, practiceTask, exitPractice,
      ackMessage, processMessage, forwardMessage, addStoreMessage,
    }}>
      {children}
    </ShiftContext.Provider>
  );
};
