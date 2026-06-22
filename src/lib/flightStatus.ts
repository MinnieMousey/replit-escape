import { StoreMessage, MessageKind } from './fileStore';
import { UTC_OFFSET_MINUTES, wrapMinutes } from './shifts';

// ── Live flight-status derivation ────────────────────────────────────────────
// Turns the per-shift file store into two live boards driven off the game clock:
//   • Active   — flights that are airborne / active *now*.
//   • Inactive — flights due to become active within the next hour.
// Times in the store (EOBT, EET, off/landing times) are ICAO Zulu (UTC), while
// the game clock is Barbados local; everything here is compared in UTC minutes.

/** Home aerodrome (Grantley Adams). Flights from/to here are our own traffic. */
export const HOME_AERODROME = 'TBPB';

/** How a flight relates to us: arriving, leaving, or just crossing the FIR. */
export type FlightCategory = 'inbound' | 'overflight' | 'departing';

export type FlightPhase = 'active' | 'upcoming';

export interface FlightStatus {
  id: string;
  callsign: string;
  kind: MessageKind;
  category: FlightCategory;
  dep?: string;
  dest?: string;
  /** Estimated/actual off-block (UTC minutes from midnight). */
  depMin: number;
  /** Estimated/actual arrival (UTC minutes from midnight). */
  arrMin: number;
  /** Whether the off-block time is an actual airborne report (DEP) vs estimate. */
  airborneReported: boolean;
  phase: FlightPhase;
  /** Signed minutes until off-block (negative = already departed). */
  minsToDep: number;
  /** Signed minutes until arrival (negative = already arrived). */
  minsToArr: number;
  /** Underlying store message, for opening detail / forwarding. */
  msg: StoreMessage;
}

/** Only these message kinds represent a live flight on the boards. */
const FLIGHT_KINDS: MessageKind[] = ['FPL', 'DEP', 'ARR'];

/** Default block-to-block time (minutes) when a flight has no EET on file. */
const DEFAULT_EET_MINUTES = 60;

/** Parse an HHMM string (e.g. EOBT "1330") to minutes-from-midnight, or null. */
function hhmmToMin(hhmm?: string): number | null {
  if (!hhmm) return null;
  const clean = hhmm.replace(/[^0-9]/g, '');
  if (clean.length < 3) return null;
  const padded = clean.padStart(4, '0').slice(0, 4);
  const h = parseInt(padded.slice(0, 2), 10);
  const m = parseInt(padded.slice(2, 4), 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return wrapMinutes(h * 60 + m);
}

/** Signed shortest difference target−now, in the range −720..720 (minutes). */
function signedDiff(target: number, now: number): number {
  let d = wrapMinutes(target - now);
  if (d > 720) d -= 1440;
  return d;
}

/** Classify a flight by its relationship to the home aerodrome / FIR. */
export function categorise(msg: StoreMessage): FlightCategory {
  if (msg.traffic === 'overflight') return 'overflight';
  if (msg.dep === HOME_AERODROME) return 'departing';
  if (msg.dest === HOME_AERODROME || msg.traffic === 'inbound') return 'inbound';
  // Anything else with no home leg is treated as an overflight of our airspace.
  return 'overflight';
}

/** Resolve a flight's off-block and arrival times (UTC minutes from midnight). */
function flightTimes(msg: StoreMessage): { depMin: number; arrMin: number; airborneReported: boolean } | null {
  const off = hhmmToMin(msg.offTime);
  const eobt = hhmmToMin(msg.eobt);
  const arr = hhmmToMin(msg.arrTime);
  const eet = hhmmToMin(msg.eet);

  // Off-block: actual airborne report wins, else the estimate (EOBT).
  const depMin = off ?? eobt;
  if (depMin == null) return null;

  // Arrival: actual landing wins, else off-block + EET (or a default block time).
  const arrMin = arr ?? wrapMinutes(depMin + (eet ?? DEFAULT_EET_MINUTES));

  return { depMin, arrMin, airborneReported: off != null };
}

/**
 * Derive the live Active and Inactive flight boards from the file store at the
 * given shift-local clock position.
 *
 * @param store           current file store messages
 * @param localMinutes    current shift-local time, minutes from midnight
 * @param upcomingWindow  how far ahead (minutes) counts as "due to become active"
 */
export function deriveFlightStatus(
  store: StoreMessage[],
  localMinutes: number,
  upcomingWindow = 60,
): { active: FlightStatus[]; inactive: FlightStatus[] } {
  const nowUtc = wrapMinutes(localMinutes + UTC_OFFSET_MINUTES);
  const active: FlightStatus[] = [];
  const inactive: FlightStatus[] = [];

  for (const msg of store) {
    if (!FLIGHT_KINDS.includes(msg.kind)) continue;

    const times = flightTimes(msg);
    if (!times) continue;

    const { depMin, arrMin, airborneReported } = times;
    const minsToDep = signedDiff(depMin, nowUtc);
    const minsToArr = signedDiff(arrMin, nowUtc);

    // Already arrived → no longer active.
    if (minsToArr <= 0) continue;

    const base: Omit<FlightStatus, 'phase'> = {
      id: msg.id,
      callsign: msg.callsign,
      kind: msg.kind,
      category: categorise(msg),
      dep: msg.dep,
      dest: msg.dest,
      depMin,
      arrMin,
      airborneReported,
      minsToDep,
      minsToArr,
      msg,
    };

    if (minsToDep <= 0) {
      // Off-block has passed and not yet arrived → airborne / active now.
      active.push({ ...base, phase: 'active' });
    } else if (minsToDep <= upcomingWindow) {
      // Due to become active within the look-ahead window.
      inactive.push({ ...base, phase: 'upcoming' });
    }
    // Further than the window away → not shown on either board yet.
  }

  // Active: those closest to arrival first. Inactive: soonest to depart first.
  active.sort((a, b) => a.minsToArr - b.minsToArr);
  inactive.sort((a, b) => a.minsToDep - b.minsToDep);

  return { active, inactive };
}
