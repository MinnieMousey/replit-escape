import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MLMap, GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AIRPORTS, NAVAIDS, WAYPOINTS, AIRWAYS, fixByIdent, nearestFix,
} from '@/lib/nav/db';
import { parseRouteString, searchFixes } from '@/lib/nav/search';
import { planRoute, validateManualRoute } from '@/lib/nav/router';
import { greatCircleLine } from '@/lib/nav/greatCircle';
import type { Fix, PlannedRoute, RouteElement } from '@/lib/nav/types';

// ── Route Planner & Mapper (SkyVector-style, MapLibre engine) ───────────────
// Worldwide-scale route editor backed by the nav engine in src/lib/nav/*.
// Rendering uses MapLibre GL on a free CARTO raster basemap (no API key), so
// the map works offline-friendly on iOS / iPadOS with hardware-accelerated
// pan/zoom and SDF-style circle symbols that recolour on zoom.

const SAVED_ROUTES_KEY = 'ais-shift-saved-routes-v2';
interface SavedRoute { id: string; name: string; route: string; ts: number; }

const STYLE = {
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  layers: [
    { id: 'bg', type: 'background' as const, paint: { 'background-color': '#0b1220' } },
    { id: 'carto-tiles', type: 'raster' as const, source: 'carto-dark' },
  ],
};

// SkyVector-style symbology colours.
const COLOR = {
  airport: '#fbbf24',
  vor: '#7dd3fc',
  vordme: '#38bdf8',
  ndb: '#f97316',
  waypoint: '#94a3b8',
  awyVictor: '#3b82f6',
  awyJet: '#d946ef',
  awyRnav: '#22c55e',
  awyOceanic: '#06b6d4',
  awyLow: '#64748b',
  route: '#facc15',
} as const;

function airwayPaintColor(): maplibregl.DataDrivenPropertyValueSpecification<string> {
  return [
    'match', ['get', 'type'],
    'JET', COLOR.awyJet,
    'UPPER', COLOR.awyJet,
    'VICTOR', COLOR.awyVictor,
    'LOW', COLOR.awyLow,
    'RNAV', COLOR.awyRnav,
    'OCEANIC', COLOR.awyOceanic,
    COLOR.awyVictor,
  ] as maplibregl.DataDrivenPropertyValueSpecification<string>;
}

// ── GeoJSON builders ────────────────────────────────────────────────────────
const airportsGeo = () => ({
  type: 'FeatureCollection' as const,
  features: AIRPORTS.map(a => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [a.lon, a.lat] },
    properties: { ident: a.icao, kind: 'airport', label: a.icao, name: a.name },
  })),
});

const navaidsGeo = () => ({
  type: 'FeatureCollection' as const,
  features: NAVAIDS.map(n => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [n.lon, n.lat] },
    properties: { ident: n.ident, kind: 'navaid', subtype: n.type, label: n.ident, name: n.name },
  })),
});

const waypointsGeo = () => ({
  type: 'FeatureCollection' as const,
  features: WAYPOINTS.map(w => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [w.lon, w.lat] },
    properties: { ident: w.ident, kind: 'waypoint', label: w.ident },
  })),
});

const airwaysGeo = () => ({
  type: 'FeatureCollection' as const,
  features: AIRWAYS.flatMap(a => a.segments.map(s => {
    const f = fixByIdent(s.from), t = fixByIdent(s.to);
    if (!f || !t) return null;
    return {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: [[f.lon, f.lat], [t.lon, t.lat]] },
      properties: { id: a.id, type: a.type },
    };
  }).filter((x): x is NonNullable<typeof x> => !!x)),
});

const routeGeo = (legs: PlannedRoute['legs']) => ({
  type: 'FeatureCollection' as const,
  features: legs.map((l, i) => ({
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: l.path.map(p => [p.lon, p.lat]) },
    properties: { idx: i, ok: l.ok, via: l.via },
  })),
});

const routePointsGeo = (legs: PlannedRoute['legs']) => {
  const pts: { ident: string; lon: number; lat: number }[] = [];
  legs.forEach((l, i) => {
    if (i === 0) pts.push({ ident: l.from.ident, lon: l.from.lon, lat: l.from.lat });
    pts.push({ ident: l.to.ident, lon: l.to.lon, lat: l.to.lat });
  });
  return {
    type: 'FeatureCollection' as const,
    features: pts.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
      properties: { ident: p.ident },
    })),
  };
};

// ── Map component ───────────────────────────────────────────────────────────
interface MapProps {
  plan: PlannedRoute;
  onPickFix: (fix: Fix) => void;
  layers: Layers;
}

interface Layers {
  airports: boolean;
  navaids: boolean;
  waypoints: boolean;
  airways: boolean;
  labels: boolean;
}

const RouteMap: React.FC<MapProps> = ({ plan, onPickFix, layers }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE as unknown as maplibregl.StyleSpecification,
      center: [-60, 15],
      zoom: 3.5,
      maxPitch: 0,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      ready.current = true;
      map.addSource('airways', { type: 'geojson', data: airwaysGeo() });
      map.addSource('airports', { type: 'geojson', data: airportsGeo() });
      map.addSource('navaids', { type: 'geojson', data: navaidsGeo() });
      map.addSource('waypoints', { type: 'geojson', data: waypointsGeo() });
      map.addSource('route', { type: 'geojson', data: routeGeo([]) });
      map.addSource('route-points', { type: 'geojson', data: routePointsGeo([]) });

      map.addLayer({
        id: 'awy-line', type: 'line', source: 'airways',
        minzoom: 3,
        paint: {
          'line-color': airwayPaintColor(),
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.4, 8, 1.4],
          'line-opacity': 0.55,
        },
      });

      // NDB diamond (square rotated). VOR hex via circle stand-in (MapLibre lacks
      // built-in polygon symbols without sprites; circles read cleanly on mobile).
      map.addLayer({
        id: 'navaid-symbol', type: 'circle', source: 'navaids',
        minzoom: 5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 9, 6],
          'circle-color': ['match', ['get', 'subtype'], 'NDB', COLOR.ndb, 'VORDME', COLOR.vordme, COLOR.vor],
          'circle-stroke-color': '#0b1220',
          'circle-stroke-width': 1.2,
        },
      });

      map.addLayer({
        id: 'waypoint-symbol', type: 'circle', source: 'waypoints',
        minzoom: 6,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 1.8, 10, 3.5],
          'circle-color': COLOR.waypoint,
          'circle-stroke-color': '#0b1220',
          'circle-stroke-width': 0.8,
        },
      });

      map.addLayer({
        id: 'airport-symbol', type: 'circle', source: 'airports',
        minzoom: 3,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.5, 9, 6.5],
          'circle-color': COLOR.airport,
          'circle-stroke-color': '#0b1220',
          'circle-stroke-width': 1.4,
        },
      });

      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        paint: {
          'line-color': ['case', ['get', 'ok'], COLOR.route, '#ef4444'],
          'line-width': 3.5,
          'line-opacity': 0.95,
        },
      });
      map.addLayer({
        id: 'route-point', type: 'circle', source: 'route-points',
        paint: {
          'circle-radius': 5,
          'circle-color': '#0b1220',
          'circle-stroke-color': COLOR.route,
          'circle-stroke-width': 2.4,
        },
      });

      // Click any symbol → resolve to a Fix and bubble up.
      const pickLayers = ['airport-symbol', 'navaid-symbol', 'waypoint-symbol'];
      const onClick = (ev: MapMouseEvent) => {
        const feats = map.queryRenderedFeatures(ev.point, { layers: pickLayers });
        let fix: Fix | null = null;
        if (feats.length) {
          const ident = feats[0].properties?.ident as string;
          fix = fixByIdent(ident) ?? null;
        } else {
          fix = nearestFix(ev.lngLat.lng, ev.lngLat.lat, 1);
        }
        if (fix) onPickFix(fix);
      };
      map.on('click', onClick);
      pickLayers.forEach(l => {
        map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; });
      });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; ready.current = false; };
  }, [onPickFix]);

  // Push route updates.
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready.current) return;
    (map.getSource('route') as GeoJSONSource | undefined)?.setData(routeGeo(plan.legs));
    (map.getSource('route-points') as GeoJSONSource | undefined)?.setData(routePointsGeo(plan.legs));
    if (plan.legs.length) {
      const lons = plan.legs.flatMap(l => l.path.map(p => p.lon));
      const lats = plan.legs.flatMap(l => l.path.map(p => p.lat));
      const bounds = new maplibregl.LngLatBounds(
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 8, duration: 600 });
    }
  }, [plan]);

  // Layer visibility.
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready.current) return;
    const set = (id: string, on: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };
    set('airport-symbol', layers.airports);
    set('navaid-symbol', layers.navaids);
    set('waypoint-symbol', layers.waypoints);
    set('awy-line', layers.airways);
  }, [layers]);

  return <div ref={containerRef} className="w-full" style={{ height: 'clamp(360px, 60vh, 620px)' }} />;
};

// ── Route input + chips ─────────────────────────────────────────────────────
const TokenChip: React.FC<{ el: RouteElement; onRemove: () => void }> = ({ el, onRemove }) => {
  const tone = el.error ? 'border-red-400/50 bg-red-900/30 text-red-200'
    : el.kind === 'airway' ? 'border-orange-400/50 bg-orange-900/30 text-orange-200'
    : el.kind === 'dct' ? 'border-white/15 bg-slate-700/40 text-white/60'
    : el.fix?.kind === 'airport' ? 'border-amber-400/50 bg-amber-900/30 text-amber-200'
    : el.fix?.kind === 'navaid' ? 'border-sky-400/50 bg-sky-900/30 text-sky-200'
    : 'border-slate-400/50 bg-slate-700/30 text-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-mono text-xs ${tone}`}>
      {el.raw}
      <button onClick={onRemove} className="ml-0.5 text-white/40 hover:text-white" title="Remove">×</button>
    </span>
  );
};

const FixSuggest: React.FC<{ query: string; onPick: (f: Fix) => void }> = ({ query, onPick }) => {
  const hits = useMemo(() => searchFixes(query, 8), [query]);
  if (!query || !hits.length) return null;
  return (
    <div className="absolute z-30 mt-1 w-full max-w-md bg-slate-900 border border-white/15 rounded-lg shadow-xl overflow-hidden">
      {hits.map(h => (
        <button
          key={h.fix.ident + h.fix.kind}
          onClick={() => onPick(h.fix)}
          className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2"
        >
          <span className={`font-mono font-bold text-xs w-14 ${
            h.fix.kind === 'airport' ? 'text-amber-300'
              : h.fix.kind === 'navaid' ? 'text-sky-300' : 'text-slate-300'
          }`}>{h.fix.ident}</span>
          <span className="text-white/60 text-xs truncate">{h.fix.label}</span>
          <span className="ml-auto text-white/30 text-[10px] uppercase">{h.fix.detail ?? h.fix.kind}</span>
        </button>
      ))}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export const RouteTab: React.FC = () => {
  const [dep, setDep] = useState('TBPB');
  const [dest, setDest] = useState('TJSJ');
  const [elements, setElements] = useState<RouteElement[]>([]);
  const [routeStr, setRouteStr] = useState('');
  const [search, setSearch] = useState('');
  const [layers, setLayers] = useState<Layers>({
    airports: true, navaids: true, waypoints: true, airways: true, labels: false,
  });
  const [saved, setSaved] = useState<SavedRoute[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    try {
      const v = localStorage.getItem(SAVED_ROUTES_KEY);
      if (v) setSaved(JSON.parse(v));
    } catch { /* ignore */ }
  }, []);

  const persistSaved = (next: SavedRoute[]) => {
    setSaved(next);
    try { localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  // Manual route validation (chips → legs).
  const manualPlan = useMemo<PlannedRoute>(() => {
    if (elements.length < 2) {
      return { elements, legs: [], totalNm: 0, errors: [], strategy: 'manual' };
    }
    return validateManualRoute(elements);
  }, [elements]);

  const handleAutoPlan = useCallback(() => {
    const plan = planRoute(dep.trim().toUpperCase(), dest.trim().toUpperCase());
    setElements(plan.elements);
    setRouteStr(plan.elements.map(e => e.raw).join(' '));
  }, [dep, dest]);

  const handleParseString = useCallback(() => {
    const els = parseRouteString(routeStr);
    setElements(els);
  }, [routeStr]);

  const handlePickFix = useCallback((fix: Fix) => {
    setElements(prev => {
      // If chain non-empty, insert "DCT fix" at end so it forms a valid leg.
      const lastIsFix = prev.length && prev[prev.length - 1].kind === 'fix';
      const next = [...prev];
      if (lastIsFix) next.push({ kind: 'dct', raw: 'DCT' });
      next.push({ kind: 'fix', raw: fix.ident, fix });
      return next;
    });
  }, []);

  const removeAt = (i: number) =>
    setElements(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    const n = name.trim();
    if (!n || !elements.length) return;
    const entry: SavedRoute = {
      id: Date.now().toString(),
      name: n,
      route: elements.map(e => e.raw).join(' '),
      ts: Date.now(),
    };
    persistSaved([entry, ...saved.filter(s => s.name !== n)]);
    setName('');
  };

  const loadSaved = (s: SavedRoute) => {
    setRouteStr(s.route);
    setElements(parseRouteString(s.route));
  };

  const layerBtns: { key: keyof Layers; label: string }[] = [
    { key: 'airports', label: 'Airports' },
    { key: 'navaids', label: 'Navaids' },
    { key: 'waypoints', label: 'Waypoints' },
    { key: 'airways', label: 'Airways' },
  ];

  return (
    <div className="space-y-4">
      <div className="border border-sky-500/20 bg-sky-900/10 rounded-xl p-3">
        <h3 className="text-sky-300 font-bold text-sm">Route Planner — SkyVector style</h3>
        <p className="text-white/50 text-xs mt-1 leading-relaxed">
          Worldwide flight-plan routing on the nav database. Type a route in
          Item-15 syntax, or click symbols on the chart to build one. The router
          prefers published airway paths (RNAV → Jet → Victor) and falls back to a
          great-circle DCT when no airway path exists. Training aid only.
        </p>
      </div>

      {/* Auto-plan dep/dest */}
      <div className="border border-white/10 rounded-xl p-3 space-y-2">
        <div className="text-white/40 text-[10px] uppercase tracking-widest">Auto-plan from endpoints</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={dep}
            onChange={e => setDep(e.target.value.toUpperCase())}
            placeholder="DEP ICAO"
            maxLength={4}
            className="bg-black/30 border border-white/20 rounded px-2 py-1 text-white font-mono text-sm w-24 focus:border-sky-400 outline-none"
          />
          <span className="text-white/30">→</span>
          <input
            value={dest}
            onChange={e => setDest(e.target.value.toUpperCase())}
            placeholder="DEST ICAO"
            maxLength={4}
            className="bg-black/30 border border-white/20 rounded px-2 py-1 text-white font-mono text-sm w-24 focus:border-sky-400 outline-none"
          />
          <button
            onClick={handleAutoPlan}
            className="px-3 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
          >
            Plan route
          </button>
          <span className="text-white/30 text-[10px]">A* over airway graph · great-circle fallback</span>
        </div>
      </div>

      {/* Free-text route + chips */}
      <div className="border border-white/10 rounded-xl p-3 space-y-2">
        <div className="text-white/40 text-[10px] uppercase tracking-widest">Item 15 route</div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={routeStr}
            onChange={e => setRouteStr(e.target.value.toUpperCase())}
            placeholder="e.g. TBPB UA301 ANU DCT TJSJ"
            className="flex-1 min-w-[200px] bg-black/30 border border-white/20 rounded px-2 py-1 text-white font-mono text-xs focus:border-sky-400 outline-none"
          />
          <button onClick={handleParseString} className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-bold">Parse</button>
          <button onClick={() => { setElements([]); setRouteStr(''); }} className="px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/60 text-xs">Clear</button>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-[26px]">
          {elements.length === 0 && <span className="text-white/30 text-xs italic">No route — type one above, click Plan, or pick symbols on the map.</span>}
          {elements.map((el, i) => <TokenChip key={i} el={el} onRemove={() => removeAt(i)} />)}
        </div>
        {manualPlan.errors.length > 0 && (
          <div className="text-red-300 text-[11px] space-y-0.5">
            {manualPlan.errors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}
        {manualPlan.legs.length > 0 && (
          <div className="text-white/60 text-[11px] flex gap-3">
            <span>Total: <span className="text-sky-300 font-mono font-bold">{Math.round(manualPlan.totalNm)} NM</span></span>
            <span>Legs: <span className="text-white font-mono">{manualPlan.legs.length}</span></span>
            <span className="text-white/30">via {Array.from(new Set(manualPlan.legs.map(l => l.via))).join(' · ')}</span>
          </div>
        )}
      </div>

      {/* Fix search → add */}
      <div className="relative border border-white/10 rounded-xl p-3">
        <div className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Add fix (airport / VOR / NDB / waypoint)</div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value.toUpperCase())}
          placeholder="Type ident or name…"
          className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white font-mono text-xs focus:border-sky-400 outline-none"
        />
        <FixSuggest query={search} onPick={f => { handlePickFix(f); setSearch(''); }} />
      </div>

      {/* Layer toggles */}
      <div className="flex flex-wrap gap-1.5">
        {layerBtns.map(b => (
          <button
            key={b.key}
            onClick={() => setLayers(l => ({ ...l, [b.key]: !l[b.key] }))}
            className={`px-2 py-1 rounded-md border text-[10px] font-bold ${
              layers[b.key] ? 'border-sky-400 bg-sky-900/40 text-sky-200' : 'border-white/15 bg-black/20 text-white/40'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="border border-white/10 rounded-xl overflow-hidden">
        <RouteMap plan={manualPlan} onPickFix={handlePickFix} layers={layers} />
      </div>

      {/* Legs table */}
      {manualPlan.legs.length > 0 && (
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-white/5 text-white/60 text-xs font-bold uppercase tracking-widest">Legs</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/30 uppercase tracking-widest text-[10px]">
                <th className="text-left px-3 py-1 font-normal">From</th>
                <th className="text-left px-3 py-1 font-normal">Via</th>
                <th className="text-left px-3 py-1 font-normal">To</th>
                <th className="text-right px-3 py-1 font-normal">Brg°T</th>
                <th className="text-right px-3 py-1 font-normal">NM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {manualPlan.legs.map((l, i) => (
                <tr key={i} className={l.ok ? '' : 'bg-red-900/20'}>
                  <td className="px-3 py-1 font-mono text-white/80">{l.from.ident}</td>
                  <td className="px-3 py-1 font-mono text-orange-300">{l.via}</td>
                  <td className="px-3 py-1 font-mono text-white/80">{l.to.ident}</td>
                  <td className="px-3 py-1 font-mono text-right text-white/60">{Math.round(l.bearingTrue).toString().padStart(3, '0')}°</td>
                  <td className="px-3 py-1 font-mono text-right text-sky-300 font-bold">{Math.round(l.distanceNm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Saved routes */}
      <div className="border border-white/10 rounded-xl p-3 space-y-2">
        <div className="text-white/40 text-[10px] uppercase tracking-widest">Saved routes</div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Route name"
            className="flex-1 min-w-[160px] bg-black/30 border border-white/20 rounded px-2 py-1 text-white text-xs focus:border-sky-400 outline-none"
          />
          <button onClick={handleSave} className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Save current</button>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {saved.length === 0 && <p className="text-white/30 text-xs italic">No saved routes yet.</p>}
          {saved.map(s => (
            <div key={s.id} className="flex items-center gap-2 px-2 py-1 rounded border border-white/10 bg-black/20">
              <button onClick={() => loadSaved(s)} className="text-sky-300 text-xs font-bold hover:underline">{s.name}</button>
              <span className="text-white/40 text-[10px] font-mono truncate flex-1">{s.route}</span>
              <button onClick={() => persistSaved(saved.filter(x => x.id !== s.id))} className="text-white/30 hover:text-red-400 text-xs">×</button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-white/30 text-[10px]">
        Map tiles © OpenStreetMap © CARTO. Nav data: curated Caribbean seed plus
        worldwide regional aerodromes. Adapters for OpenAIP / OurAirports /
        AirportDB / AIRAC are wired in <code>src/lib/nav/adapters</code> for
        future data refreshes.
      </p>
    </div>
  );
};

// helper: build a great-circle preview path for an arbitrary pair (kept for
// future drag-to-insert reroutes).
export function _previewGcLine(a: Fix, b: Fix) {
  return greatCircleLine(a, b, 48);
}
