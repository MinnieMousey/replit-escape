// ── Route parser & validator ─────────────────────────────────────────────────────
// Tokenizes a free-text flight-plan route (Item 15 style) into legs and validates
// every token/leg against the nav DB: token existence, fix-on-airway membership,
// leg connectivity, and per-leg distance/bearing.

import {
  NavPoint, Airway, lookupPoint, lookupAirway, firAsPoint,
  haversineNm, initialBearingTrue, toMagnetic,
} from './navdb';

export type TokenKind = 'point' | 'fir' | 'airway' | 'dct' | 'unknown';

export interface ParsedToken {
  raw: string;
  kind: TokenKind;
  /** For 'point' and 'fir' tokens: the resolved nav/region point. */
  point?: NavPoint;
  airway?: Airway;
  error?: string;
}

export interface RouteLeg {
  from: NavPoint;
  to: NavPoint;
  /** 'DCT' or the airway designator. */
  via: string;
  airway?: Airway;
  distanceNm: number;
  bearingTrue: number;
  bearingMag: number;
  /** Ordered points the leg actually traverses (airway sub-path), incl. endpoints. */
  path: NavPoint[];
  ok: boolean;
  error?: string;
}

export interface RouteResult {
  tokens: ParsedToken[];
  legs: RouteLeg[];
  /** Ordered, de-duplicated nav points the route passes through (for the map). */
  routePoints: NavPoint[];
  errors: string[];
  valid: boolean;
  isEmpty: boolean;
}

// An airway designator: 1–3 letters + 1–3 digits + optional trailing letter (A1, A555, UA301, G642…).
const AIRWAY_RE = /^[A-Z]{1,3}\d{1,3}[A-Z]?$/;

function classify(raw: string): ParsedToken {
  const t = raw.toUpperCase();
  if (t === 'DCT' || t === 'DIRECT') return { raw: t, kind: 'dct' };
  if (AIRWAY_RE.test(t)) {
    const awy = lookupAirway(t);
    return awy
      ? { raw: t, kind: 'airway', airway: awy }
      : { raw: t, kind: 'unknown', error: `Unknown airway “${t}” — not in the nav database for this region.` };
  }
  const pt = lookupPoint(t);
  if (pt) return { raw: t, kind: 'point', point: pt };
  // A known FIR code (e.g. TJZS, TTZP) filed in a route resolves to a labelled
  // region marker at the FIR's label anchor — not a precise fix, not boundary geometry.
  const fir = firAsPoint(t);
  if (fir) return { raw: t, kind: 'fir', point: fir };
  return { raw: t, kind: 'unknown', error: `Unknown navaid/fix/aerodrome/FIR “${t}” — does not exist in the nav database.` };
}

/** Sub-path of an airway between two member idents (inclusive), preserving direction. */
function airwaySubPath(awy: Airway, from: string, to: string): NavPoint[] {
  const i = awy.points.indexOf(from);
  const j = awy.points.indexOf(to);
  if (i < 0 || j < 0) return [];
  const slice = i <= j ? awy.points.slice(i, j + 1) : awy.points.slice(j, i + 1).reverse();
  return slice.map(id => lookupPoint(id)).filter((p): p is NavPoint => !!p);
}

function buildLeg(from: NavPoint, to: NavPoint, connector: ParsedToken): RouteLeg {
  const bearingTrue = initialBearingTrue(from, to);
  const base: RouteLeg = {
    from, to,
    via: connector.kind === 'airway' ? connector.airway!.id : 'DCT',
    airway: connector.airway,
    distanceNm: haversineNm(from, to),
    bearingTrue,
    bearingMag: toMagnetic(bearingTrue),
    path: [from, to],
    ok: true,
  };

  if (connector.kind === 'airway') {
    const awy = connector.airway!;
    const fromOn = awy.points.includes(from.ident);
    const toOn = awy.points.includes(to.ident);
    if (!fromOn && !toOn) {
      return { ...base, ok: false, error: `Neither ${from.ident} nor ${to.ident} is on airway ${awy.id}.` };
    }
    if (!fromOn) {
      return { ...base, ok: false, error: `${from.ident} is not on airway ${awy.id} (route does not connect to the airway).` };
    }
    if (!toOn) {
      return { ...base, ok: false, error: `${to.ident} is not on airway ${awy.id} (the airway does not reach this fix).` };
    }
    const path = airwaySubPath(awy, from.ident, to.ident);
    // Distance along the airway sub-path (sum of segments).
    let dist = 0;
    for (let k = 1; k < path.length; k++) dist += haversineNm(path[k - 1], path[k]);
    return { ...base, path: path.length >= 2 ? path : base.path, distanceNm: dist || base.distanceNm };
  }

  return base; // DCT — both endpoints exist, always connected
}

export function parseRoute(input: string): RouteResult {
  const rawTokens = input.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const tokens = rawTokens.map(classify);

  const legs: RouteLeg[] = [];
  const errors: string[] = [];

  let prevPoint: NavPoint | null = null;
  let pending: ParsedToken | null = null; // pending connector (dct or airway)

  tokens.forEach((tok, idx) => {
    if (tok.kind === 'dct') {
      // A leading DCT (e.g. "DCT BNE") is a normal route element meaning "direct to
      // the first point" — no measurable leg, not an error.
      pending = tok;
      return;
    }
    if (tok.kind === 'airway') {
      if (!prevPoint) {
        tok.error = `Airway ${tok.airway!.id} has no entry point — name a fix/navaid before the airway.`;
        pending = null;
        return;
      }
      pending = tok;
      return;
    }
    if (tok.kind === 'unknown') {
      // Unresolvable token breaks the chain; record and reset connector.
      pending = null;
      prevPoint = null;
      return;
    }
    // tok.kind === 'point' or 'fir' (a FIR resolves to a region marker point)
    const here = tok.point!;
    if (prevPoint) {
      if (!pending) {
        // Two adjacent points with no connector between them.
        const leg = buildLeg(prevPoint, here, { raw: '—', kind: 'dct' });
        leg.via = '—';
        leg.ok = false;
        leg.error = `No DCT or airway between ${prevPoint.ident} and ${here.ident} — legs are not connected.`;
        legs.push(leg);
      } else {
        legs.push(buildLeg(prevPoint, here, pending));
      }
    }
    prevPoint = here;
    pending = null;
  });

  // A dangling connector at the end (airway/DCT with no exit point).
  if (pending) {
    const p = pending as ParsedToken;
    if (p.kind === 'airway') {
      errors.push(`Airway ${p.airway!.id} has no exit point — name the fix/navaid where you leave the airway.`);
    } else if (prevPoint) {
      errors.push('Route ends with DCT but no destination point follows.');
    }
  }

  tokens.forEach(t => { if (t.error) errors.push(t.error); });
  legs.forEach(l => { if (!l.ok && l.error) errors.push(l.error); });

  // Ordered, de-duplicated route points for the map.
  const routePoints: NavPoint[] = [];
  const pushPt = (p: NavPoint) => {
    if (!routePoints.length || routePoints[routePoints.length - 1].ident !== p.ident) routePoints.push(p);
  };
  if (legs.length === 0) {
    tokens.forEach(t => { if ((t.kind === 'point' || t.kind === 'fir') && t.point) pushPt(t.point); });
  } else {
    legs.forEach(l => (l.ok ? l.path : [l.from, l.to]).forEach(pushPt));
  }

  const isEmpty = tokens.length === 0;
  const valid = !isEmpty && errors.length === 0;

  return { tokens, legs, routePoints, errors, valid, isEmpty };
}

export const fmtDeg = (d: number) => `${Math.round(d).toString().padStart(3, '0')}°`;
export const fmtDist = (d: number) => `${Math.round(d)} NM`;
