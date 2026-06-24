// ── WGS84 great-circle helpers ──────────────────────────────────────────────
// Spherical-Earth approximation tuned for nav-grade flight planning. WGS84
// ellipsoid differences are << 0.5% for distances under a few thousand NM,
// which is well below the accuracy of the seeded fix coordinates.

export interface LatLon { lat: number; lon: number; }

const R_NM = 3440.065; // Earth radius in nautical miles (mean WGS84)
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function distanceNm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingTrue(a: LatLon, b: LatLon): number {
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function midpoint(a: LatLon, b: LatLon): LatLon {
  const la1 = toRad(a.lat), lo1 = toRad(a.lon);
  const la2 = toRad(b.lat), lo2 = toRad(b.lon);
  const dLon = lo2 - lo1;
  const Bx = Math.cos(la2) * Math.cos(dLon);
  const By = Math.cos(la2) * Math.sin(dLon);
  const la3 = Math.atan2(Math.sin(la1) + Math.sin(la2),
    Math.sqrt((Math.cos(la1) + Bx) ** 2 + By ** 2));
  const lo3 = lo1 + Math.atan2(By, Math.cos(la1) + Bx);
  return { lat: toDeg(la3), lon: ((toDeg(lo3) + 540) % 360) - 180 };
}

/** Densify a leg into N points along the great circle so it bends correctly. */
export function greatCircleLine(a: LatLon, b: LatLon, segs = 32): LatLon[] {
  const la1 = toRad(a.lat), lo1 = toRad(a.lon);
  const la2 = toRad(b.lat), lo2 = toRad(b.lon);
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2,
  ));
  if (!isFinite(d) || d < 1e-9) return [{ ...a }, { ...b }];
  const n = Math.max(2, Math.min(96, segs));
  const out: LatLon[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    out.push({
      lat: toDeg(Math.atan2(z, Math.hypot(x, y))),
      lon: toDeg(Math.atan2(y, x)),
    });
  }
  return out;
}
