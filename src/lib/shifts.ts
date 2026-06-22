import { TaskType } from '../types/game';

// ── Local / UTC time model ──────────────────────────────────────────────────────
// Barbados local time (AST) is UTC−4, so UTC = Local + 4 hours.
export const UTC_OFFSET_MINUTES = 240;

/** Wrap minutes-from-midnight into the 0..1439 range. */
export function wrapMinutes(min: number): number {
  return ((Math.round(min) % 1440) + 1440) % 1440;
}

/** Format minutes-from-midnight as HH:MM (24h). */
export function hhmm(min: number): string {
  const m = wrapMinutes(min);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Format minutes-from-midnight as a Zulu (UTC) string, e.g. 1230Z. */
export function zulu(localMin: number): string {
  const u = wrapMinutes(localMin + UTC_OFFSET_MINUTES);
  const h = Math.floor(u / 60);
  const mm = u % 60;
  return `${String(h).padStart(2, '0')}${String(mm).padStart(2, '0')}Z`;
}

/** Combined Local / UTC label for a given local minutes-from-midnight. */
export function localUtc(localMin: number): { local: string; utc: string } {
  return { local: hhmm(localMin), utc: zulu(localMin) };
}

// ── Scheduled events ────────────────────────────────────────────────────────────
export type ScheduledEventKind =
  | 'RFFS_CALL'
  | 'BREAK'
  | 'INFO_REQUEST'
  | 'NOTAM_REQUEST'
  | 'FPL_ROUTING';

export interface ScheduledEvent {
  id: string;
  /** Minutes into the shift when the event fires. */
  atMinutes: number;
  kind: ScheduledEventKind;
  label: string;
  /** Break length in shift-minutes (for BREAK kind). */
  durationMinutes?: number;
}

export interface HandoverItem {
  type: TaskType;
  note: string;
}

export interface ShiftDef {
  id: 'A' | 'B' | 'C' | 'D';
  label: string;
  /** Local start, minutes from midnight. */
  startMinutes: number;
  /** Local end, minutes from midnight (for display only). */
  endMinutes: number;
  /** Shift length in shift-minutes the clock counts through. */
  durationMinutes: number;
  events: ScheduledEvent[];
  handover: HandoverItem[];
}

const EVENT_KIND_TO_TASK: Record<Exclude<ScheduledEventKind, 'BREAK'>, TaskType> = {
  RFFS_CALL: 'RFFS_CALL',
  INFO_REQUEST: 'INFO_REQUEST',
  NOTAM_REQUEST: 'NOTAM',
  FPL_ROUTING: 'FPL_ROUTING',
};

export function eventToTaskType(kind: ScheduledEventKind): TaskType | null {
  if (kind === 'BREAK') return null;
  return EVENT_KIND_TO_TASK[kind];
}

export const SHIFTS: Record<'A' | 'B' | 'C' | 'D', ShiftDef> = {
  A: {
    id: 'A',
    label: 'Shift A — Morning',
    startMinutes: 7 * 60,        // 07:00
    endMinutes: 12 * 60 + 30,   // 12:30
    durationMinutes: 330,
    events: [
      { id: 'A-info1', atMinutes: 30, kind: 'INFO_REQUEST', label: 'Departmental information request' },
      { id: 'A-rffs',  atMinutes: 90, kind: 'RFFS_CALL', label: 'RFFS category-status call (08:30 / 1230Z)' },
      { id: 'A-fpl',   atMinutes: 150, kind: 'FPL_ROUTING', label: 'Approved flight plan to file' },
      { id: 'A-break', atMinutes: 210, kind: 'BREAK', label: 'Scheduled break', durationMinutes: 30 },
      { id: 'A-notam', atMinutes: 270, kind: 'NOTAM_REQUEST', label: 'NOTAM request' },
    ],
    handover: [
      { type: 'FLIGHT_PLAN', note: 'Outstanding FPL from night shift awaiting validation.' },
      { type: 'NOTAM', note: 'Draft NOTAM left for review — confirm fields before issue.' },
    ],
  },
  B: {
    id: 'B',
    label: 'Shift B — Afternoon',
    startMinutes: 12 * 60 + 30,  // 12:30
    endMinutes: 18 * 60,        // 18:00
    durationMinutes: 330,
    events: [
      { id: 'B-info1', atMinutes: 30, kind: 'INFO_REQUEST', label: 'Agency information request' },
      { id: 'B-fpl',   atMinutes: 90, kind: 'FPL_ROUTING', label: 'Approved flight plan to file' },
      { id: 'B-rffs',  atMinutes: 120, kind: 'RFFS_CALL', label: 'RFFS category-status call (14:30 / 1830Z)' },
      { id: 'B-break', atMinutes: 195, kind: 'BREAK', label: 'Scheduled break', durationMinutes: 30 },
      { id: 'B-notam', atMinutes: 270, kind: 'NOTAM_REQUEST', label: 'NOTAM request' },
    ],
    handover: [
      { type: 'NOTAM', note: 'Morning NOTAM amendment pending check.' },
      { type: 'PIB', note: 'Dissemination decision deferred from morning shift.' },
    ],
  },
  C: {
    id: 'C',
    label: 'Shift C — Evening',
    startMinutes: 18 * 60,       // 18:00
    endMinutes: 24 * 60,        // 24:00
    durationMinutes: 360,
    events: [
      { id: 'C-info1', atMinutes: 30, kind: 'INFO_REQUEST', label: 'Departmental information request' },
      { id: 'C-rffs',  atMinutes: 120, kind: 'RFFS_CALL', label: 'RFFS category-status call (20:00 / 0000Z)' },
      { id: 'C-fpl',   atMinutes: 180, kind: 'FPL_ROUTING', label: 'Approved flight plan to file' },
      { id: 'C-break', atMinutes: 240, kind: 'BREAK', label: 'Scheduled break', durationMinutes: 30 },
      { id: 'C-notam', atMinutes: 300, kind: 'NOTAM_REQUEST', label: 'NOTAM request' },
    ],
    handover: [
      { type: 'FLIGHT_PLAN', note: 'Afternoon FPL queued for validation.' },
      { type: 'ATS_MESSAGE', note: 'ATS message left unprocessed from afternoon shift.' },
    ],
  },
  D: {
    id: 'D',
    label: 'Shift D — Night',
    startMinutes: 0,             // 00:00
    endMinutes: 7 * 60,         // 07:00
    durationMinutes: 420,
    events: [
      { id: 'D-info1', atMinutes: 60, kind: 'INFO_REQUEST', label: 'Overnight information request' },
      { id: 'D-notam', atMinutes: 120, kind: 'NOTAM_REQUEST', label: 'NOTAM request' },
      { id: 'D-rffs',  atMinutes: 180, kind: 'RFFS_CALL', label: 'RFFS category-status call (03:00 / 0700Z)' },
      { id: 'D-break', atMinutes: 240, kind: 'BREAK', label: 'Scheduled night break', durationMinutes: 45 },
      { id: 'D-fpl',   atMinutes: 330, kind: 'FPL_ROUTING', label: 'Approved flight plan to file' },
    ],
    handover: [
      { type: 'METAR', note: 'Evening METAR decode left for confirmation.' },
      { type: 'FLIGHT_PLAN', note: 'Late FPL handed over from evening shift.' },
    ],
  },
};

export const SHIFT_LIST: ShiftDef[] = [SHIFTS.A, SHIFTS.B, SHIFTS.C, SHIFTS.D];

/** Real seconds for a full shift to elapse at 1× clock speed (~15 minutes). */
export const SHIFT_REAL_SECONDS = 900;
