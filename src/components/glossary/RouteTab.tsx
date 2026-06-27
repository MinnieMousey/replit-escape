import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MLMap, GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AIRPORTS, NAVAIDS, WAYPOINTS, AIRWAYS, fixByIdent, nearestFix,
} from '@/lib/nav/db';
import { parseRouteString, searchFixes } from '@/lib/nav/search';
import { planRoute, validateManualRoute } from '@/lib/nav/router';
import { greatCircleLine } from '@/lib/nav/greatCircle';
import {
  FIR_BOUNDARIES, firDisplayName, firTier, detectFirTransitions,
} from '@/lib/nav/firs';
import { vorRoseRings, vorRoseTicks, vorRoseLabels } from '@/lib/nav/radials';
import { firEdgeLabelsGeo } from '@/lib/nav/firEdgePoints';
import type { Fix, PlannedRoute, RouteElement } from '@/lib/nav/types';

// Trim verbose airport names for the on-map label ("Country — Foo Int'l" → "Foo").
const shortAirportName = (full: string | undefined): string => {
  if (!full) return '';
  const dash = full.indexOf('—');
  let s = dash >= 0 ? full.slice(dash + 1) : full;
  s = s.replace(/\bInternational\b/gi, '').replace(/\bInt['’]?l\b/gi, '').replace(/\s+/g, ' ').trim();
  return s.length > 28 ? s.slice(0, 27) + '…' : s;
};

// ── Route Planner & Mapper (SkyVector-style, MapLibre engine) ───────────────
// Worldwide-scale route editor backed by the nav engine in src/lib/nav/*.
// Adds chart-tier toggles (VFR / IFR-Lo / IFR-Hi), a SkyVector-blue theme,
// FIR overlay + entry/exit annotation, plus collapse + fullscreen controls.

const SAVED_ROUTES_KEY = 'ais-shift-saved-routes-v2';
const THEME_KEY = 'ais-route-theme';
const TIER_KEY = 'ais-route-tier';
const COLLAPSE_KEY = 'ais-route-map-collapsed';
interface SavedRoute { id: string; name: string; route: string; ts: number; }

type Theme = 'dark' | 'skyvector';
type Tier = 'VFR' | 'IFR_LO' | 'IFR_HI';

// SkyVector-style symbology colours per theme.
const PALETTE = {
  dark: {
    bg: '#0b1220',
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
    firStroke: '#1e6fb8',
    firFill: '#0ea5e9',
    firLabel: '#bae6fd',
    labelHalo: '#0b1220',
  },
  skyvector: {
    bg: '#cfe8ff',
    airport: '#1e40af',
    vor: '#0b5394',
    vordme: '#0b5394',
    ndb: '#c2410c',
    waypoint: '#1f2937',
    awyVictor: '#1d4ed8',
    awyJet: '#9333ea',
    awyRnav: '#15803d',
    awyOceanic: '#0e7490',
    awyLow: '#475569',
    route: '#b91c1c',
    firStroke: '#1e6fb8',
    firFill: '#3b82f6',
    firLabel: '#0f172a',
    labelHalo: '#ffffff',
  },
} as const;

const styleFor = (theme: Theme): maplibregl.StyleSpecification => {
  const dark = theme === 'dark';
  const tiles = dark
    ? [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ]
    : [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ];
  return {
    version: 8,
    sources: {
      base: { type: 'raster', tiles, tileSize: 256, attribution: '© OpenStreetMap © CARTO' },
    },
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': PALETTE[theme].bg } },
      { id: 'base-tiles', type: 'raster', source: 'base' },
    ],
  } as maplibregl.StyleSpecification;
};

// ── GeoJSON builders ────────────────────────────────────────────────────────
const airportsGeo = () => ({
  type: 'FeatureCollection' as const,
  features: AIRPORTS.map(a => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [a.lon, a.lat] },
    properties: { ident: a.icao, kind: 'airport', label: a.icao, name: a.name, shortName: shortAirportName(a.name) },
  })),
});

const navaidsGeo = () => ({
  type: 'FeatureCollection' as const,
  features: NAVAIDS.map(n => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [n.lon, n.lat] },
    properties: { ident: n.ident, kind: 'navaid', subtype: n.type, label: n.ident, name: n.name, freq: n.frequency ?? null },
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
      properties: { id: a.id, type: a.type, label: a.id },
    };
  }).filter((x): x is NonNullable<typeof x> => !!x)),
});

const firFillGeo = () => ({
  type: 'FeatureCollection' as const,
  features: FIR_BOUNDARIES.map(f => ({
    type: 'Feature' as const,
    geometry: { type: 'MultiPolygon' as const, coordinates: f.coordinates },
    properties: { ident: f.ident, name: firDisplayName(f.ident), tier: firTier(f.ident) },
  })),
});

const firLabelGeo = () => ({
  type: 'FeatureCollection' as const,
  features: FIR_BOUNDARIES.map(f => {
    // Use the largest ring's centroid as the label anchor.
    let ring: number[][] = [];
    for (const poly of f.coordinates) {
      const outer = poly[0] ?? [];
      if (outer.length > ring.length) ring = outer;
    }
    if (ring.length < 3) return null;
    const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const cLon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    return {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [cLon, cLat] },
      properties: { ident: f.ident, name: firDisplayName(f.ident), tier: firTier(f.ident) },
    };
  }).filter((x): x is NonNullable<typeof x> => !!x),
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
interface Layers {
  airports: boolean;
  navaids: boolean;
  waypoints: boolean;
  airways: boolean;
  firs: boolean;
  vorIds: boolean;
  vorRose: boolean;
  apNames: boolean;
}

interface MapProps {
  plan: PlannedRoute;
  onPickFix: (fix: Fix) => void;
  layers: Layers;
  tier: Tier;
  theme: Theme;
}

const RouteMap: React.FC<MapProps> = ({ plan, onPickFix, layers, tier, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const ready = useRef(false);

  // (Re)build map whenever the theme changes.
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; ready.current = false; }
    const pal = PALETTE[theme];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(theme),
      center: [-60, 15],
      zoom: 3.5,
      maxPitch: 0,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      ready.current = true;
      map.addSource('firs', { type: 'geojson', data: firFillGeo() });
      map.addSource('fir-labels', { type: 'geojson', data: firLabelGeo() });
      map.addSource('fir-edges', { type: 'geojson', data: firEdgeLabelsGeo() });
      map.addSource('airways', { type: 'geojson', data: airwaysGeo() });
      map.addSource('airports', { type: 'geojson', data: airportsGeo() });
      map.addSource('navaids', { type: 'geojson', data: navaidsGeo() });
      map.addSource('waypoints', { type: 'geojson', data: waypointsGeo() });
      map.addSource('route', { type: 'geojson', data: routeGeo([]) });
      map.addSource('route-points', { type: 'geojson', data: routePointsGeo([]) });
      map.addSource('vor-rose-ring', { type: 'geojson', data: vorRoseRings() });
      map.addSource('vor-rose-tick', { type: 'geojson', data: vorRoseTicks() });
      map.addSource('vor-rose-label', { type: 'geojson', data: vorRoseLabels() });

      // FIR fill + solid SkyVector-blue stroke (under everything).
      map.addLayer({
        id: 'fir-fill', type: 'fill', source: 'firs',
        minzoom: 2,
        paint: {
          'fill-color': ['match', ['get', 'tier'], 'OCEANIC', pal.awyOceanic, pal.firFill],
          'fill-opacity': theme === 'dark' ? 0.05 : 0.03,
        },
      });
      map.addLayer({
        id: 'fir-stroke', type: 'line', source: 'firs',
        minzoom: 2,
        paint: {
          'line-color': pal.firStroke,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.8, 6, 1.6, 10, 2.4],
          'line-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'awy-line', type: 'line', source: 'airways',
        minzoom: 3,
        paint: {
          'line-color': [
            'match', ['get', 'type'],
            'JET', pal.awyJet,
            'UPPER', pal.awyJet,
            'VICTOR', pal.awyVictor,
            'LOW', pal.awyLow,
            'RNAV', pal.awyRnav,
            'OCEANIC', pal.awyOceanic,
            pal.awyVictor,
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.4, 8, 1.6],
          'line-opacity': 0.6,
        },
      });

      // Boxed inline airway labels along each segment (e.g. A632, R750).
      map.addLayer({
        id: 'awy-label', type: 'symbol', source: 'airways',
        minzoom: 5,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'id'],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 9, 10, 12],
          'text-letter-spacing': 0.05,
          'text-padding': 4,
          'text-rotation-alignment': 'viewport',
          'text-pitch-alignment': 'viewport',
          'symbol-spacing': 220,
        },
        paint: {
          'text-color': pal.firLabel,
          'text-halo-color': pal.labelHalo,
          'text-halo-width': 3.0,
          'text-halo-blur': 0.2,
        },
      });

      map.addLayer({
        id: 'navaid-symbol', type: 'circle', source: 'navaids',
        minzoom: 5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 9, 6],
          'circle-color': ['match', ['get', 'subtype'], 'NDB', pal.ndb, 'VORDME', pal.vordme, pal.vor],
          'circle-stroke-color': pal.labelHalo,
          'circle-stroke-width': 1.2,
        },
      });

      map.addLayer({
        id: 'waypoint-symbol', type: 'circle', source: 'waypoints',
        minzoom: 6,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 1.8, 10, 3.5],
          'circle-color': pal.waypoint,
          'circle-stroke-color': pal.labelHalo,
          'circle-stroke-width': 0.8,
        },
      });

      map.addLayer({
        id: 'airport-symbol', type: 'circle', source: 'airports',
        minzoom: 3,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.5, 9, 6.5],
          'circle-color': pal.airport,
          'circle-stroke-color': pal.labelHalo,
          'circle-stroke-width': 1.4,
        },
      });

      // ── Text labels (need glyphs). Use 'Open Sans Regular' which the
      // MapLibre demo glyphs server provides.
      map.addLayer({
        id: 'navaid-label', type: 'symbol', source: 'navaids',
        minzoom: 6,
        layout: {
          'text-field': ['get', 'ident'],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 9, 10, 12],
          'text-offset': [0.8, 0.4],
          'text-anchor': 'top-left',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': pal.vor,
          'text-halo-color': pal.labelHalo,
          'text-halo-width': 1.4,
        },
      });
      map.addLayer({
        id: 'airport-label', type: 'symbol', source: 'airports',
        minzoom: 5,
        layout: {
          'text-field': ['get', 'ident'],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 9, 10, 13],
          'text-offset': [0.8, 0],
          'text-anchor': 'left',
        },
        paint: {
          'text-color': pal.airport,
          'text-halo-color': pal.labelHalo,
          'text-halo-width': 1.4,
        },
      });
      // Aerodrome full names — beneath the ICAO label, smaller + lower opacity.
      map.addLayer({
        id: 'airport-name', type: 'symbol', source: 'airports',
        minzoom: 6,
        layout: {
          'text-field': ['get', 'shortName'],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 8, 11, 11],
          'text-offset': [0.8, 1.2],
          'text-anchor': 'left',
          'text-optional': true,
        },
        paint: {
          'text-color': pal.airport,
          'text-halo-color': pal.labelHalo,
          'text-halo-width': 1.2,
          'text-opacity': 0.75,
        },
      });

      // VOR compass rose — ring + ticks + degree labels. Visible from z≥7.
      map.addLayer({
        id: 'vor-rose-ring', type: 'line', source: 'vor-rose-ring',
        minzoom: 7,
        paint: {
          'line-color': pal.vor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 11, 1.1],
          'line-opacity': 0.55,
        },
      });
      map.addLayer({
        id: 'vor-rose-tick', type: 'line', source: 'vor-rose-tick',
        minzoom: 7,
        paint: {
          'line-color': pal.vor,
          'line-width': ['case', ['get', 'long'], 1.2, 0.6],
          'line-opacity': 0.75,
        },
      });
      map.addLayer({
        id: 'vor-rose-label', type: 'symbol', source: 'vor-rose-label',
        minzoom: 8,
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 8, 11, 10],
          'text-allow-overlap': false,
          'text-rotation-alignment': 'viewport',
        },
        paint: {
          'text-color': pal.vor,
          'text-halo-color': pal.labelHalo,
          'text-halo-width': 1.2,
          'text-opacity': 0.8,
        },
      });
      map.addLayer({
        id: 'fir-label', type: 'symbol', source: 'fir-labels',
        minzoom: 3,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 7, 16],
          'text-letter-spacing': 0.15,
          'text-transform': 'uppercase',
        },
        paint: {
          'text-color': pal.firLabel,
          'text-halo-color': pal.labelHalo,
          'text-halo-width': 1.6,
          'text-opacity': 0.85,
        },
      });

      // FIR junction labels — show both adjacent FIR idents where boundaries meet.
      map.addLayer({
        id: 'fir-edge-label', type: 'symbol', source: 'fir-edges',
        minzoom: 4,
        layout: {
          'text-field': ['get', 'idents'],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 8, 12],
          'text-letter-spacing': 0.08,
          'text-line-height': 1.1,
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': pal.firStroke,
          'text-halo-color': pal.labelHalo,
          'text-halo-width': 2.2,
        },
      });

      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        paint: {
          'line-color': ['case', ['get', 'ok'], pal.route, '#ef4444'],
          'line-width': 3.5,
          'line-opacity': 0.95,
        },
      });
      map.addLayer({
        id: 'route-point', type: 'circle', source: 'route-points',
        paint: {
          'circle-radius': 5,
          'circle-color': pal.labelHalo,
          'circle-stroke-color': pal.route,
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
  }, [onPickFix, theme]);

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

  // Layer visibility — driven by toggles AND chart tier.
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready.current) return;
    const set = (id: string, on: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };
    set('airport-symbol', layers.airports);
    set('airport-label',  layers.airports);
    set('airport-name',   layers.airports && layers.apNames);
    set('navaid-symbol',  layers.navaids);
    set('navaid-label',   layers.navaids && layers.vorIds);
    set('waypoint-symbol', layers.waypoints && tier !== 'IFR_HI');
    set('awy-line',       layers.airways);
    set('fir-fill',       layers.firs);
    set('fir-stroke',     layers.firs);
    set('fir-label',      layers.firs);
    set('vor-rose-ring',  layers.vorRose && layers.navaids);
    set('vor-rose-tick',  layers.vorRose && layers.navaids);
    set('vor-rose-label', layers.vorRose && layers.navaids);

    // Tier-driven airway filtering.
    if (map.getLayer('awy-line')) {
      const filter: maplibregl.FilterSpecification =
        tier === 'VFR' ? ['==', ['get', 'type'], '__none__'] :
        tier === 'IFR_LO' ? ['match', ['get', 'type'], ['VICTOR', 'LOW', 'RNAV'], true, false] :
        ['match', ['get', 'type'], ['JET', 'UPPER', 'RNAV', 'OCEANIC'], true, false];
      map.setFilter('awy-line', filter);
    }
    // Tier-driven navaid filtering: IFR-Hi hides NDBs.
    if (map.getLayer('navaid-symbol')) {
      const navFilter: maplibregl.FilterSpecification =
        tier === 'IFR_HI' ? ['!=', ['get', 'subtype'], 'NDB'] : ['has', 'ident'];
      map.setFilter('navaid-symbol', navFilter);
      map.setFilter('navaid-label', navFilter);
    }
  }, [layers, tier]);

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: 300 }} />;
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
  const [dest, setDest] = useState('MZBZ');
  const [elements, setElements] = useState<RouteElement[]>([]);
  const [routeStr, setRouteStr] = useState('');
  const [search, setSearch] = useState('');
  const [layers, setLayers] = useState<Layers>({
    airports: true, navaids: true, waypoints: true, airways: true, firs: true, vorIds: true, vorRose: false, apNames: true,
  });
  const [tier, setTier] = useState<Tier>(() =>
    (typeof localStorage !== 'undefined' && (localStorage.getItem(TIER_KEY) as Tier)) || 'IFR_LO');
  const [theme, setTheme] = useState<Theme>(() =>
    (typeof localStorage !== 'undefined' && (localStorage.getItem(THEME_KEY) as Theme)) || 'dark');
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    typeof localStorage !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1');
  const [fullscreen, setFullscreen] = useState(false);
  const [saved, setSaved] = useState<SavedRoute[]>([]);
  const [name, setName] = useState('');
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { localStorage.setItem(TIER_KEY, tier); } catch { /* ignore */ } }, [tier]);
  useEffect(() => { try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ } }, [theme]);
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);

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

  // FIR transitions across the whole planned path.
  const transitions = useMemo(() => {
    if (!manualPlan.legs.length) return [];
    const path = manualPlan.legs.flatMap((l, i) => i === 0 ? l.path : l.path.slice(1));
    return detectFirTransitions(path);
  }, [manualPlan]);

  const handleAutoPlan = useCallback(() => {
    const plan = planRoute(dep.trim().toUpperCase(), dest.trim().toUpperCase());
    setElements(plan.elements);
    setRouteStr(plan.elements.map(e => e.raw).join(' '));
  }, [dep, dest]);

  const handleParseString = useCallback(() => {
    setElements(parseRouteString(routeStr));
  }, [routeStr]);

  const handlePickFix = useCallback((fix: Fix) => {
    setElements(prev => {
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

  const toggleFullscreen = useCallback(() => {
    const el = mapWrapperRef.current;
    if (!el) return;
    // Prefer native FS API; fall back to the CSS-based overlay on iOS Safari.
    const d = document as Document & { webkitFullscreenElement?: Element | null };
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const r = el as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (r.requestFullscreen) r.requestFullscreen().catch(() => setFullscreen(f => !f));
      else if (r.webkitRequestFullscreen) r.webkitRequestFullscreen();
      else setFullscreen(true);
    } else {
      const dd = document as Document & { webkitExitFullscreen?: () => void };
      if (document.exitFullscreen) document.exitFullscreen().catch(() => { /* ignore */ });
      else if (dd.webkitExitFullscreen) dd.webkitExitFullscreen();
      setFullscreen(false);
    }
  }, []);

  // Track FS state changes so the CSS-overlay fallback stays in sync.
  useEffect(() => {
    const onFs = () => {
      const d = document as Document & { webkitFullscreenElement?: Element | null };
      setFullscreen(!!(d.fullscreenElement || d.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs as EventListener);
    };
  }, []);

  const layerBtns: { key: keyof Layers; label: string }[] = [
    { key: 'airports', label: 'Airports' },
    { key: 'apNames', label: 'AD Names' },
    { key: 'navaids', label: 'Navaids' },
    { key: 'vorIds', label: 'VOR IDs' },
    { key: 'vorRose', label: 'VOR Rose' },
    { key: 'waypoints', label: 'Waypoints' },
    { key: 'airways', label: 'Airways' },
    { key: 'firs', label: 'FIRs' },
  ];

  const tierBtns: { key: Tier; label: string; help: string }[] = [
    { key: 'VFR',    label: 'VFR',    help: 'Visual chart — airports + navaids, no airways' },
    { key: 'IFR_LO', label: 'IFR Lo', help: 'Low-altitude airways (V/RNAV-T)' },
    { key: 'IFR_HI', label: 'IFR Hi', help: 'High-altitude / jet / oceanic airways' },
  ];

  return (
    <div className="space-y-4">
      <div className="border border-sky-500/20 bg-sky-900/10 rounded-xl p-3">
        <h3 className="text-sky-300 font-bold text-sm">Route Planner — SkyVector style</h3>
        <p className="text-white/50 text-xs mt-1 leading-relaxed">
          Worldwide flight-plan routing on the WGS84 nav database. Pick a chart
          tier (VFR / IFR Lo / IFR Hi), type a route in Item-15 syntax, or click
          symbols on the chart to build one. The router prefers published airway
          paths (RNAV → Jet → Victor) and falls back to a great-circle DCT when
          no airway path exists. Training aid only.
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
            placeholder="e.g. TBPB DCT BGI UA301 ANU DCT MZBZ"
            className="flex-1 min-w-[200px] bg-black/30 border border-white/20 rounded px-2 py-1 text-white font-mono text-xs focus:border-sky-400 outline-none"
          />
          <button onClick={handleParseString} className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-bold">Parse & validate</button>
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
          <div className="text-white/60 text-[11px] flex gap-3 flex-wrap">
            <span>Total: <span className="text-sky-300 font-mono font-bold">{Math.round(manualPlan.totalNm)} NM</span></span>
            <span>Legs: <span className="text-white font-mono">{manualPlan.legs.length}</span></span>
            <span className="text-white/30">via {Array.from(new Set(manualPlan.legs.map(l => l.via))).join(' · ')}</span>
            <span className={manualPlan.errors.length ? 'text-red-300' : 'text-emerald-300'}>
              {manualPlan.errors.length ? '✗ invalid' : '✓ valid'}
            </span>
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

      {/* Tier + theme toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-white/15 overflow-hidden">
          {tierBtns.map(t => (
            <button
              key={t.key}
              onClick={() => setTier(t.key)}
              title={t.help}
              className={`px-3 py-1 text-[11px] font-bold ${
                tier === t.key ? 'bg-sky-600 text-white' : 'bg-black/20 text-white/60 hover:text-white'
              }`}
            >{t.label}</button>
          ))}
        </div>
        <button
          onClick={() => setTheme(t => t === 'dark' ? 'skyvector' : 'dark')}
          className="px-3 py-1 rounded-md border border-white/15 bg-black/20 text-white/70 hover:text-white text-[11px] font-bold"
          title="Toggle SkyVector bright-blue theme"
        >
          Theme: {theme === 'dark' ? 'Dark' : 'SkyVector'}
        </button>
        <div className="ml-auto flex flex-wrap gap-1.5">
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
      </div>

      {/* Map */}
      <div
        ref={mapWrapperRef}
        className={`border border-white/10 rounded-xl overflow-hidden bg-slate-900 ${
          fullscreen ? 'fixed inset-0 z-[100] rounded-none' : 'relative'
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-white/10">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-[11px] font-bold"
            aria-expanded={!collapsed}
            title={collapsed ? 'Show map' : 'Hide map'}
          >
            <span className="text-[9px] text-white/40">{collapsed ? '▸' : '▾'}</span>
            Route chart
          </button>
          <span className="text-white/30 text-[10px] hidden sm:inline">
            {tier === 'VFR' ? 'VFR chart' : tier === 'IFR_LO' ? 'IFR Low — V/RNAV-T airways' : 'IFR High — Jet/RNAV/Oceanic airways'}
          </span>
          <button
            onClick={toggleFullscreen}
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/15 bg-black/30 text-white/60 hover:text-white text-[10px] font-bold"
            title={fullscreen ? 'Exit full screen' : 'Full screen'}
          >
            <span aria-hidden="true">{fullscreen ? '✕' : '⛶'}</span> {fullscreen ? 'Exit' : 'Full screen'}
          </button>
        </div>
        {!collapsed && (
          <div
            className="w-full"
            style={{ height: fullscreen ? 'calc(100vh - 36px)' : 'clamp(360px, 60vh, 620px)' }}
          >
            <RouteMap plan={manualPlan} onPickFix={handlePickFix} layers={layers} tier={tier} theme={theme} />
          </div>
        )}
      </div>

      {/* FIR transitions */}
      {transitions.length > 0 && (
        <div className="border border-sky-500/20 bg-sky-900/10 rounded-xl p-3">
          <div className="text-sky-300 text-[11px] font-bold uppercase tracking-widest mb-1.5">FIR transitions</div>
          <ol className="space-y-0.5 text-white/70 text-[11px]">
            {transitions.map((t, i) => (
              <li key={i} className="font-mono">
                <span className="text-orange-300">{t.from ? firDisplayName(t.from) : '—'}</span>
                <span className="text-white/40"> → </span>
                <span className="text-sky-300">{t.to ? firDisplayName(t.to) : 'outside coverage'}</span>
                <span className="text-white/30 ml-2">
                  at {Math.abs(t.lat).toFixed(2)}°{t.lat >= 0 ? 'N' : 'S'} {Math.abs(t.lon).toFixed(2)}°{t.lon < 0 ? 'W' : 'E'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

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
        Map tiles © OpenStreetMap © CARTO. FIR boundaries © VATSIM VAT-Spy.
        Nav data: curated Caribbean seed plus worldwide regional aerodromes.
      </p>
    </div>
  );
};

// helper: build a great-circle preview path for an arbitrary pair (kept for
// future drag-to-insert reroutes).
export function _previewGcLine(a: Fix, b: Fix) {
  return greatCircleLine(a, b, 48);
}
