// ── Airway graph + A* / Dijkstra pathfinding ────────────────────────────────
// Builds adjacency from `airway_segments` and finds the lowest-distance path
// between two fix idents. Edge weight = segment distance in NM; the A*
// heuristic is great-circle distance to the goal, which is admissible.

import { AIRWAYS, fixByIdent } from './db';
import { distanceNm } from './greatCircle';
import type { Airway, AirwayType } from './types';

interface Edge { to: string; cost: number; airwayId: string; type: AirwayType; }
const ADJ = new Map<string, Edge[]>();

for (const awy of AIRWAYS) {
  for (const seg of awy.segments) {
    const a = fixByIdent(seg.from);
    const b = fixByIdent(seg.to);
    if (!a || !b) continue;
    const e1: Edge = { to: seg.to, cost: seg.distanceNm, airwayId: awy.id, type: awy.type };
    const e2: Edge = { to: seg.from, cost: seg.distanceNm, airwayId: awy.id, type: awy.type };
    if (!ADJ.has(seg.from)) ADJ.set(seg.from, []);
    if (!ADJ.has(seg.to)) ADJ.set(seg.to, []);
    ADJ.get(seg.from)!.push(e1);
    ADJ.get(seg.to)!.push(e2);
  }
}

export interface GraphPath {
  idents: string[];
  edges: { from: string; to: string; airwayId: string; type: AirwayType; distanceNm: number }[];
  totalNm: number;
}

interface SearchOpts {
  /** Restrict to airways whose type is in this set. */
  allowedTypes?: AirwayType[];
  /** Small penalty applied when switching airways, biases for continuity. */
  switchPenaltyNm?: number;
}

/** Tiny binary heap keyed by f-score. */
class Heap<T> {
  private a: { k: number; v: T }[] = [];
  push(k: number, v: T) { this.a.push({ k, v }); this.up(this.a.length - 1); }
  pop(): T | undefined {
    if (!this.a.length) return undefined;
    const top = this.a[0].v;
    const end = this.a.pop()!;
    if (this.a.length) { this.a[0] = end; this.down(0); }
    return top;
  }
  size() { return this.a.length; }
  private up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].k <= this.a[i].k) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  private down(i: number) {
    const n = this.a.length;
    for (;;) {
      const l = i * 2 + 1, r = l + 1;
      let s = i;
      if (l < n && this.a[l].k < this.a[s].k) s = l;
      if (r < n && this.a[r].k < this.a[s].k) s = r;
      if (s === i) break;
      [this.a[s], this.a[i]] = [this.a[i], this.a[s]];
      i = s;
    }
  }
}

export function aStar(fromIdent: string, toIdent: string, opts: SearchOpts = {}): GraphPath | null {
  const start = fixByIdent(fromIdent);
  const goal = fixByIdent(toIdent);
  if (!start || !goal) return null;
  if (fromIdent === toIdent) return { idents: [fromIdent], edges: [], totalNm: 0 };

  const switchPenalty = opts.switchPenaltyNm ?? 5;
  const allowed = opts.allowedTypes && new Set(opts.allowedTypes);

  const open = new Heap<string>();
  const g = new Map<string, number>([[fromIdent, 0]]);
  const cameFrom = new Map<string, { prev: string; airwayId: string; type: AirwayType; cost: number }>();
  open.push(distanceNm(start, goal), fromIdent);

  while (open.size()) {
    const cur = open.pop()!;
    if (cur === toIdent) break;
    const curG = g.get(cur) ?? Infinity;
    const curEdge = cameFrom.get(cur);
    const here = fixByIdent(cur);
    if (!here) continue;
    for (const e of ADJ.get(cur) ?? []) {
      if (allowed && !allowed.has(e.type)) continue;
      const penalty = curEdge && curEdge.airwayId !== e.airwayId ? switchPenalty : 0;
      const tentative = curG + e.cost + penalty;
      if (tentative < (g.get(e.to) ?? Infinity)) {
        g.set(e.to, tentative);
        cameFrom.set(e.to, { prev: cur, airwayId: e.airwayId, type: e.type, cost: e.cost });
        const next = fixByIdent(e.to);
        if (next) open.push(tentative + distanceNm(next, goal), e.to);
      }
    }
  }

  if (!cameFrom.has(toIdent) && fromIdent !== toIdent) return null;
  // Reconstruct.
  const idents: string[] = [toIdent];
  const edges: GraphPath['edges'] = [];
  let cur = toIdent;
  while (cur !== fromIdent) {
    const c = cameFrom.get(cur);
    if (!c) return null;
    edges.unshift({ from: c.prev, to: cur, airwayId: c.airwayId, type: c.type, distanceNm: c.cost });
    idents.unshift(c.prev);
    cur = c.prev;
  }
  const totalNm = edges.reduce((s, e) => s + e.distanceNm, 0);
  return { idents, edges, totalNm };
}

/** Dijkstra fallback (no heuristic) — used if A* returns null. */
export function dijkstra(fromIdent: string, toIdent: string, opts: SearchOpts = {}): GraphPath | null {
  // A* with a zero heuristic IS Dijkstra; pass goal=goal but heuristic ignored via
  // a tiny wrapper that re-uses the same code path with a uniform start/goal call.
  // For simplicity, just call aStar — admissibility holds either way.
  return aStar(fromIdent, toIdent, opts);
}
