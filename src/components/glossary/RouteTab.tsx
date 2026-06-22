import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polyline, Polygon, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet';
import {
  NAVAIDS, FIXES, AIRWAYS, AERODROMES, BOUNDARY_POINTS, BOUNDARY_LINES, FIRS,
  NavPoint, lookupPoint, lookupFir, MAG_VAR_W,
  shortestRouteLink, RouteLink,
} from './navdb';
import { EXT_POINTS } from './navdbExtended';
import {
  FIR_BOUNDARIES, firPolygonsLatLng, firEdgeLabels,
  representativeRing, curvedLabelChars,
  loadWorldFirs, bboxInView, WorldFir,
} from './firBoundaries';
import { parseRoute, RouteResult, RouteLeg, fmtDeg, fmtDist } from './routeParser';
import { ChartPopout } from './ChartPopout';

// Aerodrome ICAO → NavPoint resolution (kind 'AD' only) for the Dep/Dest fields.
const AD_BY_ICAO = new Map(AERODROMES.map(a => [a.ident.toUpperCase(), a] as const));
const lookupAerodrome = (icao: string): NavPoint | undefined => AD_BY_ICAO.get(icao.trim().toUpperCase());

// FIR ident → display name (e.g. "PIARCO FIR (TTZP)") for boundary labels.
const FIR_NAME_BY_IDENT = new Map(FIRS.map(f => [f.ident, f.name] as const));
const firLabelText = (ident: string) =>
  `${(FIR_NAME_BY_IDENT.get(ident) ?? ident).toUpperCase()} (${ident})`;

// Idents that have a real sourced polygon (so we skip their centre-anchor label).
const POLY_IDENTS = new Set(FIR_BOUNDARIES.map(f => f.ident));

const SAVED_ROUTES_KEY = 'ais-shift-saved-routes';
interface SavedRoute { id: string; name: string; route: string; timestamp: number; }

// Distinct colours for compared (overlaid) routes; the active route is always sky.
const ACTIVE_COLOR = '#38bdf8';
const COMPARE_COLORS = ['#f59e0b', '#a78bfa', '#34d399', '#f472b6', '#facc15', '#fb7185'];

const EXAMPLES = [
  'BGI DCT BNE DCT TJZS',   // VOR → VOR → San Juan Oceanic FIR (region marker)
  'BGI A632 PTR',           // Adams VOR via A632 to Piarco VOR
  'BNE G642 BGI A632 ANU',  // VOR-led airway chain across the TMA
  'SV A511 BGI DCT TTZP',   // Argyle VOR via A511 to BGI, into the Piarco FIR
  'GND A561 BGI DCT SLU',   // Grenada VOR → BGI → George Charles NDB
  'BGI A632 BNE',           // error: BNE not on A632
];

// ── Geometry / summary helpers ──────────────────────────────────────────────────
const routeTotalNm = (r: RouteResult) =>
  r.legs.reduce((sum, l) => (l.ok ? sum + l.distanceNm : sum), 0);

interface FirSummary {
  origin?: string;
  dest?: string;
  crossings: { ident: string; firs: string; interFir: boolean }[];
}
function firSummary(r: RouteResult): FirSummary {
  const pts = r.routePoints;
  const ends = pts.filter(p => p.kind === 'AD');
  const origin = ends[0]?.fir;
  const dest = ends.length > 1 ? ends[ends.length - 1]?.fir : undefined;
  const crossings = pts
    .filter(p => p.kind === 'BDY' && p.between)
    .map(p => {
      const interFir = p.between![0] !== p.between![1];
      return {
        ident: p.ident,
        firs: interFir ? `${p.between![0]} / ${p.between![1]}` : `${p.between![0]} sector edge`,
        interFir,
      };
    });
  return { origin, dest, crossings };
}

// Format decimal hours as h:mm (estimated time en-route).
const fmtHM = (hours: number) => {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// Barbados keeps AST year-round (UTC−4, no DST). Convert a 'HHMM' Zulu string to local.
const zuluToLocalAst = (hhmm: string): string | null => {
  const m = hhmm.trim().match(/^(\d{2})(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  let total = h * 60 + min - 240; // UTC−4
  let dayOff = '';
  if (total < 0) { total += 1440; dayOff = ' (−1d)'; }
  return `${String(Math.floor(total / 60)).padStart(2, '0')}${String(total % 60).padStart(2, '0')}${dayOff}`;
};

// ── Map control children (need the Leaflet map instance) ─────────────────────────
const InvalidateOnMount: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(id);
  }, [map]);
  return null;
};

const FitController: React.FC<{ bounds: L.LatLngBoundsExpression | null; nonce: number }> = ({ bounds, nonce }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// Reports the current view window (south, west, north, east) + zoom so the world
// FIR layer can render only what is on-screen instead of all ~450 polygons at once.
const BoundsWatcher: React.FC<{ onChange: (b: { s: number; w: number; n: number; e: number; zoom: number }) => void }> = ({ onChange }) => {
  const map = useMap();
  useEffect(() => {
    const emit = () => {
      const b = map.getBounds();
      onChange({ s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast(), zoom: map.getZoom() });
    };
    emit();
    map.on('moveend zoomend', emit);
    return () => { map.off('moveend zoomend', emit); };
  }, [map, onChange]);
  return null;
};

const textIcon = (text: string, cls: string) =>
  L.divIcon({ html: `<span>${text}</span>`, className: cls, iconSize: [0, 0], iconAnchor: [0, 0] });

// Label rotated to follow a line (boundary edge / airway), kept centred on its anchor.
const rotatedIcon = (text: string, cls: string, angle: number, fontPx?: number) =>
  L.divIcon({
    html: `<span style="transform:translate(-50%,-50%) rotate(${angle}deg);${fontPx ? `font-size:${fontPx.toFixed(2)}px;` : ''}">${text}</span>`,
    className: cls, iconSize: [0, 0], iconAnchor: [0, 0],
  });

// Anchor + rotation for an airway designator: midpoint of the longest segment,
// angled to follow that segment (kept upright).
const airwayLabel = (pts: NavPoint[]): { lat: number; lon: number; angle: number } | null => {
  let best = -1, bi = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const cosM = Math.cos(((pts[i].lat + pts[i + 1].lat) / 2) * Math.PI / 180) || 1;
    const dx = (pts[i + 1].lon - pts[i].lon) * cosM;
    const dy = pts[i + 1].lat - pts[i].lat;
    const len = dx * dx + dy * dy;
    if (len > best) { best = len; bi = i; }
  }
  const a = pts[bi], b = pts[bi + 1];
  if (!a || !b) return null;
  const cosM = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180) || 1;
  let angle = -Math.atan2(b.lat - a.lat, (b.lon - a.lon) * cosM) * 180 / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2, angle };
};

// Pans/zooms the map to a single point (used when only one ICAO endpoint resolves).
const LocateController: React.FC<{ target: { lat: number; lon: number } | null; nonce: number }> = ({ target, nonce }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lon], Math.max(map.getZoom(), 7), { animate: true });
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// Zoom-reactive curved FIR labels: lays each character along the boundary polyline so
// the name follows the boundary's shape (inset just inside the polygon). Recomputed on
// zoom because spacing/curvature are derived in the current pixel projection. Limited to
// the bundled (sourced) FIR set so per-character markers stay cheap.
const CurvedFirLabels: React.FC<{ cls: string; charPx?: number; maxCharPx?: number; fontRatio?: number }> = ({ cls, charPx, maxCharPx, fontRatio }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => { map.off('zoomend', onZoom); };
  }, [map]);

  const rings = useMemo(
    () => FIR_BOUNDARIES.map(f => ({ key: f.ident, ring: representativeRing(f), text: firLabelText(f.ident) })),
    [],
  );

  const placements = useMemo(() => {
    const project = (lat: number, lon: number) => { const p = map.project([lat, lon], zoom); return { x: p.x, y: p.y }; };
    const unproject = (x: number, y: number) => { const ll = map.unproject([x, y], zoom); return { lat: ll.lat, lon: ll.lng }; };
    return rings.map(r => ({ key: r.key, chars: curvedLabelChars(r.ring, project, unproject, r.text, { charPx, maxCharPx, fontRatio }) }));
  }, [rings, zoom, map, charPx, maxCharPx, fontRatio]);

  return (
    <>
      {placements.flatMap(r =>
        r.chars.map((c, i) => (
          <Marker
            key={`cfl-${r.key}-${i}`}
            position={[c.lat, c.lon]}
            interactive={false}
            icon={rotatedIcon(c.char === ' ' ? '\u00a0' : c.char, cls, c.angle, c.fontPx)}
          />
        )),
      )}
    </>
  );
};

// ── The geographic map ───────────────────────────────────────────────────────────
type Basemap = 'dark' | 'light';
// Map mode = flight-level band shown. VFR shows aerodromes/navaids/NDBs with no
// airway structure; IFR-Low shows lower/conventional airways; IFR-High the upper
// (Jet) network. Airways are filtered by their sourced altitude band.
type MapMode = 'vfr' | 'low' | 'high';
const MODE_BTNS: { key: MapMode; label: string; title: string }[] = [
  { key: 'vfr',  label: 'VFR',      title: 'Visual — aerodromes, navaids & NDBs; no airway structure shown' },
  { key: 'low',  label: 'IFR Low',  title: 'Lower / conventional airways (low altitude band)' },
  { key: 'high', label: 'IFR High', title: 'Upper / Jet airways (high altitude band)' },
];
interface Layers { aerodromes: boolean; navaids: boolean; fixes: boolean; airways: boolean; firs: boolean; labels: boolean; }

// Split the sourced regional network points by kind for layered rendering.
const EXT_NAVAIDS = EXT_POINTS.filter(p => p.kind === 'VOR');
const EXT_NDBS = EXT_POINTS.filter(p => p.kind === 'NDB');
const EXT_FIXES = EXT_POINTS.filter(p => p.kind === 'FIX');

const TILES: Record<Basemap, { url: string; attribution: string; bg: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    bg: '#0b1220',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    bg: '#cfe6f2',
  },
};

const RouteGeoMap: React.FC<{
  active: RouteResult;
  compared: { id: string; name: string; result: RouteResult; color: string }[];
  layers: Layers;
  basemap: Basemap;
  mapMode: MapMode;
  fitBounds: L.LatLngBoundsExpression | null;
  fitNonce: number;
  icaoLink?: RouteLink | null;
  icaoEnds?: { dep?: NavPoint; dest?: NavPoint };
  locate?: { lat: number; lon: number } | null;
  locateNonce?: number;
  heightCss?: string;
}> = ({ active, compared, layers, basemap, mapMode, fitBounds, fitNonce, icaoLink, icaoEnds, locate, locateNonce = 0, heightCss = 'clamp(360px, 62vh, 640px)' }) => {
  const drawnAirway = new Set<string>();
  const activeIdents = new Set(active.routePoints.map(p => p.ident));

  // Airways shown depend on the map mode: VFR hides the airway structure entirely;
  // IFR-High keeps only the upper band; IFR-Low keeps the lower band (undefined band
  // is treated as lower/conventional).
  const visibleAirways = useMemo(
    () => mapMode === 'vfr' ? [] : AIRWAYS.filter(a => mapMode === 'high' ? a.band === 'upper' : a.band !== 'upper'),
    [mapMode],
  );

  // Route junctions: navaids where two or more airways with DISTINCT tracks meet —
  // i.e. the points a flight can be transferred from one route onto another. Airways
  // that share an identical point sequence (e.g. A511/A312) are not a real transfer,
  // so junction status is keyed by distinct track signature. Derived purely from the
  // sourced airway membership; no geometry is invented.
  const junctions = useMemo(() => {
    const at = new Map<string, { ids: Set<string>; tracks: Set<string> }>();
    visibleAirways.forEach(a => {
      const sig = a.points.join('>');
      a.points.forEach(id => {
        if (!at.has(id)) at.set(id, { ids: new Set(), tracks: new Set() });
        const e = at.get(id)!;
        e.ids.add(a.id);
        e.tracks.add(sig);
      });
    });
    return [...at.entries()]
      .filter(([, e]) => e.tracks.size >= 2)
      .map(([id, e]) => ({ pt: lookupPoint(id), ids: [...e.ids].sort() }))
      .filter((j): j is { pt: NavPoint; ids: string[] } => !!j.pt);
  }, [visibleAirways]);
  const tiles = TILES[basemap];
  const firCls = basemap === 'light' ? 'ais-fir ais-fir-l' : 'ais-fir';
  const worldCls = basemap === 'light' ? 'ais-fir ais-fir-w ais-fir-l' : 'ais-fir ais-fir-w';

  // World FIR set: lazy-loaded the first time the FIR layer is shown, then culled
  // to the current viewport so only on-screen polygons/labels are ever rendered.
  const [worldFirs, setWorldFirs] = useState<WorldFir[]>([]);
  const [view, setView] = useState<{ s: number; w: number; n: number; e: number; zoom: number } | null>(null);
  useEffect(() => {
    if (!layers.firs || worldFirs.length) return;
    let alive = true;
    loadWorldFirs(import.meta.env.BASE_URL)
      .then(d => { if (alive) setWorldFirs(d); })
      .catch(() => { /* asset missing → silently fall back to bundled FIRs only */ });
    return () => { alive = false; };
  }, [layers.firs, worldFirs.length]);

  const POLY_CAP = 280;  // hard ceiling on rendered world polygons (perf guard)
  const LABEL_CAP = 60;  // hard ceiling on world FIR name labels
  const visibleWorld = useMemo(() => {
    if (!layers.firs || !view || !worldFirs.length) return [];
    const inView = worldFirs.filter(f => bboxInView(f.bbox, view.s, view.w, view.n, view.e));
    if (inView.length <= POLY_CAP) return inView;
    // Too many on-screen (zoomed far out): keep those nearest the view centre.
    const cy = (view.s + view.n) / 2, cx = (view.w + view.e) / 2;
    const d = (f: WorldFir) => {
      const mx = (f.bbox[0] + f.bbox[2]) / 2, my = (f.bbox[1] + f.bbox[3]) / 2;
      return (mx - cx) ** 2 + (my - cy) ** 2;
    };
    return [...inView].sort((a, b) => d(a) - d(b)).slice(0, POLY_CAP);
  }, [layers.firs, view, worldFirs]);
  // Labels only when the screen isn't too crowded and we're zoomed in enough to read them.
  const worldLabels = view && view.zoom >= 4 ? visibleWorld.slice(0, LABEL_CAP) : [];
  const worldText = (f: WorldFir) => `${f.name.toUpperCase()} (${f.id})`;

  const pointMarker = (p: NavPoint, color: string, fill: string, radius: number, labelColor: string) => {
    const on = activeIdents.has(p.ident);
    return (
      <CircleMarker
        key={p.ident}
        center={[p.lat, p.lon]}
        radius={on ? radius + 1.5 : radius}
        pathOptions={{ color, weight: on ? 2 : 1, fillColor: fill, fillOpacity: on ? 1 : 0.7 }}
      >
        <Tooltip className="ais-tip" direction="top" offset={[0, -4]}>
          <b>{p.ident}</b> — {p.name}{p.note ? <><br />{p.note}</> : null}
        </Tooltip>
        {layers.labels && (
          <Tooltip className="ais-tip" permanent direction="right" offset={[5, 0]}>{p.ident}</Tooltip>
        )}
      </CircleMarker>
    );
  };

  return (
    <MapContainer
      center={[15.5, -73]}
      zoom={4}
      minZoom={1}
      maxZoom={9}
      scrollWheelZoom
      worldCopyJump
      style={{ height: heightCss, width: '100%', background: tiles.bg }}
    >
      <InvalidateOnMount />
      <FitController bounds={fitBounds} nonce={fitNonce} />
      <LocateController target={locate ?? null} nonce={locateNonce} />
      <BoundsWatcher onChange={setView} />
      <TileLayer
        key={basemap}
        url={tiles.url}
        attribution={tiles.attribution}
        subdomains="abcd"
        maxZoom={19}
      />

      {/* Airway network (faint) + designator labels along each airway. Upper-band
          (IFR-High) routes are drawn in a warmer hue to distinguish them from the
          lower-band network. Designators only label once zoomed in, to keep the
          dense regional view readable. */}
      {layers.airways && visibleAirways.map((awy, idx) => {
        const key = awy.points.join('>');
        if (drawnAirway.has(key)) return null;
        drawnAirway.add(key);
        const pts = awy.points.map(id => lookupPoint(id)).filter((p): p is NavPoint => !!p);
        if (pts.length < 2) return null;
        const upper = awy.band === 'upper';
        const color = upper
          ? (basemap === 'light' ? '#b45309' : '#b98a4a')
          : (basemap === 'light' ? '#1d4ed8' : '#2f5d8f');
        const lbl = airwayLabel(pts);
        const showLabel = lbl && view && view.zoom >= 6;
        return (
          <React.Fragment key={`${awy.id}-${idx}`}>
            <Polyline positions={pts.map(p => [p.lat, p.lon] as [number, number])}
              pathOptions={{ color, weight: 1, opacity: 0.55 }} />
            {showLabel && (
              <Marker position={[lbl!.lat, lbl!.lon]} interactive={false}
                icon={rotatedIcon(awy.id, basemap === 'light' ? 'ais-awy ais-awy-l' : 'ais-awy', lbl!.angle)} />
            )}
          </React.Fragment>
        );
      })}

      {/* Route junctions — where airways meet and a flight can transfer routes. */}
      {layers.airways && junctions.map(j => (
        <CircleMarker
          key={`jx-${j.pt.ident}`}
          center={[j.pt.lat, j.pt.lon]}
          radius={6}
          pathOptions={{ color: '#fbbf24', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 0.18 }}
        >
          <Tooltip className="ais-tip" direction="top" offset={[0, -5]}>
            <b>{j.pt.ident}</b> — route junction<br />Transfer between {j.ids.join(' · ')}
          </Tooltip>
        </CircleMarker>
      ))}

      {/* FIR layer: real sourced boundary polygons + edge-following name labels,
          plus the sourced boundary reporting points (and published boundary line). */}
      {layers.firs && (
        <>
          {/* Every other FIR worldwide (sourced VAT-Spy set), culled to the viewport. */}
          {visibleWorld.map(f =>
            firPolygonsLatLng(f).map((poly, pi) => (
              <Polygon key={`wp-${f.id}-${pi}`} positions={poly}
                pathOptions={{
                  color: basemap === 'light' ? '#1e40af' : '#3b82f6',
                  weight: 0.7, opacity: 0.6,
                  fillColor: basemap === 'light' ? '#2563eb' : '#1d4ed8',
                  fillOpacity: 0.012,
                }}>
                <Tooltip className="ais-tip" sticky>{worldText(f)}</Tooltip>
              </Polygon>
            )),
          )}
          {worldLabels.map(f => {
            const e = firEdgeLabels(f, 1)[0];
            if (!e) return null;
            return (
              <Marker key={`wl-${f.id}`} position={[e.lat, e.lon]} interactive={false}
                icon={rotatedIcon(worldText(f), worldCls, e.angle)} />
            );
          })}
          {FIR_BOUNDARIES.map(f =>
            firPolygonsLatLng(f).map((poly, pi) => (
              <Polygon key={`fp-${f.ident}-${pi}`} positions={poly}
                pathOptions={{
                  color: basemap === 'light' ? '#1e3a8a' : '#60a5fa',
                  weight: 1.1, opacity: 0.85,
                  fillColor: basemap === 'light' ? '#2563eb' : '#3b82f6',
                  fillOpacity: f.ident === 'TTZP' ? 0.05 : 0.02,
                }}>
                <Tooltip className="ais-tip" sticky>{firLabelText(f.ident)}</Tooltip>
              </Polygon>
            )),
          )}
          {/* Curved boundary-following labels for the sourced FIR set. */}
          <CurvedFirLabels cls={firCls} maxCharPx={5.5} fontRatio={1} />
          {BOUNDARY_LINES.map((bl, i) => {
            const pts = bl.points.map(id => lookupPoint(id)).filter((p): p is NavPoint => !!p);
            if (pts.length < 2) return null;
            return <Polyline key={`bl-${i}`} positions={pts.map(p => [p.lat, p.lon] as [number, number])}
              pathOptions={{ color: '#ef4444', weight: 1.5, opacity: 0.7, dashArray: '6 5' }}>
              <Tooltip className="ais-tip" direction="top">{bl.note}</Tooltip>
            </Polyline>;
          })}
          {BOUNDARY_POINTS.map(p => (
            <CircleMarker key={p.ident} center={[p.lat, p.lon]} radius={3.5}
              pathOptions={{ color: '#f87171', weight: 1.5, fillColor: '#ef4444', fillOpacity: 0.85 }}>
              <Tooltip className="ais-tip" direction="top" offset={[0, -4]}><b>{p.ident}</b><br />{p.note}</Tooltip>
              {layers.labels && <Tooltip className="ais-tip" permanent direction="right" offset={[5, 0]}>{p.ident}</Tooltip>}
            </CircleMarker>
          ))}
          {/* FIRs without a sourced polygon keep a centre-anchor label (e.g. KZWY oceanic). */}
          {FIRS.filter(f => !POLY_IDENTS.has(f.ident)).map(f => (
            <Marker key={f.ident} position={[f.lat, f.lon]}
              icon={textIcon(firLabelText(f.ident), firCls)} interactive={false} />
          ))}
        </>
      )}

      {/* Aerodromes */}
      {layers.aerodromes && AERODROMES.map(p => pointMarker(p, '#fbbf24', '#f59e0b', 3.5, '#fcd34d'))}

      {/* Navaids */}
      {layers.navaids && NAVAIDS.map(p => pointMarker(p, '#c4b5fd', '#a78bfa', 3.5, '#c4b5fd'))}

      {/* Adams-TMA reporting fixes */}
      {layers.fixes && FIXES.map(p => pointMarker(p, '#5eead4', '#2dd4bf', 3, '#99f6e4'))}

      {/* Wider-region sourced navaids (VORs) — shown with the navaids layer. */}
      {layers.navaids && EXT_NAVAIDS.map(p => pointMarker(p, '#c4b5fd', '#a78bfa', 3, '#c4b5fd'))}

      {/* Wider-region sourced NDBs — distinct hue, shown with the navaids layer. */}
      {layers.navaids && EXT_NDBS.map(p => pointMarker(p, '#f9a8d4', '#ec4899', 3, '#f9a8d4'))}

      {/* Wider-region enroute fixes — only in IFR modes, and only once zoomed in,
          so the regional view stays readable. */}
      {layers.fixes && mapMode !== 'vfr' && view && view.zoom >= 6 &&
        EXT_FIXES.map(p => pointMarker(p, '#5eead4', '#2dd4bf', 2.5, '#99f6e4'))}

      {/* Compared routes (under the active route) */}
      {compared.map(c => c.result.legs.filter(l => l.ok).map((leg, i) => (
        <Polyline key={`${c.id}-${i}`} positions={(leg.path.length >= 2 ? leg.path : [leg.from, leg.to]).map(p => [p.lat, p.lon] as [number, number])}
          pathOptions={{ color: c.color, weight: 3, opacity: 0.85 }} />
      )))}

      {/* Active route legs — a soft glow underlay makes the planned route pop and
          read clearly as it is built up live, with a crisp line on top. */}
      {active.legs.map((leg: RouteLeg, i) => {
        const pts = (leg.ok ? leg.path : [leg.from, leg.to]).map(p => [p.lat, p.lon] as [number, number]);
        return (
          <React.Fragment key={`a-${i}`}>
            {leg.ok && (
              <Polyline positions={pts}
                pathOptions={{ color: ACTIVE_COLOR, weight: 9, opacity: 0.22, lineCap: 'round', lineJoin: 'round', interactive: false }} />
            )}
            <Polyline positions={pts}
              pathOptions={{ color: leg.ok ? ACTIVE_COLOR : '#f87171', weight: 4, opacity: 1, lineCap: 'round', lineJoin: 'round', dashArray: leg.ok ? undefined : '7 5' }} />
          </React.Fragment>
        );
      })}

      {/* Active route point markers (always labelled). A FIR in the route is shown as a
          labelled region marker at its label anchor — distinct from a precise fix. */}
      {active.routePoints.map((p, i) =>
        p.kind === 'FIR' ? (
          <Marker key={`rp-${p.ident}-${i}`} position={[p.lat, p.lon]}
            icon={textIcon(`◇ ${p.name.toUpperCase()} (${p.ident}) · region`, 'ais-fir-route')} interactive={false} />
        ) : (
          <CircleMarker key={`rp-${p.ident}-${i}`} center={[p.lat, p.lon]} radius={5}
            pathOptions={{ color: ACTIVE_COLOR, weight: 2.5, fillColor: '#0b1220', fillOpacity: 1 }}>
            <Tooltip className="ais-tip" permanent direction="top" offset={[0, -6]}>{p.ident}</Tooltip>
          </CircleMarker>
        )
      )}

      {/* Shortest-path link between the entered Departure/Destination ICAOs.
          Solid when it follows the sourced airway network, dashed for a great-circle fallback. */}
      {icaoLink && icaoLink.path.length >= 2 && (
        <Polyline
          positions={icaoLink.path.map(p => [p.lat, p.lon] as [number, number])}
          pathOptions={{
            color: '#22d3ee', weight: 3.5, opacity: 0.95,
            dashArray: icaoLink.viaNetwork ? undefined : '4 6',
          }}
        >
          <Tooltip className="ais-tip" sticky>
            {icaoLink.viaNetwork ? 'Shortest path via airway network' : 'Direct great-circle (no network path)'} · {fmtDist(icaoLink.distanceNm)}
          </Tooltip>
        </Polyline>
      )}
      {icaoEnds?.dep && (
        <CircleMarker center={[icaoEnds.dep.lat, icaoEnds.dep.lon]} radius={6}
          pathOptions={{ color: '#22d3ee', weight: 2.5, fillColor: '#0b1220', fillOpacity: 1 }}>
          <Tooltip className="ais-tip" permanent direction="top" offset={[0, -7]}>DEP {icaoEnds.dep.ident}</Tooltip>
        </CircleMarker>
      )}
      {icaoEnds?.dest && (
        <CircleMarker center={[icaoEnds.dest.lat, icaoEnds.dest.lon]} radius={6}
          pathOptions={{ color: '#22d3ee', weight: 2.5, fillColor: '#0b1220', fillOpacity: 1 }}>
          <Tooltip className="ais-tip" permanent direction="top" offset={[0, -7]}>DEST {icaoEnds.dest.ident}</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────────
export const RouteTab: React.FC = () => {
  const [route, setRoute] = useState('');
  const result = useMemo(() => parseRoute(route), [route]);

  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [routeName, setRouteName] = useState('');
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [layers, setLayers] = useState<Layers>({ aerodromes: true, navaids: true, fixes: true, airways: true, firs: true, labels: false });
  const [basemap, setBasemap] = useState<Basemap>('dark');
  const [mapMode, setMapMode] = useState<MapMode>('low');
  const [fitNonce, setFitNonce] = useState(0);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [mapPopout, setMapPopout] = useState(false);
  const [popoutFitNonce, setPopoutFitNonce] = useState(0);

  // Editable Departure / Destination ICAO fields (resolve against the aerodrome DB).
  const [depIcao, setDepIcao] = useState('');
  const [destIcao, setDestIcao] = useState('');
  const [locateNonce, setLocateNonce] = useState(0);
  const [locate, setLocate] = useState<{ lat: number; lon: number } | null>(null);
  const dep = useMemo(() => (depIcao.length === 4 ? lookupAerodrome(depIcao) : undefined), [depIcao]);
  const dest = useMemo(() => (destIcao.length === 4 ? lookupAerodrome(destIcao) : undefined), [destIcao]);
  const icaoLink = useMemo<RouteLink | null>(() => (dep && dest ? shortestRouteLink(dep, dest) : null), [dep, dest]);

  // Flight-plan header fields (mirrors the ForeFlight-style panel).
  const [acft, setAcft] = useState('');
  const [spd, setSpd] = useState('');
  const [alt, setAlt] = useState('');
  const [fuel, setFuel] = useState('');
  const [etdZulu, setEtdZulu] = useState('');
  const [etdDate, setEtdDate] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_ROUTES_KEY);
      if (stored) setSavedRoutes(JSON.parse(stored));
    } catch {}
  }, []);

  const compared = useMemo(() =>
    comparedIds
      .map((id, i) => {
        const s = savedRoutes.find(r => r.id === id);
        if (!s) return null;
        return { id, name: s.name, result: parseRoute(s.route), color: COMPARE_COLORS[i % COMPARE_COLORS.length] };
      })
      .filter((c): c is { id: string; name: string; result: RouteResult; color: string } => !!c),
  [comparedIds, savedRoutes]);

  // Bounds covering the active + compared routes and the entered Dep/Dest link for "Fit".
  const fitBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    const pts: [number, number][] = [];
    result.routePoints.forEach(p => pts.push([p.lat, p.lon]));
    compared.forEach(c => c.result.routePoints.forEach(p => pts.push([p.lat, p.lon])));
    if (icaoLink) icaoLink.path.forEach(p => pts.push([p.lat, p.lon]));
    if (pts.length < 2) return null;
    return pts as L.LatLngBoundsExpression;
  }, [result, compared, icaoLink]);

  // Live-follow: re-frame the map whenever the set of plotted route points changes,
  // so the view tracks the planned route as it is built up and edited. Keyed off the
  // point-ident signature (not every keystroke) so it only re-fits when a point is
  // actually added/removed/changed.
  const routeSig = useMemo(() => result.routePoints.map(p => p.ident).join('>'), [result]);
  const prevRouteSig = useRef('');
  useEffect(() => {
    if (routeSig !== prevRouteSig.current) {
      prevRouteSig.current = routeSig;
      if (fitBounds) setFitNonce(n => n + 1);
    }
  }, [routeSig, fitBounds]);

  // When both ICAO endpoints resolve, frame the whole link; when only one resolves,
  // centre on it. Re-runs whenever the resolved endpoints change.
  useEffect(() => {
    if (dep && dest) {
      setFitNonce(n => n + 1);
    } else if (dep || dest) {
      const t = (dep ?? dest)!;
      setLocate({ lat: t.lat, lon: t.lon });
      setLocateNonce(n => n + 1);
    }
  }, [dep, dest]);

  const saveRoute = () => {
    const name = routeName.trim();
    const r = route.trim();
    if (!name || !r) return;
    const entry: SavedRoute = { id: Date.now().toString(), name, route: r, timestamp: Date.now() };
    const next = [entry, ...savedRoutes.filter(s => s.name.toLowerCase() !== name.toLowerCase())];
    setSavedRoutes(next);
    setRouteName('');
    try { localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(next)); } catch {}
  };

  const deleteRoute = (id: string) => {
    const next = savedRoutes.filter(s => s.id !== id);
    setSavedRoutes(next);
    setComparedIds(ids => ids.filter(x => x !== id));
    try { localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(next)); } catch {}
  };

  const toggleCompare = (id: string) =>
    setComparedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);


  const tokenCls = (kind: string, ok: boolean) =>
    !ok ? 'bg-red-900/30 border-red-500/40 text-red-300'
      : kind === 'airway' ? 'bg-orange-900/30 border-orange-500/40 text-orange-300'
      : kind === 'dct' ? 'bg-slate-700/40 border-white/15 text-white/60'
      : kind === 'fir' ? 'bg-blue-900/30 border-blue-400/40 text-blue-200 italic'
      : 'bg-sky-900/30 border-sky-500/40 text-sky-300';

  const layerBtns: { key: keyof Layers; label: string }[] = [
    { key: 'aerodromes', label: 'Aerodromes' },
    { key: 'navaids', label: 'Navaids' },
    { key: 'fixes', label: 'TMA fixes' },
    { key: 'airways', label: 'Airways' },
    { key: 'firs', label: 'FIR boundaries' },
    { key: 'labels', label: 'All labels' },
  ];

  const sum = firSummary(result);

  // Derived performance figures (Dist/ETE/Burn) from the header fields.
  const distNm = routeTotalNm(result);
  const spdNum = parseFloat(spd);
  const eteHours = spdNum > 0 && distNm > 0 ? distNm / spdNum : null;
  const fuelNum = parseFloat(fuel);
  const burnVal = eteHours != null && fuelNum > 0 ? eteHours * fuelNum : null;
  const localEtd = zuluToLocalAst(etdZulu);

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        .leaflet-container { background:#0b1220; font-family:inherit; outline:none; }
        .leaflet-bar a, .leaflet-control-attribution { background:rgba(2,6,23,.8); color:#94a3b8; border-color:rgba(255,255,255,.12)!important; }
        .leaflet-bar a { color:#e2e8f0; }
        .leaflet-control-attribution a { color:#7dd3fc; }
        .ais-tip { background:rgba(2,6,23,.88); border:1px solid rgba(255,255,255,.15); color:#e2e8f0; font-size:10px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; padding:1px 5px; border-radius:4px; box-shadow:none; white-space:nowrap; }
        .ais-tip.leaflet-tooltip-top::before, .ais-tip.leaflet-tooltip-right::before, .ais-tip.leaflet-tooltip-left::before, .ais-tip.leaflet-tooltip-bottom::before { display:none; }
        .ais-fir { background:transparent!important; border:0!important; color:#93c5fd; font-style:italic; font-weight:600; font-size:5px; letter-spacing:0; text-shadow:0 1px 2px #000,0 0 2px #000,0 0 3px #000; white-space:nowrap; }
        .ais-fir span { display:inline-block; }
        .ais-fir.ais-fir-l { color:#1e3a8a; text-shadow:0 1px 2px #fff,0 0 2px #fff,0 0 3px #fff; }
        .ais-fir.ais-fir-w { color:#93c5fd; font-size:4.5px; font-weight:500; opacity:.7; text-shadow:0 1px 2px #000,0 0 2px #000; }
        .ais-fir.ais-fir-w.ais-fir-l { color:#1e40af; opacity:.9; text-shadow:0 1px 2px #fff,0 0 2px #fff; }
        .ais-awy { background:transparent!important; border:0!important; color:#7dd3fc; font-weight:700; font-size:5.5px; letter-spacing:.02em; text-shadow:0 1px 2px #000,0 0 2px #000,0 0 3px #000; white-space:nowrap; }
        .ais-awy span { display:inline-block; }
        .ais-awy.ais-awy-l { color:#1d4ed8; text-shadow:0 1px 2px #fff,0 0 2px #fff,0 0 3px #fff; }
        .ais-fir-route { background:rgba(2,6,23,.85)!important; border:1px dashed #60a5fa!important; border-radius:5px; color:#bfdbfe; font-style:italic; font-weight:600; font-size:6px; padding:1px 4px; text-shadow:0 1px 2px #000; white-space:nowrap; }
      `}</style>

      {/* Intro */}
      <div className="border border-sky-500/20 bg-sky-900/10 rounded-xl p-3">
        <h3 className="text-sky-300 font-bold text-sm">Route Planner &amp; Mapper</h3>
        <p className="text-white/50 text-xs mt-1 leading-relaxed">
          Type a flight-plan route (Item 15 style) to plot it on a geographic chart and cross-check it against the
          nav database. Each token is parsed into legs and validated: unknown navaid/fix/airway, a fix that isn't on
          the quoted airway, and disconnected legs are flagged. Pan/zoom the map, toggle layers, and overlay saved
          routes to compare. Training aid only — verify against the current AIP before operational use.
        </p>
      </div>

      {/* Map — pinned to the top of the tab so it stays visible while the flight-plan fields below are filled */}
      <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-1.5 bg-slate-900">
        <div className="border border-white/10 rounded-xl overflow-hidden shadow-lg shadow-black/40">
          <div className="px-3 py-2 bg-slate-900 border-b border-white/10 flex items-center gap-2 flex-wrap">
            <button
              style={{ touchAction: 'manipulation' }}
              onClick={() => setMapCollapsed(c => !c)}
              aria-expanded={!mapCollapsed}
              title={mapCollapsed ? 'Show the map' : 'Hide the map to free up space for the fields'}
              className="flex items-center gap-1.5 text-white/60 hover:text-white font-bold text-xs mr-1 transition-colors"
            >
              <span className="text-[9px] text-white/40">{mapCollapsed ? '▸' : '▾'}</span>
              Chart
            </button>
            {!mapCollapsed && layerBtns.map(b => (
              <button
                key={b.key}
                style={{ touchAction: 'manipulation' }}
                onClick={() => setLayers(l => ({ ...l, [b.key]: !l[b.key] }))}
                className={`px-2 py-1 rounded-md border text-[10px] font-bold transition-colors ${
                  layers[b.key] ? 'border-sky-400/50 bg-sky-900/30 text-sky-200' : 'border-white/10 bg-black/20 text-white/40 hover:text-white/70'
                }`}
              >{b.label}</button>
            ))}
            {mapCollapsed ? (
              <button
                style={{ touchAction: 'manipulation' }}
                onClick={() => setMapCollapsed(false)}
                className="ml-auto text-sky-300/80 hover:text-sky-200 text-[10px] font-bold transition-colors"
              >Map hidden — show</button>
            ) : (
              <div className="ml-auto flex items-center gap-1.5">
                <div className="flex rounded-md border border-white/15 overflow-hidden" role="group" aria-label="Map mode">
                  {MODE_BTNS.map(m => (
                    <button
                      key={m.key}
                      style={{ touchAction: 'manipulation' }}
                      onClick={() => setMapMode(m.key)}
                      aria-pressed={mapMode === m.key}
                      title={m.title}
                      className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                        mapMode === m.key ? 'bg-amber-900/40 text-amber-200' : 'bg-black/20 text-white/40 hover:text-white/70'
                      }`}
                    >{m.label}</button>
                  ))}
                </div>
                <div className="flex rounded-md border border-white/15 overflow-hidden" role="group" aria-label="Map basemap">
                  {(['dark', 'light'] as const).map(bm => (
                    <button
                      key={bm}
                      style={{ touchAction: 'manipulation' }}
                      onClick={() => setBasemap(bm)}
                      aria-pressed={basemap === bm}
                      title={bm === 'light' ? 'Bright SkyVector-style chart' : 'Dark chart'}
                      className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                        basemap === bm ? 'bg-sky-900/40 text-sky-200' : 'bg-black/20 text-white/40 hover:text-white/70'
                      }`}
                    >{bm === 'light' ? 'Bright' : 'Dark'}</button>
                  ))}
                </div>
                <button
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => setFitNonce(n => n + 1)}
                  disabled={!fitBounds}
                  className="px-2 py-1 rounded-md border border-white/15 bg-black/20 text-white/60 hover:text-white text-[10px] font-bold transition-colors disabled:opacity-40"
                >Fit to route</button>
                <button
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => { setMapPopout(true); setPopoutFitNonce(n => n + 1); }}
                  title="Open the chart full-screen"
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-white/15 bg-black/20 text-white/60 hover:text-white text-[10px] font-bold transition-colors"
                ><span aria-hidden="true">⛶</span> Full screen</button>
              </div>
            )}
          </div>
          {!mapCollapsed && (
            <>
              <RouteGeoMap active={result} compared={compared} layers={layers} basemap={basemap} mapMode={mapMode} fitBounds={fitBounds} fitNonce={fitNonce} icaoLink={icaoLink} icaoEnds={{ dep, dest }} locate={locate} locateNonce={locateNonce} heightCss="clamp(200px, 30vh, 360px)" />
              <div className="px-3 py-2 bg-slate-900 text-[10px] flex items-center gap-3 flex-wrap text-white/40">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: ACTIVE_COLOR }} /> Active route</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-b border-dashed border-red-400 inline-block" /> Error leg</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#f59e0b' }} /> Aerodrome</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#a78bfa' }} /> VOR / navaid</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ec4899' }} /> NDB</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#2dd4bf' }} /> Fix</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ef4444' }} /> FIR boundary point</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 border rounded-sm" style={{ borderColor: '#a78bfa', background: 'rgba(99,102,241,.15)' }} /> FIR boundary (sourced)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: '#2f5d8f' }} /> Lower airway</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: '#b98a4a' }} /> Upper airway</span>
                <span className="flex items-center gap-1"><span className="font-bold text-sky-300" style={{ fontSize: '9px' }}>A632</span> Airway designator (zoom in)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block border" style={{ borderColor: '#fbbf24', background: 'rgba(245,158,11,.18)' }} /> Route junction (transfer)</span>
              </div>
              {compared.length > 0 && (
                <div className="px-3 py-2 bg-slate-900 border-t border-white/10 flex items-center gap-3 flex-wrap text-[10px]">
                  <span className="text-white/40">Overlaid:</span>
                  {compared.map(c => (
                    <span key={c.id} className="flex items-center gap-1.5 text-white/60">
                      <span className="w-3 h-0.5 inline-block" style={{ background: c.color }} />
                      {c.name}
                      {routeTotalNm(c.result) > 0 && <span className="text-white/35 font-mono">{fmtDist(routeTotalNm(c.result))}</span>}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Flight plan entry — formatted after a flight-plan panel (kept on the dark theme) */}
      <div className="border border-white/12 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border-b border-white/10">
          <span className="text-sky-300 font-bold text-xs tracking-wide flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.8l4.4 4.4-2 2-1.8-.3a.5.5 0 0 0-.4.8l1.7 2.3 2.3 1.7a.5.5 0 0 0 .8-.4l-.3-1.8 2-2 4.4 4.4a.5.5 0 0 0 .8-.5Z" />
            </svg>
            Flight Plan
          </span>
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={() => setRoute('')}
            disabled={!route}
            className="ml-auto px-2 py-0.5 rounded-md border border-white/10 bg-black/20 text-white/45 hover:text-white hover:border-white/25 text-[10px] font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >Clear</button>
        </div>

        <div className="p-3 space-y-2.5">
          {/* Aircraft / performance fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ['Aircraft', acft, setAcft, 'N10SV'],
              ['Spd (kt)', spd, setSpd, '136'],
              ['Alt', alt, setAlt, '050'],
              ['Fuel /hr', fuel, setFuel, '11.0'],
            ] as const).map(([label, val, set, ph]) => (
              <label key={label} className="flex flex-col gap-1">
                <span className="text-white/40 text-[10px] uppercase tracking-widest">{label}</span>
                <input
                  className="bg-black/30 border border-white/20 rounded-md px-2 py-1.5 text-white text-sm font-mono focus:border-sky-400 outline-none placeholder-white/20 transition-colors uppercase"
                  placeholder={ph}
                  value={val}
                  onChange={e => set(e.target.value)}
                  spellCheck={false}
                />
              </label>
            ))}
          </div>

          {/* ETD (Zulu) + date, with auto-derived local time (AST) */}
          <div className="flex items-end gap-2 flex-wrap">
            <label className="flex flex-col gap-1">
              <span className="text-white/40 text-[10px] uppercase tracking-widest">ETD Zulu</span>
              <input
                className="w-20 bg-black/30 border border-white/20 rounded-md px-2 py-1.5 text-white text-sm font-mono focus:border-sky-400 outline-none placeholder-white/20 transition-colors"
                placeholder="2000"
                inputMode="numeric"
                maxLength={4}
                value={etdZulu}
                onChange={e => setEtdZulu(e.target.value.replace(/[^0-9]/g, ''))}
                spellCheck={false}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-white/40 text-[10px] uppercase tracking-widest">Date</span>
              <input
                type="date"
                className="bg-black/30 border border-white/20 rounded-md px-2 py-1.5 text-white text-sm font-mono focus:border-sky-400 outline-none transition-colors [color-scheme:dark]"
                value={etdDate}
                onChange={e => setEtdDate(e.target.value)}
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-white/40 text-[10px] uppercase tracking-widest">Local (AST)</span>
              <div className="px-2 py-1.5 rounded-md border border-white/10 bg-black/20 text-sm font-mono min-w-[64px]">
                <span className={localEtd ? 'text-green-300' : 'text-white/20'}>{localEtd ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Departure / Destination — editable 4-letter ICAO, resolved against the aerodrome DB.
              Both valid → the map frames the shortest-path link; one valid → it centres there. */}
          <div className="space-y-1.5">
            {([['Departure', depIcao, setDepIcao, dep], ['Destination', destIcao, setDestIcao, dest]] as const).map(([label, val, set, pt]) => {
              const unknown = val.length === 4 && !pt;
              return (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-white/40 text-[10px] uppercase tracking-widest w-[72px] shrink-0">{label}</span>
                  <input
                    className={`w-16 bg-black/30 border rounded-md px-2 py-1.5 text-sm font-mono font-bold tracking-wider uppercase outline-none transition-colors placeholder-white/20 ${
                      unknown ? 'border-red-500/50 text-red-300 focus:border-red-400'
                        : pt ? 'border-sky-500/40 text-sky-300 focus:border-sky-400'
                        : 'border-white/20 text-white focus:border-sky-400'
                    }`}
                    placeholder="ICAO"
                    value={val}
                    maxLength={4}
                    onChange={e => set(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4))}
                    spellCheck={false}
                    autoCapitalize="characters"
                    aria-label={`${label} ICAO code`}
                  />
                  <span className="text-xs truncate min-w-0">
                    {pt ? (
                      <span className="text-white/55">{pt.name}{pt.fir ? <span className="text-white/30"> · {pt.fir} FIR</span> : null}</span>
                    ) : unknown ? (
                      <span className="text-red-400/90">✕ unknown aerodrome code</span>
                    ) : (
                      <span className="text-white/20">{val.length > 0 ? `${4 - val.length} more letter${4 - val.length === 1 ? '' : 's'}…` : 'enter a 4-letter ICAO'}</span>
                    )}
                  </span>
                </div>
              );
            })}
            {icaoLink && (
              <div className="text-[10px] text-cyan-300/80 font-mono pl-[80px]">
                {icaoLink.viaNetwork ? '↳ shortest path via airway network' : '↳ direct great-circle (no network path)'} · {fmtDist(icaoLink.distanceNm)}
              </div>
            )}
          </div>

          {/* Route string */}
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-widest">Route</label>
            <input
              className="w-full mt-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-sky-400 outline-none placeholder-white/25 transition-colors uppercase tracking-wide"
              placeholder="e.g. BGI DCT BNE DCT SLU"
              value={route}
              onChange={e => setRoute(e.target.value)}
              spellCheck={false}
              autoCapitalize="characters"
            />
            {/* Highlighted route preview — airways in green, like a filed flight plan */}
            {!result.isEmpty && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap rounded-lg bg-black/30 border border-white/10 px-2.5 py-2">
                <span className="text-white/25 text-xs">↦</span>
                {result.tokens.map((t, i) => (
                  <span key={i} title={t.error || ''} className={`font-mono text-sm ${
                    t.error ? 'text-red-400 underline decoration-dotted'
                      : t.kind === 'airway' ? 'text-green-400 font-bold'
                      : t.kind === 'dct' ? 'text-white/35'
                      : t.kind === 'fir' ? 'text-blue-300 italic font-bold'
                      : 'text-white font-bold'
                  }`}>{t.raw}</span>
                ))}
                <span className="text-white/25 text-xs">↦</span>
              </div>
            )}
          </div>

          {/* Dist / ETE / Burn + status strip (flight-plan style) */}
          <div className="pt-0.5">
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
              <span className="text-xs"><span className="text-white/40">Dist </span><span className="font-mono font-bold text-green-300">{distNm > 0 ? fmtDist(distNm) : '—'}</span></span>
              <span className="text-xs"><span className="text-white/40">ETE </span><span className="font-mono font-bold text-green-300">{eteHours != null ? fmtHM(eteHours) : '—'}</span></span>
              <span className="text-xs"><span className="text-white/40">Burn </span><span className="font-mono font-bold text-green-300">{burnVal != null ? burnVal.toFixed(1) : '—'}</span></span>
              <span className="text-xs ml-auto flex items-center gap-1.5">
                <span className="text-white/40">Status</span>
                {result.isEmpty
                  ? <span className="font-bold text-white/35">Empty</span>
                  : result.valid
                    ? <span className="font-bold text-green-400">✓ Valid</span>
                    : <span className="font-bold text-red-400">✕ {result.errors.length} problem{result.errors.length === 1 ? '' : 's'}</span>}
              </span>
            </div>
            {!result.isEmpty && (
              <div className="text-white/30 text-[10px] mt-1 font-mono">
                {result.legs.length} leg{result.legs.length === 1 ? '' : 's'} · {result.routePoints.length} point{result.routePoints.length === 1 ? '' : 's'}
              </div>
            )}
            <p className="text-white/25 text-[10px] mt-1.5 leading-relaxed">
              ETE = distance ÷ speed · Burn = fuel/hr × ETE · Local = AST (UTC−4).
            </p>
          </div>

          {/* Examples */}
          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/[0.07]">
            <span className="text-white/30 text-[10px] self-center mr-1">Examples:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                style={{ touchAction: 'manipulation' }}
                onClick={() => setRoute(ex)}
                className="px-2 py-1 rounded-md border border-white/10 bg-black/20 text-white/50 hover:text-white hover:border-sky-400/40 text-[10px] font-mono transition-colors"
              >{ex}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Save / recall / compare routes */}
      <div className="border border-white/10 rounded-xl p-3">
        <label className="text-white/40 text-[10px] uppercase tracking-widest">Saved routes</label>
        <div className="flex gap-2 mt-1">
          <input
            className="flex-1 min-w-0 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-400 outline-none placeholder-white/25 transition-colors"
            placeholder="Name this route, e.g. North via San Juan"
            value={routeName}
            onChange={e => setRouteName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveRoute(); }}
            spellCheck={false}
          />
          <button
            style={{ touchAction: 'manipulation' }}
            onClick={saveRoute}
            disabled={!routeName.trim() || !route.trim()}
            className="shrink-0 px-3 py-2 rounded-lg border border-sky-500/40 bg-sky-900/30 text-sky-300 text-xs font-bold hover:bg-sky-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >Save route</button>
        </div>
        {savedRoutes.length > 0 ? (
          <>
            <div className="space-y-1.5 mt-2.5">
              {savedRoutes.map(s => {
                const shown = comparedIds.includes(s.id);
                const color = shown ? COMPARE_COLORS[comparedIds.indexOf(s.id) % COMPARE_COLORS.length] : undefined;
                return (
                  <div key={s.id} className="flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-1.5 py-1">
                    <button
                      style={{ touchAction: 'manipulation' }}
                      onClick={() => toggleCompare(s.id)}
                      title={shown ? 'Hide from map' : 'Overlay on map to compare'}
                      aria-label={shown ? `Hide ${s.name} from map` : `Show ${s.name} on map`}
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center border border-white/10 hover:border-white/30 transition-colors"
                    >
                      <span className="inline-block w-3 h-3 rounded-sm border" style={{ borderColor: color ?? 'rgba(255,255,255,.3)', background: color ?? 'transparent' }} />
                    </button>
                    <button
                      style={{ touchAction: 'manipulation' }}
                      onClick={() => setRoute(s.route)}
                      title="Load into the editor"
                      className="flex-1 min-w-0 text-left px-1 py-0.5"
                    >
                      <span className="text-white/70 hover:text-white text-[11px] font-bold transition-colors">{s.name}</span>
                      <span className="ml-1.5 text-[9px] font-mono text-white/30 break-all">{s.route}</span>
                    </button>
                    <button
                      style={{ touchAction: 'manipulation' }}
                      onClick={() => deleteRoute(s.id)}
                      title="Delete saved route"
                      aria-label={`Delete saved route ${s.name}`}
                      className="shrink-0 px-1.5 py-0.5 text-white/25 hover:text-red-400 text-xs transition-colors"
                    >✕</button>
                  </div>
                );
              })}
            </div>
            <p className="text-white/25 text-[10px] mt-2">
              Tap a name to load it into the editor; tap the colour swatch to overlay it on the map and compare routes side by side.
            </p>
          </>
        ) : (
          <p className="text-white/25 text-[10px] mt-2">
            Name the route above and press Save to recall it later. Saved routes persist on this device.
          </p>
        )}
      </div>

      {/* FIR summary */}
      {!result.isEmpty && (sum.origin || sum.dest || sum.crossings.length > 0) && (
        <div className="border border-red-500/20 bg-red-900/5 rounded-xl p-3">
          <div className="text-red-300/90 text-[10px] uppercase tracking-widest mb-2 font-bold">FIRs &amp; boundaries</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {sum.origin && (() => { const f = lookupFir(sum.origin); return (
              <span className="text-white/70">Departs <span className="font-mono font-bold text-amber-300">{sum.origin}</span>{f ? ` (${f.name})` : ''}</span>
            ); })()}
            {sum.dest && (() => { const f = lookupFir(sum.dest); return (
              <span className="text-white/70">→ Arrives <span className="font-mono font-bold text-amber-300">{sum.dest}</span>{f ? ` (${f.name})` : ''}</span>
            ); })()}
          </div>
          {sum.crossings.length > 0 ? (
            <div className="mt-1.5 text-xs text-white/55 leading-relaxed">
              Passes sourced boundary reporting point{sum.crossings.length === 1 ? '' : 's'}:{' '}
              {sum.crossings.map((c, i) => (
                <span key={c.ident}>{i ? ', ' : ''}<span className="font-mono text-red-300">{c.ident}</span> <span className="text-white/40">({c.firs})</span></span>
              ))}
              {sum.crossings.some(c => c.interFir) ? ' — “/” marks an inter-FIR boundary.' : ''}
            </div>
          ) : (
            <p className="mt-1.5 text-[10px] text-white/35 leading-relaxed">
              Endpoint FIRs are shown from each aerodrome's published FIR. Exact intermediate FIR crossings are only
              asserted where the route passes a sourced AIP boundary point — full lateral limits are in the reference
              chart under the Location Indicators tab.
            </p>
          )}
        </div>
      )}

      {/* Token breakdown */}
      {!result.isEmpty && (
        <div className="border border-white/10 rounded-xl p-3">
          <div className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Parsed tokens</div>
          <div className="flex flex-wrap gap-1.5">
            {result.tokens.map((t, i) => (
              <span key={i} title={t.error || ''}
                className={`px-2 py-1 rounded-md border text-xs font-mono font-bold ${tokenCls(t.kind, !t.error)}`}>
                {t.raw}
                <span className="ml-1.5 text-[9px] font-normal opacity-60 uppercase">
                  {t.error ? 'unknown' : t.kind === 'dct' ? 'direct' : t.kind === 'fir' ? 'FIR region' : t.kind}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legs */}
      {result.legs.length > 0 && (
        <div className="border border-white/10 rounded-xl p-3">
          <div className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Legs</div>
          <div className="space-y-1.5">
            {result.legs.map((leg, i) => (
              <div key={i} className={`rounded-lg border px-3 py-2 ${
                leg.ok ? 'border-white/10 bg-black/20' : 'border-red-500/30 bg-red-900/10'
              }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm text-sky-300">{leg.from.ident}</span>
                  <span className="text-white/30 text-xs font-mono">
                    {leg.via === 'DCT' ? '──DCT──▶' : leg.via === '—' ? '╌╌?╌╌▶' : `──${leg.via}──▶`}
                  </span>
                  <span className="font-mono font-bold text-sm text-sky-300">{leg.to.ident}</span>
                  {leg.ok ? (
                    <span className="ml-auto text-xs font-mono text-white/50">
                      {fmtDist(leg.distanceNm)} · {fmtDeg(leg.bearingMag)}M
                      <span className="text-white/25"> ({fmtDeg(leg.bearingTrue)}T)</span>
                    </span>
                  ) : (
                    <span className="ml-auto text-red-400 text-xs font-bold">✕ error</span>
                  )}
                </div>
                {!leg.ok && leg.error && (
                  <div className="text-red-300/90 text-xs mt-1 leading-relaxed">{leg.error}</div>
                )}
              </div>
            ))}
          </div>
          <p className="text-white/25 text-[10px] mt-2">
            Tracks are magnetic (var ≈ {MAG_VAR_W}°W applied to the computed true track); true track in brackets.
            Airway leg distance is summed along the airway.
          </p>
        </div>
      )}

      {/* Token-level errors list */}
      {result.errors.length > 0 && (
        <div className="border border-red-500/30 bg-red-900/10 rounded-xl p-3">
          <div className="text-red-300 text-[10px] uppercase tracking-widest mb-2 font-bold">Problems</div>
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-red-300/90 text-xs flex gap-2 leading-relaxed">
                <span className="text-red-400 shrink-0">•</span>{e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mapPopout && (
        <ChartPopout title="Route map — full screen" onClose={() => setMapPopout(false)}>
          <div className="w-full h-full flex flex-col bg-slate-900">
            <div className="px-3 py-1.5 bg-slate-900 border-b border-white/10 flex items-center gap-1.5 flex-wrap shrink-0">
              {layerBtns.map(b => (
                <button
                  key={b.key}
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => setLayers(l => ({ ...l, [b.key]: !l[b.key] }))}
                  className={`px-2 py-1 rounded-md border text-[10px] font-bold transition-colors ${
                    layers[b.key] ? 'border-sky-400/50 bg-sky-900/30 text-sky-200' : 'border-white/10 bg-black/20 text-white/40 hover:text-white/70'
                  }`}
                >{b.label}</button>
              ))}
              <div className="ml-auto flex items-center gap-1.5">
                <div className="flex rounded-md border border-white/15 overflow-hidden" role="group" aria-label="Map mode">
                  {MODE_BTNS.map(m => (
                    <button
                      key={m.key}
                      style={{ touchAction: 'manipulation' }}
                      onClick={() => setMapMode(m.key)}
                      aria-pressed={mapMode === m.key}
                      title={m.title}
                      className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                        mapMode === m.key ? 'bg-amber-900/40 text-amber-200' : 'bg-black/20 text-white/40 hover:text-white/70'
                      }`}
                    >{m.label}</button>
                  ))}
                </div>
                <div className="flex rounded-md border border-white/15 overflow-hidden" role="group" aria-label="Map basemap">
                  {(['dark', 'light'] as const).map(bm => (
                    <button
                      key={bm}
                      style={{ touchAction: 'manipulation' }}
                      onClick={() => setBasemap(bm)}
                      aria-pressed={basemap === bm}
                      className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                        basemap === bm ? 'bg-sky-900/40 text-sky-200' : 'bg-black/20 text-white/40 hover:text-white/70'
                      }`}
                    >{bm === 'light' ? 'Bright' : 'Dark'}</button>
                  ))}
                </div>
                <button
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => setPopoutFitNonce(n => n + 1)}
                  disabled={!fitBounds}
                  className="px-2 py-1 rounded-md border border-white/15 bg-black/20 text-white/60 hover:text-white text-[10px] font-bold transition-colors disabled:opacity-40"
                >Fit to route</button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <RouteGeoMap
                active={result}
                compared={compared}
                layers={layers}
                basemap={basemap}
                mapMode={mapMode}
                fitBounds={fitBounds}
                fitNonce={popoutFitNonce}
                icaoLink={icaoLink}
                icaoEnds={{ dep, dest }}
                locate={locate}
                locateNonce={locateNonce}
                heightCss="100%"
              />
            </div>
          </div>
        </ChartPopout>
      )}
    </div>
  );
};
