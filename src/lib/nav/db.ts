// ── In-memory nav database, schema-compatible with the SQLite spec ──────────
// Sources the existing curated Caribbean dataset (NAVAIDS / FIXES / AERODROMES
// / AIRWAYS) and exposes lookup + spatial helpers used by the router and the
// MapLibre layers. Adapters in ./adapters/* can later populate or replace this
// store from OpenAIP / OurAirports / AirportDB / AIRAC without touching call
// sites.

import RBush from 'rbush';
import {
  NAVAIDS as RAW_NAVAIDS,
  FIXES as RAW_FIXES,
  AERODROMES as RAW_AERODROMES,
  AIRWAYS as RAW_AIRWAYS,
  lookupPoint,
  haversineNm,
  type NavPoint,
} from '@/components/glossary/navdb';
import type {
  Airport, Navaid, Waypoint, Airway, AirwaySegment, Fix, NavaidType,
} from './types';
import { WORLD_AIRPORTS } from './data/airports.world';
import { WORLD_NAVAIDS } from './data/navaids.world';
import { WORLD_WAYPOINTS } from './data/waypoints.world';
import { WORLD_AIRWAYS } from './data/airways.world';

// ── Type normalisation ──────────────────────────────────────────────────────
// The legacy navdb stores VORs and NDBs under kind 'VOR' / 'NDB'. Promote any
// VOR with a frequency to 'VORDME' when the note hints DME co-location, and
// keep plain 'VOR' otherwise. (Conservative: only the curated seed is touched.)
const navaidType = (p: NavPoint): NavaidType => {
  if (p.kind === 'NDB') return 'NDB';
  if (p.note?.toLowerCase().includes('vor/dme') || p.name.toLowerCase().includes('vor/dme')) return 'VORDME';
  return 'VOR';
};

const CARIB_AIRPORTS: Airport[] = RAW_AERODROMES.map(p => ({
  icao: p.ident,
  name: p.name,
  lat: p.lat,
  lon: p.lon,
  fir: p.fir,
}));

// Dedupe world entries against Caribbean entries by ICAO ident.
const CARIB_ICAOS = new Set(CARIB_AIRPORTS.map(a => a.icao));
export const AIRPORTS: Airport[] = [
  ...CARIB_AIRPORTS,
  ...WORLD_AIRPORTS.filter(a => !CARIB_ICAOS.has(a.icao)),
];

const CARIB_NAVAIDS: Navaid[] = RAW_NAVAIDS.map(p => ({
  ident: p.ident,
  name: p.name,
  type: navaidType(p),
  frequency: p.freq ? parseFloat(p.freq) : undefined,
  lat: p.lat,
  lon: p.lon,
  note: p.note,
}));
const CARIB_NAV_IDS = new Set(CARIB_NAVAIDS.map(n => n.ident));
export const NAVAIDS: Navaid[] = [
  ...CARIB_NAVAIDS,
  ...WORLD_NAVAIDS.filter(n => !CARIB_NAV_IDS.has(n.ident)),
];

const CARIB_WAYPOINTS: Waypoint[] = RAW_FIXES.map(p => ({
  ident: p.ident,
  lat: p.lat,
  lon: p.lon,
  note: p.note,
}));
const CARIB_WPT_IDS = new Set(CARIB_WAYPOINTS.map(w => w.ident));
export const WAYPOINTS: Waypoint[] = [
  ...CARIB_WAYPOINTS,
  ...WORLD_WAYPOINTS.filter(w => !CARIB_WPT_IDS.has(w.ident)),
];

// ── Unified fix table + ident index (built before airways so world airway
//    endpoints can resolve against the merged database) ─────────────────────
export const ALL_FIXES: Fix[] = [
  ...AIRPORTS.map<Fix>(a => ({ ident: a.icao, kind: 'airport', lat: a.lat, lon: a.lon, label: a.name, detail: a.icao })),
  ...NAVAIDS.map<Fix>(n => ({ ident: n.ident, kind: 'navaid', lat: n.lat, lon: n.lon, label: n.name, detail: n.type })),
  ...WAYPOINTS.map<Fix>(w => ({ ident: w.ident, kind: 'waypoint', lat: w.lat, lon: w.lon, label: w.ident })),
];

const FIX_BY_IDENT = new Map<string, Fix>();
ALL_FIXES.forEach(f => { if (!FIX_BY_IDENT.has(f.ident)) FIX_BY_IDENT.set(f.ident, f); });

export const fixByIdent = (id: string): Fix | undefined => FIX_BY_IDENT.get(id.trim().toUpperCase());

// ── Airway segments (built from the curated airway point sequences) ─────────
const AIRWAY_TYPE = (id: string): Airway['type'] => {
  if (id.startsWith('U') || id.startsWith('J')) return 'JET';
  if (id.startsWith('V')) return 'VICTOR';
  if (id.startsWith('Q') || id.startsWith('T') || id.startsWith('Y') || id.startsWith('Z')) return 'RNAV';
  if (id.startsWith('NAT') || id.startsWith('O')) return 'OCEANIC';
  return 'LOW';
};

function segDistanceNm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3440.065, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

const buildAirway = (id: string, points: string[]): Airway => {
  const segs: AirwaySegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const f = FIX_BY_IDENT.get(points[i]);
    const t = FIX_BY_IDENT.get(points[i + 1]);
    if (!f || !t) continue;
    segs.push({ airwayId: id, from: f.ident, to: t.ident, distanceNm: segDistanceNm(f, t) });
  }
  return { id, type: AIRWAY_TYPE(id), segments: segs };
};

export const AIRWAYS: Airway[] = [
  ...RAW_AIRWAYS.map(a => buildAirway(a.id, a.points)),
  ...WORLD_AIRWAYS.map(a => buildAirway(a.id, a.points)),
];

const AIRWAY_BY_ID = new Map<string, Airway>();
AIRWAYS.forEach(a => AIRWAY_BY_ID.set(a.id, a));
export const airwayById = (id: string): Airway | undefined => AIRWAY_BY_ID.get(id.trim().toUpperCase());

// ── Spatial index for viewport queries / nearest-fix click ──────────────────
interface IdxEntry { minX: number; minY: number; maxX: number; maxY: number; fix: Fix; }
const tree = new RBush<IdxEntry>();
tree.load(ALL_FIXES.map(f => ({ minX: f.lon, minY: f.lat, maxX: f.lon, maxY: f.lat, fix: f })));

export function fixesInBbox(west: number, south: number, east: number, north: number): Fix[] {
  return tree.search({ minX: west, minY: south, maxX: east, maxY: north }).map(e => e.fix);
}

export function nearestFix(lon: number, lat: number, radiusDeg = 1, kinds?: Fix['kind'][]): Fix | null {
  const candidates: IdxEntry[] = tree.search({
    minX: lon - radiusDeg, minY: lat - radiusDeg, maxX: lon + radiusDeg, maxY: lat + radiusDeg,
  });
  let best: Fix | null = null, bd = Infinity;
  for (const c of candidates) {
    if (kinds && !kinds.includes(c.fix.kind)) continue;
    const dx = c.fix.lon - lon, dy = c.fix.lat - lat;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = c.fix; }
  }
  return best;
}

/** Re-export of the haversine helper for convenience. */
export { haversineNm } from '@/components/glossary/navdb';
