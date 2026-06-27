// ── FIR boundary-junction label points ──────────────────────────────────────
// For each pair of FIRs that share (or nearly share) vertices, emit a label
// point at the midpoint of that shared edge. Renders `TTZP / PIARCO` style
// callouts at the line where two FIRs meet so the user sees both idents at
// the crossing point.

import { FIR_BOUNDARIES, firDisplayName } from '@/components/glossary/firBoundaries';

export interface FirEdgeLabel {
  lon: number;
  lat: number;
  ident: string;      // "TTZP / TJZS"
  primary: string;    // "TTZP"
  other: string;      // "TJZS"
  name: string;       // "PIARCO / SAN JUAN"
}

const TOL = 0.05; // ≈ 5 km vertex match tolerance
const near = (a: number[], b: number[]) =>
  Math.abs(a[0] - b[0]) < TOL && Math.abs(a[1] - b[1]) < TOL;

let CACHE: FirEdgeLabel[] | null = null;

function collectOuterRings(): { ident: string; ring: number[][] }[] {
  const out: { ident: string; ring: number[][] }[] = [];
  for (const f of FIR_BOUNDARIES) {
    for (const poly of f.coordinates) {
      if (poly[0]?.length) out.push({ ident: f.ident, ring: poly[0] });
    }
  }
  return out;
}

export function firEdgeLabels(): FirEdgeLabel[] {
  if (CACHE) return CACHE;
  const rings = collectOuterRings();
  const out: FirEdgeLabel[] = [];
  const seen = new Set<string>(); // dedupe per FIR pair

  for (let i = 0; i < rings.length; i++) {
    for (let j = i + 1; j < rings.length; j++) {
      const a = rings[i], b = rings[j];
      if (a.ident === b.ident) continue;
      const pairKey = [a.ident, b.ident].sort().join('|');
      // Find a run of shared vertices.
      const shared: number[][] = [];
      for (const va of a.ring) {
        for (const vb of b.ring) {
          if (near(va, vb)) { shared.push(va); break; }
        }
      }
      if (shared.length < 2) continue;
      // Midpoint of the shared run.
      const mid = shared[Math.floor(shared.length / 2)];
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      out.push({
        lon: mid[0], lat: mid[1],
        primary: a.ident, other: b.ident,
        ident: `${a.ident} / ${b.ident}`,
        name: `${firDisplayName(a.ident)} / ${firDisplayName(b.ident)}`,
      });
    }
  }
  CACHE = out;
  return out;
}

export function firEdgeLabelsGeo() {
  return {
    type: 'FeatureCollection' as const,
    features: firEdgeLabels().map(l => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [l.lon, l.lat] },
      properties: {
        idents: `${l.primary}\n${l.other}`,
        names: `${l.name.split(' / ')[0]}\n${l.name.split(' / ')[1] ?? ''}`,
      },
    })),
  };
}
