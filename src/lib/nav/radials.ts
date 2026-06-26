// ── VOR compass-rose overlay ────────────────────────────────────────────────
// Builds a small SkyVector-style compass rose at every VOR/VORDME: a ring,
// short ticks every 10°, longer ticks every 30°, and degree labels at the
// 30° marks. Output is plain GeoJSON suitable for MapLibre line + symbol
// layers — see RouteTab.tsx for wiring.

import { NAVAIDS } from './db';

const R_NM = 3440.065;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Destination point from `start` after travelling `dNm` along true bearing `brg`. */
function destination(lat: number, lon: number, brg: number, dNm: number) {
  const d = dNm / R_NM;
  const br = toRad(brg);
  const la1 = toRad(lat);
  const lo1 = toRad(lon);
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(
    Math.sin(br) * Math.sin(d) * Math.cos(la1),
    Math.cos(d) - Math.sin(la1) * Math.sin(la2),
  );
  return [((toDeg(lo2) + 540) % 360) - 180, toDeg(la2)] as [number, number];
}

/** Radius of the rose in nautical miles. Small enough to feel local at z≥7. */
const ROSE_RADIUS_NM = 10;
const TICK_SHORT_NM = 1.2;
const TICK_LONG_NM = 2.4;

type Line = { type: 'Feature'; geometry: { type: 'LineString'; coordinates: [number, number][] }; properties: Record<string, unknown> };
type Pt = { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: Record<string, unknown> };

let cachedRings: { type: 'FeatureCollection'; features: Line[] } | null = null;
let cachedTicks: { type: 'FeatureCollection'; features: Line[] } | null = null;
let cachedLabels: { type: 'FeatureCollection'; features: Pt[] } | null = null;

function build() {
  const rings: Line[] = [];
  const ticks: Line[] = [];
  const labels: Pt[] = [];

  for (const n of NAVAIDS) {
    if (n.type === 'NDB') continue; // VOR/VORDME only

    // Outer ring (72 segments).
    const ring: [number, number][] = [];
    for (let i = 0; i <= 72; i++) ring.push(destination(n.lat, n.lon, i * 5, ROSE_RADIUS_NM));
    rings.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: ring },
      properties: { ident: n.ident },
    });

    // Tick marks every 10°, long every 30°.
    for (let brg = 0; brg < 360; brg += 10) {
      const long = brg % 30 === 0;
      const inner = destination(n.lat, n.lon, brg, ROSE_RADIUS_NM - (long ? TICK_LONG_NM : TICK_SHORT_NM));
      const outer = destination(n.lat, n.lon, brg, ROSE_RADIUS_NM);
      ticks.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [inner, outer] },
        properties: { ident: n.ident, brg, long },
      });

      if (long) {
        const lbl = destination(n.lat, n.lon, brg, ROSE_RADIUS_NM + 1.5);
        labels.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: lbl },
          properties: {
            ident: n.ident,
            brg,
            label: brg.toString().padStart(3, '0'),
          },
        });
      }
    }
  }

  cachedRings = { type: 'FeatureCollection', features: rings };
  cachedTicks = { type: 'FeatureCollection', features: ticks };
  cachedLabels = { type: 'FeatureCollection', features: labels };
}

export function vorRoseRings() { if (!cachedRings) build(); return cachedRings!; }
export function vorRoseTicks() { if (!cachedTicks) build(); return cachedTicks!; }
export function vorRoseLabels() { if (!cachedLabels) build(); return cachedLabels!; }
