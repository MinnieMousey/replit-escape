// ── Navigation database types (schema mirrors the SkyVector-style spec) ──────
// The browser store is in-memory TypeScript (fast on mobile, no WASM cost);
// the same shapes match a SQLite layout so an external loader can be swapped in
// behind `db.ts` later without touching the router or UI.

export type NavaidType = 'VOR' | 'VORDME' | 'VORTAC' | 'DME' | 'NDB' | 'TACAN';
export type AirwayType = 'VICTOR' | 'JET' | 'RNAV' | 'OCEANIC' | 'LOW' | 'UPPER';

export interface Airport {
  icao: string;
  iata?: string;
  name: string;
  lat: number;
  lon: number;
  elevation?: number;
  fir?: string;
}

export interface Waypoint {
  ident: string;
  lat: number;
  lon: number;
  note?: string;
}

export interface Navaid {
  ident: string;
  name: string;
  type: NavaidType;
  frequency?: number;
  lat: number;
  lon: number;
  note?: string;
}

export interface Airway {
  id: string;
  type: AirwayType;
  segments: AirwaySegment[];
}

export interface AirwaySegment {
  airwayId: string;
  from: string;   // ident
  to: string;     // ident
  distanceNm: number;
}

export type FixKind = 'airport' | 'navaid' | 'waypoint';

export interface Fix {
  ident: string;
  kind: FixKind;
  lat: number;
  lon: number;
  /** Subtype detail — navaid type, airport ICAO, etc. */
  detail?: string;
  label?: string;
}

export interface RouteElement {
  kind: 'fix' | 'airway' | 'dct';
  raw: string;
  /** Resolved fix (for kind 'fix'). */
  fix?: Fix;
  /** Resolved airway id (for kind 'airway'). */
  airwayId?: string;
  error?: string;
}

export interface RouteLeg {
  from: Fix;
  to: Fix;
  via: string;
  airwayId?: string;
  distanceNm: number;
  bearingTrue: number;
  path: { lat: number; lon: number }[];
  ok: boolean;
  error?: string;
}

export interface PlannedRoute {
  elements: RouteElement[];
  legs: RouteLeg[];
  totalNm: number;
  errors: string[];
  /** Strategy actually used: 'published', 'graph', or 'great-circle'. */
  strategy: 'published' | 'graph' | 'great-circle' | 'manual';
}
