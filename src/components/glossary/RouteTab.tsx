import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AIRPORTS, type PlannerAirport } from './leaflet/airports';
import { greatCirclePoints, haversineKm, kmToNm } from './leaflet/geo';
import { THEMES, type PlannerTheme } from './leaflet/theme';
import { NAVAIDS, WAYPOINTS, AIRWAYS, fixByIdent } from '@/lib/nav/db';
import { FIR_BOUNDARIES, firDisplayName } from '@/lib/nav/firs';
import { vorRoseRings, vorRoseTicks, vorRoseLabels } from '@/lib/nav/radials';
import { AIRCRAFT, aircraftById } from '@/lib/nav/aircraft';
import { computeFlightPlan, isValidHHMM } from '@/lib/nav/flightCalc';
import { parseRouteString, suggestToken } from '@/lib/nav/search';
import type { RouteElement } from '@/lib/nav/types';

// ── Full-screen Leaflet route planner ───────────────────────────────────────
const THEME_KEY = 'ais-route-leaflet-theme';
const AUTOCORRECT_KEY = 'ais-route-autocorrect';

type LayerKey = 'firs' | 'vorRose' | 'navaids' | 'waypoints' | 'airports' | 'airways';
const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  firs: true, vorRose: true, navaids: true, waypoints: false, airports: true, airways: false,
};

const findAirport = (icao: string): PlannerAirport | undefined =>
  AIRPORTS.find(a => a.icao === icao.trim().toUpperCase());

function firCentroid(coords: number[][][][]): [number, number] {
  const ring = coords[0]?.[0] ?? [];
  let sx = 0, sy = 0;
  for (const [lon, lat] of ring) { sx += lon; sy += lat; }
  const n = ring.length || 1;
  return [sy / n, sx / n];
}

// Region grouping for the airport picker.
function regionOf(a: PlannerAirport): string {
  const c = a.icao[0];
  if (a.icao.startsWith('T') || a.icao.startsWith('M')) return 'Caribbean & C. America';
  if (c === 'K' || c === 'C' || c === 'P') return 'North America';
  if (c === 'S') return 'South America';
  if (c === 'E' || c === 'L' || c === 'B' || c === 'U') return 'Europe';
  if (c === 'O' || c === 'H' || c === 'D' || c === 'F' || c === 'G') return 'MENA / Africa';
  if (c === 'V' || c === 'W' || c === 'R' || c === 'Z') return 'Asia';
  if (c === 'Y' || c === 'N' || c === 'A') return 'Oceania';
  return 'Other';
}

// Scale UI feature sizes with zoom.
function sizeFor(zoom: number, base: number, min = 0.5, max = 2.2): number {
  return Math.max(min, Math.min(max, zoom / 6)) * base;
}

// ── Airport combobox (typable + dropdown picker) ────────────────────────────
const AirportCombo: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  tokens: (typeof THEMES)[PlannerTheme];
}> = ({ value, onChange, placeholder, tokens }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = value.trim().toUpperCase();
    const list = q
      ? AIRPORTS.filter(a =>
          a.icao.includes(q) || a.iata.includes(q) || a.name.toUpperCase().includes(q))
      : AIRPORTS;
    return list.slice(0, 400);
  }, [value]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlannerAirport[]>();
    for (const a of filtered) {
      const r = regionOf(a);
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase())}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{
            flex: 1, background: tokens.inputBg,
            border: `1px solid ${tokens.inputBorder}`, color: tokens.inputText,
            borderRadius: 6, padding: '5px 8px', fontSize: 12,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width: 26, background: tokens.inputBg,
            border: `1px solid ${tokens.inputBorder}`, color: tokens.inputText,
            borderRadius: 6, fontSize: 11, cursor: 'pointer',
          }}
          aria-label="Toggle airport picker"
        >▾</button>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          maxHeight: 260, overflowY: 'auto',
          background: tokens.panelBg,
          border: `1px solid ${tokens.panelBorder}`,
          borderRadius: 6, zIndex: 700,
          fontSize: 11,
        }}>
          {grouped.length === 0 && (
            <div style={{ padding: 8, color: tokens.panelMuted }}>No matches</div>
          )}
          {grouped.map(([region, aps]) => (
            <div key={region}>
              <div style={{
                position: 'sticky', top: 0,
                background: tokens.panelBg, color: tokens.panelMuted,
                padding: '4px 8px', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                borderBottom: `1px solid ${tokens.panelBorder}`,
              }}>{region}</div>
              {aps.map(a => (
                <div
                  key={a.icao}
                  onClick={() => { onChange(a.icao); setOpen(false); }}
                  style={{
                    padding: '4px 8px', cursor: 'pointer',
                    color: tokens.panelText, display: 'flex', gap: 6,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = tokens.inputBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    color: tokens.accent, fontFamily: '"Share Tech Mono", monospace',
                    minWidth: 40,
                  }}>{a.icao}</span>
                  <span style={{ color: tokens.panelMuted, minWidth: 30 }}>{a.iata}</span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.name}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RouteTab: React.FC = () => {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const parsedRouteRef = useRef<L.Polyline | null>(null);
  const layersRef = useRef<Record<LayerKey, L.LayerGroup | null>>({
    firs: null, vorRose: null, navaids: null, waypoints: null, airports: null, airways: null,
  });

  const [theme, setTheme] = useState<PlannerTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.localStorage.getItem(THEME_KEY) === 'skyvector' ? 'skyvector' : 'dark';
  });
  const [collapsed, setCollapsed] = useState(false);
  const [depIcao, setDepIcao] = useState('');
  const [arrIcao, setArrIcao] = useState('');
  const [aircraftId, setAircraftId] = useState<string>('B738');
  const [eobt, setEobt] = useState('');
  const [eetOverride, setEetOverride] = useState<string | null>(null);
  const [fuelOverride, setFuelOverride] = useState<string | null>(null);
  const [etaOverride, setEtaOverride] = useState<string | null>(null);
  const [routeText, setRouteText] = useState('');
  const [autocorrect, setAutocorrect] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(AUTOCORRECT_KEY) === '1';
  });
  const [distanceNm, setDistanceNm] = useState<number | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(DEFAULT_LAYERS);
  const [zoom, setZoom] = useState(4);

  const tokens = THEMES[theme];
  const aircraft = aircraftById(aircraftId) ?? AIRCRAFT[3];

  // ── Route parsing & validation ─────────────────────────────────────────
  const parsedElements: RouteElement[] = useMemo(
    () => parseRouteString(routeText),
    [routeText],
  );
  const suggestions = useMemo(
    () => parsedElements.map(el => (el.error ? suggestToken(el.raw) : null)),
    [parsedElements],
  );
  const routeStats = useMemo(() => {
    let fixes = 0, airways = 0, errors = 0, suggest = 0;
    parsedElements.forEach((el, i) => {
      if (el.kind === 'fix' && el.fix) fixes++;
      else if (el.kind === 'airway' && el.airwayId) airways++;
      if (el.error) { errors++; if (suggestions[i]) suggest++; }
    });
    return { fixes, airways, errors, suggest };
  }, [parsedElements, suggestions]);

  // Distance used for planning: sum of leg distances if a valid route is
  // present, else the dep→arr great-circle.
  const planningDistanceNm = useMemo(() => {
    const dep = findAirport(depIcao); const arr = findAirport(arrIcao);
    if (!dep || !arr) return 0;
    const resolvedFixes = parsedElements
      .filter(el => el.kind === 'fix' && el.fix)
      .map(el => el.fix!);
    if (resolvedFixes.length === 0) return kmToNm(haversineKm(dep, arr));
    let total = 0;
    let prev: { lat: number; lon: number } = dep;
    for (const f of resolvedFixes) {
      total += kmToNm(haversineKm(prev, f));
      prev = f;
    }
    total += kmToNm(haversineKm(prev, arr));
    return total;
  }, [depIcao, arrIcao, parsedElements]);

  // Auto-calc EET/Fuel/ETA (fields the user hasn't overridden).
  const calc = useMemo(() => {
    if (!aircraft || planningDistanceNm <= 0) return null;
    return computeFlightPlan({
      distanceNm: planningDistanceNm,
      aircraft,
      eobt: isValidHHMM(eobt) ? eobt : undefined,
    });
  }, [planningDistanceNm, aircraft, eobt]);

  const eetHHMM = eetOverride ?? (calc ? String(calc.eetMin).padStart(4, '0').replace(/^(\d{1,2})(\d{2})$/, (_, h, m) => {
    const total = calc.eetMin;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}${String(total % 60).padStart(2, '0')}`;
  }) : '');
  const fuelKg = fuelOverride ?? (calc ? String(calc.fuelKg) : '');
  const etaVal = etaOverride ?? (calc?.etaHHMM ?? '');

  // ── Map bootstrap ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapHostRef.current || mapRef.current) return;
    const map = L.map(mapHostRef.current, {
      center: [15, -65], zoom: 4, worldCopyJump: true, zoomControl: true,
    });
    mapRef.current = map;
    (['firs', 'vorRose', 'airways', 'navaids', 'waypoints', 'airports'] as LayerKey[])
      .forEach(k => { layersRef.current[k] = L.layerGroup().addTo(map); });
    setZoom(map.getZoom());
    map.on('zoomend', () => setZoom(map.getZoom()));
    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      routeRef.current = null;
      parsedRouteRef.current = null;
      (Object.keys(layersRef.current) as LayerKey[]).forEach(k => { layersRef.current[k] = null; });
    };
  }, []);

  // ── Tile theme ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (tileRef.current) { tileRef.current.remove(); tileRef.current = null; }
    tileRef.current = L.tileLayer(tokens.tileUrl, {
      attribution: tokens.tileAttribution, maxZoom: 18,
    }).addTo(map);
    if (routeRef.current) routeRef.current.setStyle({ color: tokens.routeStroke });
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, theme);
  }, [theme, tokens.tileUrl, tokens.tileAttribution, tokens.routeStroke]);

  // Bucket zoom to reduce feature-layer rebuilds.
  const zoomBucket = Math.round(zoom);

  // ── Build feature layers (rebuilds on theme / zoom bucket change) ────────
  useEffect(() => {
    const groups = layersRef.current;
    const z = zoomBucket;

    const labelFont = Math.max(7, Math.min(14, Math.round(sizeFor(z, 10))));
    const smallFont = Math.max(7, Math.min(13, Math.round(sizeFor(z, 9))));
    const apRadius = Math.max(2, sizeFor(z, 5));
    const navRadius = Math.max(1.5, sizeFor(z, 4));
    const wptRadius = Math.max(1, sizeFor(z, 2.5));

    // FIR boundaries + labels
    if (groups.firs) {
      groups.firs.clearLayers();
      for (const f of FIR_BOUNDARIES) {
        for (const poly of f.coordinates) {
          const rings = poly.map(r => r.map(([lon, lat]) => [lat, lon] as [number, number]));
          L.polygon(rings, {
            color: tokens.accent, weight: 1, opacity: 0.55, fill: false, dashArray: '4 4',
          }).bindTooltip(`${f.ident} — ${firDisplayName(f.ident)}`).addTo(groups.firs);
        }
        const [clat, clon] = firCentroid(f.coordinates);
        L.marker([clat, clon], {
          interactive: false,
          icon: L.divIcon({
            className: 'fir-label',
            html: `<div style="color:${tokens.accent};font:700 ${labelFont}px/1 Inter,sans-serif;text-shadow:0 0 4px ${tokens.panelBg};letter-spacing:.1em;white-space:nowrap;opacity:.85">${f.ident}</div>`,
          }),
        }).addTo(groups.firs);
      }
    }

    // VOR rose — gated by zoom ≥ 6 to reduce clutter at world scale.
    if (groups.vorRose) {
      groups.vorRose.clearLayers();
      if (z >= 6) {
        for (const ring of vorRoseRings().features) {
          const pts = ring.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
          L.polyline(pts, { color: tokens.accent, weight: 0.8, opacity: 0.55 }).addTo(groups.vorRose);
        }
        for (const tick of vorRoseTicks().features) {
          const pts = tick.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
          L.polyline(pts, {
            color: tokens.accent,
            weight: (tick.properties as { long?: boolean }).long ? 1.2 : 0.6,
            opacity: 0.7,
          }).addTo(groups.vorRose);
        }
        for (const lbl of vorRoseLabels().features) {
          const [lon, lat] = lbl.geometry.coordinates;
          const props = lbl.properties as { label: string };
          L.marker([lat, lon], {
            interactive: false,
            icon: L.divIcon({
              className: 'vor-radial-label',
              html: `<div style="color:${tokens.accent};font:600 ${smallFont - 1}px/1 'Share Tech Mono',monospace;opacity:.8">${props.label}</div>`,
            }),
          }).addTo(groups.vorRose);
        }
      }
    }

    // Navaids (labels hidden below zoom 4).
    if (groups.navaids) {
      groups.navaids.clearLayers();
      const showLabels = z >= 4;
      for (const n of NAVAIDS) {
        const isVor = n.type !== 'NDB';
        L.circleMarker([n.lat, n.lon], {
          radius: navRadius, color: tokens.accent, weight: 1.2,
          fillColor: isVor ? tokens.accent : 'transparent', fillOpacity: isVor ? 0.6 : 0,
        })
          .bindTooltip(`${n.ident} · ${n.type}${n.frequency ? ' · ' + n.frequency : ''}`)
          .addTo(groups.navaids);
        if (showLabels) {
          L.marker([n.lat, n.lon], {
            interactive: false,
            icon: L.divIcon({
              className: 'navaid-label',
              html: `<div style="color:${tokens.accent};font:600 ${smallFont}px/1 'Share Tech Mono',monospace;margin-left:${apRadius + 4}px;text-shadow:0 0 3px ${tokens.panelBg}">${n.ident}</div>`,
            }),
          }).addTo(groups.navaids);
        }
      }
    }

    // Waypoints (visible from zoom 5+).
    if (groups.waypoints) {
      groups.waypoints.clearLayers();
      if (z >= 5) {
        for (const w of WAYPOINTS) {
          L.circleMarker([w.lat, w.lon], {
            radius: wptRadius, color: tokens.accent, weight: 1, fillOpacity: 0.4, opacity: 0.7,
          }).bindTooltip(w.ident).addTo(groups.waypoints);
          if (z >= 6) {
            L.marker([w.lat, w.lon], {
              interactive: false,
              icon: L.divIcon({
                className: 'fix-label',
                html: `<div style="color:${tokens.panelText};font:500 ${smallFont - 1}px/1 Inter,sans-serif;margin-left:6px;opacity:.75">${w.ident}</div>`,
              }),
            }).addTo(groups.waypoints);
          }
        }
      }
    }

    // Airports — labels scale down at world zoom, always visible.
    if (groups.airports) {
      groups.airports.clearLayers();
      for (const ap of AIRPORTS) {
        L.circleMarker([ap.lat, ap.lon], {
          radius: apRadius, color: tokens.accent, weight: 2,
          fillColor: tokens.accent, fillOpacity: 0.85,
        })
          .bindTooltip(`${ap.icao}${ap.iata ? ' · ' + ap.iata : ''} — ${ap.name}`, { direction: 'top', offset: [0, -6] })
          .bindPopup(`<strong>${ap.icao}${ap.iata ? ' / ' + ap.iata : ''}</strong><br/>${ap.name}`)
          .addTo(groups.airports);
        const showName = z >= 5;
        L.marker([ap.lat, ap.lon], {
          interactive: false,
          icon: L.divIcon({
            className: 'airport-label',
            html: `<div style="color:${tokens.panelText};font:700 ${labelFont}px/1 Inter,sans-serif;margin:${apRadius * 2}px 0 0 ${apRadius + 4}px;text-shadow:0 0 4px ${tokens.panelBg}"><span style="color:${tokens.accent}">${ap.icao}</span>${showName ? ` ${ap.name}` : ''}</div>`,
          }),
        }).addTo(groups.airports);
      }
    }

    // Airways (visible from zoom 5+).
    if (groups.airways) {
      groups.airways.clearLayers();
      if (z >= 5) {
        for (const aw of AIRWAYS) {
          for (const seg of aw.segments) {
            const f = fixByIdent(seg.from); const t = fixByIdent(seg.to);
            if (!f || !t) continue;
            L.polyline([[f.lat, f.lon], [t.lat, t.lon]], {
              color: tokens.accent, weight: 1, opacity: 0.4,
            }).bindTooltip(`${aw.id} · ${seg.from}→${seg.to}`).addTo(groups.airways);
          }
        }
      }
    }
  }, [theme, tokens.accent, tokens.panelBg, tokens.panelText, zoomBucket]);

  // ── Layer visibility ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    (Object.keys(layers) as LayerKey[]).forEach(k => {
      const g = layersRef.current[k]; if (!g) return;
      if (layers[k]) { if (!map.hasLayer(g)) g.addTo(map); }
      else { if (map.hasLayer(g)) map.removeLayer(g); }
    });
  }, [layers]);

  // ── Great-circle route + parsed-route overlay + distance ────────────────
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }
    if (parsedRouteRef.current) { parsedRouteRef.current.remove(); parsedRouteRef.current = null; }

    const dep = findAirport(depIcao); const arr = findAirport(arrIcao);
    if (!dep || !arr || dep.icao === arr.icao) { setDistanceNm(null); return; }

    // Dashed great-circle (reference)
    const pts = greatCirclePoints(dep, arr, 96);
    const line = L.polyline(pts, {
      color: tokens.routeStroke, weight: 2, opacity: 0.7, dashArray: '6 6',
    }).addTo(map);
    routeRef.current = line;
    setDistanceNm(kmToNm(haversineKm(dep, arr)));

    // Solid parsed route through resolved waypoints
    const resolved = parsedElements
      .filter(el => el.kind === 'fix' && el.fix)
      .map(el => ({ lat: el.fix!.lat, lon: el.fix!.lon }));
    if (resolved.length > 0) {
      const legPts: [number, number][] = [];
      let prev: { lat: number; lon: number } = dep;
      const push = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
        greatCirclePoints(a, b, 32).forEach(p => legPts.push(p));
      };
      for (const f of resolved) { push(prev, f); prev = f; }
      push(prev, arr);
      const parsed = L.polyline(legPts, {
        color: tokens.routeStroke, weight: 2.8, opacity: 0.95,
      }).addTo(map);
      parsedRouteRef.current = parsed;
      map.fitBounds(parsed.getBounds(), { padding: [60, 60] });
    } else {
      map.fitBounds(line.getBounds(), { padding: [60, 60] });
    }
  }, [depIcao, arrIcao, parsedElements, tokens.routeStroke]);

  // Invalidate map size on collapse / container resize
  useEffect(() => {
    const id = window.setTimeout(() => mapRef.current?.invalidateSize(), 220);
    return () => window.clearTimeout(id);
  }, [collapsed]);
  useEffect(() => {
    const host = mapHostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTOCORRECT_KEY, autocorrect ? '1' : '0');
    }
  }, [autocorrect]);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: tokens.inputBg,
    border: `1px solid ${tokens.inputBorder}`, color: tokens.inputText,
    borderRadius: 6, padding: '5px 8px', fontSize: 12,
    fontFamily: 'inherit', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: tokens.panelMuted,
    display: 'block', marginBottom: 2,
  };

  const layerToggles: { key: LayerKey; label: string }[] = [
    { key: 'firs', label: 'FIR Boundaries' },
    { key: 'vorRose', label: 'VOR Rose (360°)' },
    { key: 'navaids', label: 'Navaids (VOR/NDB)' },
    { key: 'waypoints', label: 'Waypoints' },
    { key: 'airports', label: 'Airports' },
    { key: 'airways', label: 'Airways' },
  ];

  // Route field: replace an amber token with its suggestion, or accept all on blur.
  const applySuggestions = (only?: number) => {
    const tokens = routeText.trim().split(/\s+/);
    let changed = false;
    parsedElements.forEach((el, i) => {
      if (only != null && i !== only) return;
      if (el.error && suggestions[i]) { tokens[i] = suggestions[i]!; changed = true; }
    });
    if (changed) setRouteText(tokens.join(' '));
  };

  return (
    <div style={{
      position: 'relative', width: '100%',
      height: 'calc(100vh - 80px)', minHeight: 560,
      overflow: 'hidden', borderRadius: 12,
    }}>
      <div ref={mapHostRef} style={{ position: 'absolute', inset: 0 }} />

      <div
        style={{
          position: 'absolute', top: 12, left: 12, bottom: 12,
          width: collapsed ? 44 : 360,
          background: tokens.panelBg,
          border: `1px solid ${tokens.panelBorder}`,
          borderRadius: 10, color: tokens.panelText,
          backdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'width 180ms ease',
          zIndex: 500, fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', borderBottom: `1px solid ${tokens.panelBorder}`,
        }}>
          {!collapsed && (
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Flight Plan
            </span>
          )}
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {!collapsed && (
              <button
                onClick={() => setTheme(t => t === 'dark' ? 'skyvector' : 'dark')}
                style={{
                  background: 'transparent', color: tokens.panelText,
                  border: `1px solid ${tokens.panelBorder}`, borderRadius: 6,
                  padding: '3px 8px', fontSize: 10, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                }}
              >
                {theme === 'dark' ? 'SkyVector' : 'Dark'}
              </button>
            )}
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{
                background: 'transparent', color: tokens.panelText,
                border: `1px solid ${tokens.panelBorder}`, borderRadius: 6,
                padding: '3px 8px', fontSize: 12, lineHeight: 1, cursor: 'pointer',
              }}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? '›' : '‹'}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div style={{ padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Departure (ICAO)</label>
              <AirportCombo value={depIcao} onChange={setDepIcao} placeholder="e.g. TBPB" tokens={tokens} />
            </div>

            <div>
              <label style={labelStyle}>Arrival (ICAO)</label>
              <AirportCombo value={arrIcao} onChange={setArrIcao} placeholder="e.g. TTPP" tokens={tokens} />
            </div>

            <div>
              <label style={labelStyle}>Aircraft</label>
              <select
                value={aircraftId} onChange={e => setAircraftId(e.target.value)}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                {AIRCRAFT.map(a => (
                  <option key={a.id} value={a.id}>{a.id} — {a.label}</option>
                ))}
              </select>
              <div style={{ fontSize: 10, color: tokens.panelMuted, marginTop: 3 }}>
                {aircraft.tasKt} kt · {aircraft.burnKgHr} kg/hr · +{aircraft.reserveMin} min reserve
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <label style={labelStyle}>EOBT</label>
                <input style={inputStyle} placeholder="HHMM" value={eobt}
                  onChange={e => setEobt(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>EET</label>
                <input
                  style={{ ...inputStyle, opacity: eetOverride == null ? 0.85 : 1 }}
                  placeholder="HHMM"
                  value={eetHHMM}
                  onChange={e => setEetOverride(e.target.value)}
                  title={eetOverride == null ? 'Auto-calculated' : 'Manual override'}
                />
              </div>
              <div>
                <label style={labelStyle}>ETA</label>
                <input
                  style={{ ...inputStyle, opacity: etaOverride == null ? 0.85 : 1 }}
                  placeholder="HHMM"
                  value={etaVal}
                  onChange={e => setEtaOverride(e.target.value)}
                  title={etaOverride == null ? 'Auto-calculated from EOBT + EET' : 'Manual override'}
                />
              </div>
              <div>
                <label style={labelStyle}>Fuel (kg)</label>
                <input
                  style={{ ...inputStyle, opacity: fuelOverride == null ? 0.85 : 1 }}
                  placeholder="—"
                  value={fuelKg}
                  onChange={e => setFuelOverride(e.target.value)}
                  title={fuelOverride == null ? 'Auto-calculated' : 'Manual override'}
                />
              </div>
              {(eetOverride != null || fuelOverride != null || etaOverride != null) && (
                <button
                  onClick={() => { setEetOverride(null); setFuelOverride(null); setEtaOverride(null); }}
                  style={{
                    gridColumn: '1 / -1', background: 'transparent',
                    color: tokens.panelMuted, border: `1px dashed ${tokens.panelBorder}`,
                    borderRadius: 6, padding: '3px 6px', fontSize: 10, cursor: 'pointer',
                  }}
                >Reset auto-calculated fields</button>
              )}
            </div>

            <div>
              <label style={labelStyle}>Route</label>
              <textarea
                rows={2}
                spellCheck={false}
                value={routeText}
                onChange={e => setRouteText(e.target.value.toUpperCase())}
                onBlur={() => { if (autocorrect) applySuggestions(); }}
                placeholder="e.g. BGI UA301 ANU DCT TJSJ"
                style={{
                  ...inputStyle, resize: 'vertical', minHeight: 42,
                  fontFamily: '"Share Tech Mono", ui-monospace, monospace',
                }}
              />
              {parsedElements.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {parsedElements.map((el, i) => {
                    const ok = !el.error;
                    const hasSuggest = !!(el.error && suggestions[i]);
                    const bg = ok ? 'rgba(34,197,94,.18)' : hasSuggest ? 'rgba(245,158,11,.22)' : 'rgba(239,68,68,.22)';
                    const border = ok ? 'rgba(34,197,94,.55)' : hasSuggest ? 'rgba(245,158,11,.6)' : 'rgba(239,68,68,.6)';
                    const title = ok
                      ? `${el.kind}${el.airwayId ? ' ' + el.airwayId : el.fix ? ' ' + el.fix.kind : ''}`
                      : hasSuggest ? `Unknown — click to accept "${suggestions[i]}"` : el.error;
                    return (
                      <span
                        key={i}
                        title={title}
                        onClick={() => hasSuggest && applySuggestions(i)}
                        style={{
                          background: bg, border: `1px solid ${border}`,
                          color: tokens.panelText, borderRadius: 4,
                          padding: '1px 6px', fontSize: 10,
                          fontFamily: '"Share Tech Mono", monospace',
                          cursor: hasSuggest ? 'pointer' : 'default',
                        }}
                      >
                        {el.raw}{hasSuggest ? ` → ${suggestions[i]}` : ''}
                      </span>
                    );
                  })}
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 6, fontSize: 10, color: tokens.panelMuted,
              }}>
                <span>{routeStats.fixes} fix · {routeStats.airways} awy · {routeStats.errors} err</span>
                <label style={{ display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={autocorrect}
                    onChange={e => setAutocorrect(e.target.checked)}
                    style={{ accentColor: tokens.accent }}
                  />
                  Autocorrect on blur
                </label>
              </div>
              {routeStats.suggest > 0 && !autocorrect && (
                <button
                  onClick={() => applySuggestions()}
                  style={{
                    marginTop: 4, width: '100%',
                    background: 'transparent', color: tokens.accent,
                    border: `1px dashed ${tokens.accent}`, borderRadius: 6,
                    padding: '3px 6px', fontSize: 10, cursor: 'pointer',
                  }}
                >Accept {routeStats.suggest} suggestion{routeStats.suggest > 1 ? 's' : ''}</button>
              )}
            </div>

            <div style={{
              padding: '8px 10px',
              border: `1px solid ${tokens.panelBorder}`,
              borderRadius: 8, fontSize: 12,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: tokens.panelMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10, fontWeight: 700 }}>
                  Direct (GC)
                </span>
                <span style={{ fontFamily: '"Share Tech Mono", monospace', fontWeight: 700, color: tokens.accent }}>
                  {distanceNm == null ? '—' : `${distanceNm.toFixed(0)} NM`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: tokens.panelMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10, fontWeight: 700 }}>
                  Planning
                </span>
                <span style={{ fontFamily: '"Share Tech Mono", monospace', fontWeight: 700, color: tokens.accent }}>
                  {planningDistanceNm > 0 ? `${planningDistanceNm.toFixed(0)} NM` : '—'}
                </span>
              </div>
            </div>

            <div style={{
              borderTop: `1px solid ${tokens.panelBorder}`,
              paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: tokens.panelMuted,
              }}>
                Map Layers
              </span>
              {layerToggles.map(({ key, label }) => (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, cursor: 'pointer', userSelect: 'none',
                }}>
                  <input
                    type="checkbox" checked={layers[key]}
                    onChange={e => setLayers(s => ({ ...s, [key]: e.target.checked }))}
                    style={{ accentColor: tokens.accent }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteTab;
