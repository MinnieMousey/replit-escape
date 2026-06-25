// ── FIR / airspace utilities ────────────────────────────────────────────────
// Point-in-polygon + transition detection driven by the bundled FIR_BOUNDARIES
// dataset. Used by the route planner to annotate each leg with the FIRs it
// enters and exits, and by the MapLibre layer to render boundary polygons +
// labels.

import { FIR_BOUNDARIES, FIR_META, firDisplayName, firTier, type FirBoundaryFeature } from '@/components/glossary/firBoundaries';

export { FIR_BOUNDARIES, FIR_META, firDisplayName, firTier };
export type { FirBoundaryFeature };

/** Ray-cast point-in-polygon for a single ring `[lon, lat][]`. */
function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Even-odd polygon test with holes: outer ring contains, holes exclude. */
function pointInPolygon(lon: number, lat: number, poly: number[][][]): boolean {
  if (!poly.length || !pointInRing(lon, lat, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) if (pointInRing(lon, lat, poly[i])) return false;
  return true;
}

/** All FIR/oceanic idents that contain the given lon/lat (multi-polygon aware). */
export function firsContainingPoint(lon: number, lat: number): string[] {
  const out: string[] = [];
  for (const f of FIR_BOUNDARIES) {
    if (out.includes(f.ident)) continue;
    for (const poly of f.coordinates) {
      if (pointInPolygon(lon, lat, poly)) { out.push(f.ident); break; }
    }
  }
  return out;
}

export interface FirTransition {
  /** Ident the route exits at this point (may be undefined for the start). */
  from?: string;
  /** Ident the route enters (may be undefined when exiting all coverage). */
  to?: string;
  lat: number;
  lon: number;
}

/**
 * Walk a great-circle / airway path point-by-point and emit transitions when
 * the containing-FIR set changes. The first sample seeds the "current" set;
 * subsequent changes log an exit/enter pair at the boundary crossing.
 */
export function detectFirTransitions(path: { lat: number; lon: number }[]): FirTransition[] {
  if (path.length < 2) return [];
  const out: FirTransition[] = [];
  let prev = firsContainingPoint(path[0].lon, path[0].lat);
  for (let i = 1; i < path.length; i++) {
    const here = firsContainingPoint(path[i].lon, path[i].lat);
    // Emit transitions for each ident that left or entered the set.
    for (const left of prev) {
      if (!here.includes(left)) {
        out.push({ from: left, to: here.find(h => !prev.includes(h)), lat: path[i].lat, lon: path[i].lon });
      }
    }
    for (const entered of here) {
      if (!prev.includes(entered) && !out.some(t => t.lat === path[i].lat && t.to === entered)) {
        // entered without a corresponding exit (rare gap between FIRs)
        out.push({ to: entered, lat: path[i].lat, lon: path[i].lon });
      }
    }
    prev = here;
  }
  return out;
}
