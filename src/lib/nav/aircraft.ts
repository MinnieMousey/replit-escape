// ── Aircraft performance profiles for auto-calculated flight plans ──────────
// Values are cruise-only approximations for training use (zero wind).

export interface AircraftProfile {
  id: string;
  label: string;
  tasKt: number;      // true airspeed, knots
  burnKgHr: number;   // cruise fuel burn, kg / hour
  reserveMin: number; // fixed reserve, minutes
}

export const AIRCRAFT: AircraftProfile[] = [
  { id: 'C172', label: 'Cessna 172',        tasKt: 110, burnKgHr:   32, reserveMin: 45 },
  { id: 'DH8D', label: 'Dash 8 Q400',       tasKt: 360, burnKgHr: 1100, reserveMin: 45 },
  { id: 'AT76', label: 'ATR 72-600',        tasKt: 275, burnKgHr:  650, reserveMin: 45 },
  { id: 'B738', label: 'Boeing 737-800',    tasKt: 450, burnKgHr: 2500, reserveMin: 45 },
  { id: 'A320', label: 'Airbus A320',       tasKt: 447, burnKgHr: 2400, reserveMin: 45 },
  { id: 'A21N', label: 'Airbus A321neo',    tasKt: 447, burnKgHr: 2350, reserveMin: 45 },
  { id: 'B788', label: 'Boeing 787-8',      tasKt: 485, burnKgHr: 5400, reserveMin: 45 },
  { id: 'A333', label: 'Airbus A330-300',   tasKt: 470, burnKgHr: 5600, reserveMin: 45 },
  { id: 'A359', label: 'Airbus A350-900',   tasKt: 488, burnKgHr: 5800, reserveMin: 45 },
  { id: 'B77W', label: 'Boeing 777-300ER',  tasKt: 490, burnKgHr: 6800, reserveMin: 45 },
  { id: 'B744', label: 'Boeing 747-400',    tasKt: 490, burnKgHr: 10400,reserveMin: 45 },
];

export const aircraftById = (id: string): AircraftProfile | undefined =>
  AIRCRAFT.find(a => a.id === id);
