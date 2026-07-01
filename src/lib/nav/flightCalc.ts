// ── Flight-plan auto-calculation helpers ────────────────────────────────────
// EOBT / EET / ETA in HHMM form; Fuel in kg. Cruise-only, zero wind.

import type { AircraftProfile } from './aircraft';

const HHMM_RE = /^([01]\d|2[0-3])([0-5]\d)$/;

export const isValidHHMM = (s: string): boolean => HHMM_RE.test(s.trim());

/** Minutes since 00:00 for a HHMM string, or null if invalid. */
export function parseHHMM(s: string): number | null {
  const m = s.trim().match(HHMM_RE);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function formatHHMM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;
}

export interface FlightPlanCalc {
  eetMin: number;
  fuelKg: number;
  etaHHMM: string | null;
}

export function computeFlightPlan(opts: {
  distanceNm: number;
  aircraft: AircraftProfile;
  eobt?: string;
}): FlightPlanCalc {
  const { distanceNm, aircraft, eobt } = opts;
  const eetMin = distanceNm > 0 ? Math.round((distanceNm / aircraft.tasKt) * 60) : 0;
  const fuelKg = Math.round(((eetMin + aircraft.reserveMin) / 60) * aircraft.burnKgHr);
  const eobtMin = eobt ? parseHHMM(eobt) : null;
  const etaHHMM = eobtMin != null ? formatHHMM(eobtMin + eetMin) : null;
  return { eetMin, fuelKg, etaHHMM };
}

export const eetMinToHHMM = (min: number): string => formatHHMM(min);
