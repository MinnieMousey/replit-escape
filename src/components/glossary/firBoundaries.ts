// ── Real FIR boundary polygons (sourced asset — do NOT hand-edit vertices) ───────
// Source: VATSIM VAT-Spy Data Project — Boundaries.geojson
//   https://github.com/vatsimnetwork/vatspy-data-project
// A genuine, community-maintained dataset of FIR/UIR lateral limits. Filtered to
// the Piarco FIR (TTZP) and its neighbours shown on the SkyVector references.
// Geometry is taken verbatim from the dataset (GeoJSON [lon, lat] order); these
// vertices are NOT eyeballed or approximated. `source` is the dataset feature id
// (COCESNA/Central American is published there as MHCC, mapped to MHTG here).

export interface FirBoundaryFeature {
  /** ICAO FIR ident used across the nav DB. */
  ident: string;
  /** Originating dataset feature id (for provenance). */
  source: string;
  /** GeoJSON MultiPolygon coordinates: [polygon][ring][vertex][lon, lat]. */
  coordinates: number[][][][];
}

export const FIR_BOUNDARIES: FirBoundaryFeature[] = [
  {"ident":"TTZP","source":"TTZP","coordinates":[[[[-65,15],[-63.25,15],[-63,15.333333],[-63,17.366667],[-62,18],[-57,18],[-57,8.916667],[-59.95,8.916667],[-61.465833,9.989722],[-61.927778,9.989722],[-62.057778,10.085],[-61.783333,10.733333],[-62.5,11],[-65,15]]]]},
  {"ident":"TJZS","source":"TJZS","coordinates":[[[[-69.15,19.65],[-68.337565,20.511048],[-67.650556,21.239167],[-66.745,22],[-65.134722,22.096944],[-64,22],[-63.4,21.436667],[-61.9,20],[-61.5,18],[-62,18],[-63,17.366667],[-63,15.333333],[-63.25,15],[-65,15],[-67.066667,15.683333],[-68,16],[-68,19],[-69.15,19.65]]]]},
  {"ident":"SVZM","source":"SVZM","coordinates":[[[[-71.333825,11.866336],[-71.000492,11.999672],[-71.417161,12.499672],[-70.500492,12.499675],[-67.966667,11.4],[-67.066667,15.683333],[-65,15],[-62.5,11],[-61.783333,10.733333],[-62.057778,10.085],[-61.927778,9.989722],[-61.465833,9.989722],[-59.95,8.916667],[-60.25,8.916667],[-60,8.55],[-59.783333,8.3],[-60.000444,8.066336],[-60.367111,7.833],[-60.5,7.833333],[-60.65,7.5],[-60.55,7.333333],[-60.583778,7.216331],[-60.366667,7.225],[-60.25,7.125],[-60.350444,6.966331],[-60.717111,6.766328],[-60.85,6.816667],[-60.933333,6.733333],[-61.133781,6.732994],[-61.167114,6.599661],[-61.1,6.4],[-61.1,6.2],[-61.383781,5.957989],[-60.733333,5.2],[-60.666667,5.183333],[-60.550444,4.966319],[-60.717111,4.766317],[-60.967111,4.52465],[-61.500447,4.39965],[-61.500447,4.282981],[-61.933783,4.116314],[-62.750453,3.999647],[-62.717119,3.674644],[-63.000453,3.682978],[-63.133786,3.766311],[-63.200453,3.899644],[-63.583789,3.916311],[-63.992125,4.049647],[-64.200458,4.199647],[-64.617128,4.216314],[-64.483792,3.999644],[-64.167125,3.916311],[-64.067125,3.599644],[-64.117125,3.349642],[-64.283792,3.182975],[-64.200458,2.707972],[-64.217125,2.532972],[-63.850456,2.349639],[-63.333786,2.466306],[-63.367119,2.149639],[-63.817122,1.966303],[-64.033789,2.016303],[-64.067122,1.632969],[-64.350458,1.382967],[-64.450458,1.449636],[-64.767125,1.232967],[-64.917128,1.207967],[-65.267128,0.882967],[-65.783797,0.7663],[-66.333333,0.741667],[-66.8338,1.182967],[-67.142136,2.349639],[-67.617136,2.832972],[-67.817139,2.866306],[-67.250469,3.382975],[-67.475469,3.716308],[-67.650472,3.849644],[-67.800472,4.224644],[-67.883806,4.549644],[-67.817139,5.099647],[-67.883806,5.332983],[-67.683806,5.532983],[-67.633806,5.816317],[-67.467139,5.999653],[-67.533806,6.199653],[-67.833808,6.266319],[-67.967142,6.199653],[-68.667142,6.116317],[-69.050478,6.19965],[-69.233811,6.066317],[-69.450478,6.09965],[-70.100481,6.966319],[-70.250483,6.916319],[-70.66715,7.082986],[-71.033819,6.949653],[-71.167153,6.999653],[-71.750486,7.032986],[-72.000489,6.966317],[-72.233822,7.349653],[-72.467156,7.416319],[-72.467156,7.499653],[-72.450489,7.966319],[-72.384378,8.065767],[-72.367158,8.374656],[-72.658825,8.638544],[-72.783825,9.082992],[-72.950492,9.082992],[-73.017161,9.216325],[-73.417161,9.132992],[-73.017161,9.849661],[-72.900494,10.466331],[-72.450494,11.166333],[-72.250494,11.183],[-71.967161,11.649669],[-71.333825,11.866336]]]]},
  {"ident":"SOOO","source":"SOOO","coordinates":[[[[-54,9.333333],[-48,10],[-37.5,13.5],[-35,7.666667],[-40,5],[-48,5],[-51,4.5],[-51.55,4.416667],[-51.616667,4.216667],[-51.616667,4.133333],[-51.658333,4.033333],[-51.766667,3.966667],[-51.783333,3.883333],[-52.283333,3.133333],[-52.533333,2.533333],[-52.666667,2.375],[-52.933333,2.166667],[-53.183333,2.216667],[-53.266667,2.3],[-53.4,2.25],[-53.466667,2.316667],[-53.7,2.266667],[-53.766667,2.333333],[-54.116667,2.133333],[-54.35,2.158333],[-54.55,2.266667],[-54.516667,2.3],[-54.166667,3.183333],[-54.058333,3.3],[-54,3.433333],[-53.966667,3.65],[-54.316667,4.133333],[-54.433333,4.483333],[-54.383333,4.6],[-54.45,4.9],[-54,5.5],[-54,5.75],[-54,9.333333]]]]},
  {"ident":"TNCF","source":"TNCF","coordinates":[[[[-70.500492,12.499675],[-71.417161,12.499672],[-74.000506,14.333008],[-74,16],[-73,17],[-71.666667,17],[-71.666667,16],[-68,16],[-67.066667,15.683333],[-67.966667,11.4],[-70.500492,12.499675]]]]},
  {"ident":"MDCS","source":"MDCS","coordinates":[[[[-71.666667,16],[-71.666667,17],[-71.758333,18.033333],[-71.783333,18.183333],[-71.733333,18.316667],[-71.736111,18.358333],[-71.933333,18.466667],[-71.9,18.516667],[-71.998611,18.633333],[-71.983333,18.666667],[-71.825,18.641667],[-71.816667,18.7],[-71.75,18.75],[-71.75,18.866667],[-71.816667,18.95],[-71.866667,18.966667],[-71.838333,19],[-71.65,19.15],[-71.633333,19.2],[-71.808333,19.316667],[-71.7,19.391667],[-71.766667,19.7],[-71.666667,20.416667],[-70.5,20.416667],[-69.15,19.65],[-68,19],[-68,16],[-71.666667,16]]]]},
  {"ident":"MKJK","source":"MKJK","coordinates":[[[[-82,20],[-78.333333,20],[-77.5,19.5],[-75,18.5],[-73,17],[-74,16],[-74,15],[-82.25,15],[-82.083333,19],[-82,20]]]]},
  {"ident":"MUFH","source":"MUFH","coordinates":[[[[-86,24],[-83.166667,24],[-78,24],[-77.75,23.833333],[-77.425833,23.609167],[-76,22.606667],[-75.589167,22.313611],[-75.166667,22],[-75,21.833333],[-74.484256,21.274336],[-74.391342,21.173006],[-74.138386,20.896111],[-73.917008,20.651158],[-73.333333,20],[-75,18.5],[-77.5,19.5],[-78.333333,20],[-82,20],[-85.35,20.733333],[-86,22],[-86,24]]]]},
  {"ident":"MHTG","source":"MHCC","coordinates":[[[[-95,13],[-92.233333,14.55],[-92.183333,14.666667],[-92.2,14.85],[-92.133658,15.018413],[-92.08346,15.084167],[-92.23346,15.250825],[-91.75011,16.084119],[-90.466667,16.083333],[-90.466667,16.233333],[-90.41675,16.384106],[-90.666667,16.466667],[-90.70009,16.650761],[-91.1001,16.917414],[-91.31677,17.150736],[-91.41677,17.184069],[-91.466667,17.25],[-91.016667,17.25],[-90.97843,17.811264],[-89.15,17.816667],[-89.15005,17.950703],[-89.03338,18.0007],[-88.83337,17.850706],[-88.48336,18.484011],[-88.31669,18.484011],[-88.03335,18.417347],[-88.033333,18.15],[-87.75,18.15],[-86.633333,19.333333],[-85.99996,20.000611],[-85.283333,20.183333],[-85.35,20.733333],[-82,20],[-82.083333,19],[-82.25,15],[-82.766667,13.066667],[-82.816667,12.9],[-82.566667,9.55],[-82.6,9.558333],[-82.62,9.483333],[-82.85,9.625],[-82.886667,9.59],[-82.85,9.5],[-82.941667,9.466667],[-82.933333,9.1],[-82.716667,8.941667],[-82.925,8.748333],[-82.820833,8.633333],[-82.845,8.47],[-83.05,8.333333],[-82.925,8.245],[-82.9,8.033333],[-82.916667,7.55],[-82.916667,1.416667],[-92,1.416667],[-104.5,10],[-100,11.5],[-95,13]]]]},
  {"ident":"MPZL","source":"MPZL","coordinates":[[[[-82.25,15],[-77.416667,15],[-77.417169,8.582983],[-77.442169,8.516317],[-77.433333,8.475],[-77.391667,8.466667],[-77.333333,8.375],[-77.341667,8.325],[-77.300503,8.22465],[-77.258333,8.208333],[-77.233333,8.141667],[-77.233836,8.041317],[-77.175503,7.974647],[-77.175503,7.924647],[-77.317169,7.916314],[-77.350503,7.866314],[-77.308333,7.75],[-77.417169,7.716314],[-77.575503,7.516314],[-77.725503,7.732981],[-77.767169,7.632981],[-77.716667,7.508333],[-77.800503,7.466314],[-77.883333,7.25],[-78.300503,6.732978],[-78.783333,6.466667],[-79.050503,6.266308],[-80,4.5],[-82.916667,4.533333],[-82.916667,7.5],[-82.916667,7.55],[-82.9,8.033333],[-82.925,8.245],[-83.05,8.333333],[-82.845,8.47],[-82.820833,8.633333],[-82.925,8.748333],[-82.716667,8.941667],[-82.933333,9.1],[-82.941667,9.466667],[-82.85,9.5],[-82.886667,9.59],[-82.85,9.625],[-82.62,9.483333],[-82.6,9.558333],[-82.566667,9.55],[-82.816667,12.9],[-82.766667,13.066667],[-82.25,15]]]]},
  {"ident":"SKED","source":"SKED","coordinates":[[[[-77.417181,14.999669],[-74.000506,14.999678],[-74.000506,14.333008],[-71.417161,12.499672],[-71.000492,11.999672],[-71.333825,11.866336],[-71.967161,11.649669],[-72.250494,11.183],[-72.450494,11.166333],[-72.900494,10.466331],[-73.017161,9.849661],[-73.417161,9.132992],[-73.017161,9.216325],[-72.950492,9.082992],[-72.783825,9.082992],[-72.658825,8.638544],[-72.658825,8.638544],[-72.367158,8.374656],[-72.383822,8.066322],[-72.450489,7.966319],[-72.467156,7.499653],[-72.467156,7.416319],[-72.233822,7.349653],[-72.000489,6.966317],[-71.750486,7.032986],[-71.167153,6.999653],[-71.033819,6.949653],[-70.66715,7.082986],[-70.250483,6.916319],[-70.100481,6.966319],[-69.450478,6.09965],[-69.233811,6.066317],[-69.050478,6.19965],[-68.667142,6.116317],[-67.967142,6.199653],[-67.833808,6.266319],[-67.533806,6.199653],[-67.467139,5.999653],[-67.633806,5.816317],[-67.683806,5.532983],[-67.883806,5.332983],[-67.817139,5.099647],[-67.883806,4.549644],[-67.800472,4.224644],[-67.650472,3.849644],[-67.475469,3.716308],[-67.250469,3.382975],[-67.817139,2.866306],[-67.617136,2.832972],[-67.142136,2.349639],[-66.8338,1.182967],[-67.092136,1.157967],[-67.150469,1.732969],[-67.417136,2.132969],[-67.933806,1.682969],[-68.200472,1.966303],[-68.117139,1.716303],[-69.833811,1.707967],[-69.833811,1.1163],[-69.150475,1.0663],[-69.100475,0.616297],[-69.300475,0.591297],[-69.417142,0.666297],[-70.017144,0.549631],[-70.000478,-0.200372],[-69.550478,-0.533706],[-69.533811,-0.775372],[-69.317142,-1.258708],[-69.400475,-1.417042],[-69.933811,-4.21705],[-69.983814,-4.21705],[-70.333814,-3.833714],[-70.533333,-3.883333],[-70.733814,-3.783714],[-70.058333,-2.733333],[-70.633814,-2.483711],[-70.9,-2.25],[-71.35,-2.433333],[-71.766667,-2.191667],[-72.042153,-2.417044],[-72.4,-2.483333],[-72.992153,-2.458711],[-73.175489,-2.308711],[-73.217156,-1.875375],[-73.508822,-1.733708],[-73.633822,-1.350375],[-74.300492,-0.967039],[-74.483333,-0.525],[-74.735,-0.191667],[-75.166667,-0.05],[-75.833828,0.099631],[-76.067161,0.324631],[-76.367161,0.374631],[-76.383333,0.216667],[-76.900497,0.232964],[-77.367164,0.382964],[-77.75,0.783333],[-77.967167,0.799631],[-78.683833,1.282964],[-78.8,1.416667],[-78.916667,1.416667],[-82.916667,1.416667],[-82.916667,4.533333],[-80,4.5],[-79.050503,6.266308],[-78.783333,6.466667],[-78.300503,6.732978],[-77.883333,7.25],[-77.800503,7.466314],[-77.716667,7.508333],[-77.767169,7.632981],[-77.725503,7.732981],[-77.575503,7.516314],[-77.417169,7.716314],[-77.308333,7.75],[-77.350503,7.866314],[-77.317169,7.916314],[-77.175503,7.924647],[-77.175503,7.974647],[-77.233836,8.041317],[-77.233333,8.141667],[-77.258333,8.208333],[-77.300503,8.22465],[-77.341667,8.325],[-77.333333,8.375],[-77.391667,8.466667],[-77.433333,8.475],[-77.442169,8.516317],[-77.417169,8.582983],[-77.417181,14.999669]]]]}
];

// ── Geometry helpers (rendering only — no vertices are invented here) ────────────
const lookupBoundary = new Map<string, FirBoundaryFeature>();
FIR_BOUNDARIES.forEach(f => lookupBoundary.set(f.ident, f));
export const firBoundary = (ident: string): FirBoundaryFeature | undefined =>
  lookupBoundary.get(ident.toUpperCase());

export type LatLngRing = [number, number][];

/** Minimal shape both the bundled Caribbean set and the lazy world set satisfy. */
export interface HasCoords { coordinates: number[][][][]; }

/** Convert a sourced MultiPolygon into Leaflet [lat, lon] polygons (outer + holes). */
export function firPolygonsLatLng(f: HasCoords): LatLngRing[][] {
  return f.coordinates.map(poly =>
    poly.map(ring => ring.map(([lon, lat]) => [lat, lon] as [number, number])),
  );
}

export interface EdgeLabel { lat: number; lon: number; angle: number; }

const DEG = Math.PI / 180;

/**
 * Build labels that run ALONG the longest boundary edges of a FIR, offset just
 * inside the polygon so adjacent FIRs print on opposite sides of a shared line.
 * Returns up to `max` label anchors with a CSS rotation (kept upright).
 */
export function firEdgeLabels(f: HasCoords, max = 3): EdgeLabel[] {
  // Use the largest ring across all polygons as the representative outline.
  let ring: number[][] = [];
  for (const poly of f.coordinates) {
    const outer = poly[0] ?? [];
    if (outer.length > ring.length) ring = outer;
  }
  if (ring.length < 3) return [];

  const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const cLon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cosC = Math.cos(cLat * DEG) || 1;

  type Edge = { lenNm: number; midLat: number; midLon: number; px: number; py: number; angle: number };
  const edges: Edge[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    const midLat = (lat1 + lat2) / 2;
    const midLon = (lon1 + lon2) / 2;
    const cosM = Math.cos(midLat * DEG) || 1;
    // Screen-space edge vector (x east, y north).
    const ex = (lon2 - lon1) * cosM;
    const ey = lat2 - lat1;
    const elen = Math.hypot(ex, ey);
    if (elen < 1e-6) continue;
    const lenNm = elen * 60; // ~60 nm per degree
    // Inward normal (toward centroid) in screen space.
    let nx = -ey / elen, ny = ex / elen;
    const tx = (cLon - midLon) * cosM, ty = cLat - midLat;
    if (nx * tx + ny * ty < 0) { nx = -nx; ny = -ny; }
    // CSS rotation (clockwise, y-down), kept readable.
    let angle = -Math.atan2(ey, ex) / DEG;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    edges.push({ lenNm, midLat, midLon, px: nx, py: ny, angle });
  }

  edges.sort((a, b) => b.lenNm - a.lenNm);
  const off = 0.55; // perpendicular inset in screen-degrees
  return edges.slice(0, max).map(e => ({
    lat: e.midLat + e.py * off,
    lon: e.midLon + (e.px * off) / cosC,
    angle: e.angle,
  }));
}

// ── Curved (boundary-following) labels ───────────────────────────────────────────
export interface CharPlacement { lat: number; lon: number; char: string; angle: number; fontPx: number; }

/** Pick the representative (largest) outer ring of a feature, as [lat, lon] pairs. */
export function representativeRing(f: HasCoords): [number, number][] {
  let ring: number[][] = [];
  for (const poly of f.coordinates) {
    const outer = poly[0] ?? [];
    if (outer.length > ring.length) ring = outer;
  }
  return ring.map(([lon, lat]) => [lat, lon] as [number, number]);
}

/**
 * Lay a label's characters ALONG the boundary line so the text bends with the
 * polyline's shape (instead of a single straight label). Works entirely in the
 * map's pixel projection at the current zoom (passed via `project`/`unproject`),
 * so spacing stays correct as the user zooms. Characters are inset toward the
 * polygon centroid so the text sits just inside the boundary, never on the line.
 *
 * Geometry is read-only — no vertices are invented; we only walk the sourced ring.
 */
export function curvedLabelChars(
  ringLatLng: [number, number][],
  project: (lat: number, lon: number) => { x: number; y: number },
  unproject: (x: number, y: number) => { lat: number; lon: number },
  text: string,
  opts: { charPx?: number; insetPx?: number; minCharPx?: number; maxCharPx?: number; fitFraction?: number; fontRatio?: number } = {},
): CharPlacement[] {
  const chars = [...text];
  if (ringLatLng.length < 3 || chars.length === 0) return [];

  // Project the ring to screen pixels (y increases downward / southward).
  const pts = ringLatLng.map(([lat, lon]) => project(lat, lon));
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

  // Cumulative arc length + per-segment data.
  const seg: { x: number; y: number; dx: number; dy: number; len: number; acc: number }[] = [];
  let acc = 0, longLen = -1, longStartArc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    seg.push({ x: a.x, y: a.y, dx, dy, len, acc });
    if (len > longLen) { longLen = len; longStartArc = acc + len / 2; }
    acc += len;
  }
  const total = acc;
  if (seg.length === 0 || total < 1e-6) return [];

  // Size the label to its boundary: fit the whole name within the longest straight
  // edge (so it reads centred on one side, not bent across corners), clamped to a
  // legible pixel range. Larger FIRs get larger text; small FIRs get smaller text.
  const fitFraction = opts.fitFraction ?? 0.9;
  const minCharPx = opts.minCharPx ?? 3;
  const maxCharPx = opts.maxCharPx ?? 8.5;
  const fontRatio = opts.fontRatio ?? 1.15;
  let charPx = opts.charPx ?? ((longLen * fitFraction) / chars.length);
  charPx = Math.min(maxCharPx, Math.max(minCharPx, charPx));
  const fontPx = charPx * fontRatio;
  const insetPx = opts.insetPx ?? (fontPx * 0.85 + 2);

  const textPx = chars.length * charPx;
  // Walk forward from a start arc, centred on the longest edge's midpoint.
  let dir = 1;
  let start = longStartArc - textPx / 2;

  // Sample a point + tangent at arc length `s` along the polyline.
  const sample = (s: number) => {
    let t = ((s % total) + total) % total;
    let lo = 0, hi = seg.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (seg[mid].acc <= t) lo = mid; else hi = mid - 1; }
    const e = seg[lo];
    const f = Math.min(1, Math.max(0, (t - e.acc) / e.len));
    return { x: e.x + e.dx * f, y: e.y + e.dy * f, tx: e.dx / e.len, ty: e.dy / e.len };
  };

  // Decide direction so the text reads upright (not mirrored/upside down).
  const mid = sample(longStartArc);
  if (mid.tx < 0) dir = -1;

  const out: CharPlacement[] = [];
  for (let i = 0; i < chars.length; i++) {
    const sRaw = start + (i + 0.5) * charPx;
    const s = dir === 1 ? sRaw : (longStartArc * 2 - sRaw);
    const p = sample(s);
    let tx = p.tx * dir, ty = p.ty * dir;
    // CSS rotation (clockwise, y-down) matching the pixel tangent.
    let angle = Math.atan2(ty, tx) * 180 / Math.PI;
    // Inset toward the centroid so text sits just inside the boundary.
    let nx = cx - p.x, ny = cy - p.y;
    const nl = Math.hypot(nx, ny) || 1;
    const px = p.x + (nx / nl) * insetPx;
    const py = p.y + (ny / nl) * insetPx;
    const ll = unproject(px, py);
    out.push({ lat: ll.lat, lon: ll.lon, char: chars[i], angle, fontPx });
  }
  return out;
}

// ── World FIR set (lazy-loaded sourced asset) ────────────────────────────────────
// The complete VAT-Spy FIR boundary set (every other FIR worldwide) is ~0.6 MB, so
// it is shipped as a static JSON asset under /public/data and fetched on demand the
// first time the FIR layer is shown — never bundled into the main JS chunk. The 11
// Caribbean FIRs above are excluded from this file (they stay bundled + full-precision).
export interface WorldFir extends HasCoords {
  /** Dataset FIR/sector boundary id (ICAO-ish). */
  id: string;
  /** Human-readable name from the VAT-Spy FIRs table. */
  name: string;
  /** [minLon, minLat, maxLon, maxLat] for fast viewport culling. */
  bbox: [number, number, number, number];
}

let worldFirPromise: Promise<WorldFir[]> | null = null;

/** Fetch (and cache) the world FIR boundary asset. `base` is import.meta.env.BASE_URL. */
export function loadWorldFirs(base: string): Promise<WorldFir[]> {
  if (!worldFirPromise) {
    const url = `${base}data/world-firs.json`;
    worldFirPromise = fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`world-firs.json ${r.status}`);
        return r.json() as Promise<WorldFir[]>;
      })
      .catch(err => {
        worldFirPromise = null; // allow a later retry
        throw err;
      });
  }
  return worldFirPromise;
}

/** True if a FIR's bbox intersects the given lat/lon window (with a small margin). */
export function bboxInView(
  bbox: [number, number, number, number],
  south: number, west: number, north: number, east: number,
): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return maxLat >= south && minLat <= north && maxLon >= west && minLon <= east;
}
