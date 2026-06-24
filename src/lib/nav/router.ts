// ── Route planning engine ───────────────────────────────────────────────────
// `planRoute` follows SkyVector-style priorities:
//   1. Published airway path (one family at a time: RNAV → JET → VICTOR → any)
//   2. Mixed-airway A* across the whole graph
//   3. Great-circle DCT fallback
// `validateManualRoute` walks a user-entered sequence and checks each leg
// against the airway membership rules.

import { aStar } from './graph';
import { fixByIdent, AIRWAYS } from './db';
import { distanceNm, bearingTrue, greatCircleLine } from './greatCircle';
import type {
  PlannedRoute, RouteLeg, RouteElement, Fix, AirwayType,
} from './types';

const PREFERRED_FAMILIES: AirwayType[][] = [
  ['RNAV'],
  ['JET', 'UPPER'],
  ['VICTOR', 'LOW'],
  ['OCEANIC'],
];

export interface PlanOpts {
  /** Force a specific strategy instead of cascading. */
  force?: 'great-circle' | 'graph';
}

export function planRoute(depIdent: string, destIdent: string, opts: PlanOpts = {}): PlannedRoute {
  const dep = fixByIdent(depIdent);
  const dest = fixByIdent(destIdent);
  if (!dep || !dest) {
    return {
      elements: [], legs: [], totalNm: 0, strategy: 'great-circle',
      errors: [`Could not resolve ${!dep ? depIdent : destIdent}`],
    };
  }

  if (opts.force === 'great-circle') return greatCirclePlan(dep, dest);

  // Try each preferred family, then a mixed search.
  for (const fam of PREFERRED_FAMILIES) {
    const p = aStar(dep.ident, dest.ident, { allowedTypes: fam, switchPenaltyNm: 8 });
    if (p && p.idents.length >= 2) return graphPathToPlan(p, 'published');
  }
  const any = aStar(dep.ident, dest.ident, { switchPenaltyNm: 5 });
  if (any && any.idents.length >= 2) return graphPathToPlan(any, 'graph');

  return greatCirclePlan(dep, dest);
}

function greatCirclePlan(dep: Fix, dest: Fix): PlannedRoute {
  const elements: RouteElement[] = [
    { kind: 'fix', raw: dep.ident, fix: dep },
    { kind: 'dct', raw: 'DCT' },
    { kind: 'fix', raw: dest.ident, fix: dest },
  ];
  const leg: RouteLeg = {
    from: dep, to: dest, via: 'DCT',
    distanceNm: distanceNm(dep, dest),
    bearingTrue: bearingTrue(dep, dest),
    path: greatCircleLine(dep, dest, 48),
    ok: true,
  };
  return { elements, legs: [leg], totalNm: leg.distanceNm, errors: [], strategy: 'great-circle' };
}

function graphPathToPlan(p: ReturnType<typeof aStar> & object, strategy: 'published' | 'graph'): PlannedRoute {
  const idents = (p as { idents: string[] }).idents;
  const edges = (p as { edges: { from: string; to: string; airwayId: string; distanceNm: number }[] }).edges;
  const elements: RouteElement[] = [];
  const legs: RouteLeg[] = [];
  let totalNm = 0;
  let lastAirway: string | null = null;
  // Build elements: fix, [airway,] fix, ...
  for (let i = 0; i < idents.length; i++) {
    const fix = fixByIdent(idents[i])!;
    if (i > 0) {
      const e = edges[i - 1];
      if (e.airwayId !== lastAirway) {
        elements.push({ kind: 'airway', raw: e.airwayId, airwayId: e.airwayId });
        lastAirway = e.airwayId;
      }
    }
    elements.push({ kind: 'fix', raw: fix.ident, fix });
  }
  for (let i = 0; i < edges.length; i++) {
    const a = fixByIdent(edges[i].from)!;
    const b = fixByIdent(edges[i].to)!;
    const leg: RouteLeg = {
      from: a, to: b, via: edges[i].airwayId, airwayId: edges[i].airwayId,
      distanceNm: edges[i].distanceNm,
      bearingTrue: bearingTrue(a, b),
      path: [a, b],
      ok: true,
    };
    legs.push(leg);
    totalNm += leg.distanceNm;
  }
  return { elements, legs, totalNm, errors: [], strategy };
}

// ── Manual route validation ─────────────────────────────────────────────────
// Walks user-entered RouteElements pair by pair, builds legs, and flags any
// missing connector or off-airway fix.

export function validateManualRoute(elements: RouteElement[]): PlannedRoute {
  const errors: string[] = [];
  const legs: RouteLeg[] = [];
  let prevFix: Fix | null = null;
  let pending: RouteElement | null = null;
  elements.forEach(el => { if (el.error) errors.push(el.error); });

  for (const el of elements) {
    if (el.kind === 'airway' || el.kind === 'dct') { pending = el; continue; }
    if (el.kind !== 'fix' || !el.fix) { prevFix = null; pending = null; continue; }
    const here = el.fix;
    if (prevFix) {
      if (!pending) {
        legs.push(makeBadLeg(prevFix, here, '—', `No connector between ${prevFix.ident} and ${here.ident}`));
      } else if (pending.kind === 'dct') {
        legs.push(makeDctLeg(prevFix, here));
      } else if (pending.kind === 'airway' && pending.airwayId) {
        const awy = AIRWAYS.find(a => a.id === pending!.airwayId);
        if (!awy) {
          legs.push(makeBadLeg(prevFix, here, pending.airwayId, `Unknown airway ${pending.airwayId}`));
        } else {
          const onFrom = awy.segments.some(s => s.from === prevFix!.ident || s.to === prevFix!.ident);
          const onTo = awy.segments.some(s => s.from === here.ident || s.to === here.ident);
          if (!onFrom || !onTo) {
            legs.push(makeBadLeg(prevFix, here, awy.id,
              !onFrom ? `${prevFix.ident} is not on ${awy.id}` : `${here.ident} is not on ${awy.id}`));
          } else {
            legs.push({
              from: prevFix, to: here, via: awy.id, airwayId: awy.id,
              distanceNm: distanceNm(prevFix, here),
              bearingTrue: bearingTrue(prevFix, here),
              path: [prevFix, here], ok: true,
            });
          }
        }
      }
    }
    prevFix = here;
    pending = null;
  }
  legs.forEach(l => { if (!l.ok && l.error) errors.push(l.error); });
  const totalNm = legs.reduce((s, l) => s + (l.ok ? l.distanceNm : 0), 0);
  return { elements, legs, totalNm, errors, strategy: 'manual' };
}

function makeDctLeg(a: Fix, b: Fix): RouteLeg {
  return {
    from: a, to: b, via: 'DCT',
    distanceNm: distanceNm(a, b),
    bearingTrue: bearingTrue(a, b),
    path: greatCircleLine(a, b, 32),
    ok: true,
  };
}

function makeBadLeg(a: Fix, b: Fix, via: string, error: string): RouteLeg {
  return {
    from: a, to: b, via,
    distanceNm: distanceNm(a, b),
    bearingTrue: bearingTrue(a, b),
    path: [a, b],
    ok: false, error,
  };
}
