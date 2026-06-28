// ── Pure-JS spherical-Earth helpers for the Leaflet planner ─────────────────
// Haversine distance, km↔NM, and a great-circle interpolator that returns
// a polyline-ready array of [lat, lon] tuples.

export interface LatLon { lat: number; lon: number; }

const R_KM = 6371.0088;
const KM_TO_NM = 0.539957;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const kmToNm = (km: number): number => km * KM_TO_NM;

/** Slerp on the unit sphere — returns `segments+1` [lat, lon] points. */
export function greatCirclePoints(a: LatLon, b: LatLon, segments = 64): [number, number][] {
  const la1 = toRad(a.lat), lo1 = toRad(a.lon);
  const la2 = toRad(b.lat), lo2 = toRad(b.lon);
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((la2 - la1) / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2,
  ));
  if (!isFinite(d) || d < 1e-9) return [[a.lat, a.lon], [b.lat, b.lon]];
  const n = Math.max(2, Math.min(256, segments));
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    out.push([
      toDeg(Math.atan2(z, Math.hypot(x, y))),
      toDeg(Math.atan2(y, x)),
    ]);
  }
  return out;
}
