import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AIRPORTS, type PlannerAirport } from './leaflet/airports';
import { greatCirclePoints, haversineKm, kmToNm } from './leaflet/geo';
import { THEMES, type PlannerTheme } from './leaflet/theme';
import { NAVAIDS, WAYPOINTS, AIRWAYS, fixByIdent } from '@/lib/nav/db';
import { FIR_BOUNDARIES, firDisplayName } from '@/lib/nav/firs';
import { vorRoseRings, vorRoseTicks, vorRoseLabels } from '@/lib/nav/radials';

// ── Full-screen Leaflet route planner ───────────────────────────────────────
// Map fills the viewport. Sidebar (collapsible) holds typable dep/arr fields,
// flight-plan inputs, layer toggles, theme switch and live distance readout.

const THEME_KEY = 'ais-route-leaflet-theme';

type FlightFields = { eobt: string; fuel: string; eet: string; eta: string; route: string };
const BLANK_FIELDS: FlightFields = { eobt: '', fuel: '', eet: '', eta: '', route: '' };

type LayerKey = 'firs' | 'vorRose' | 'navaids' | 'waypoints' | 'airports' | 'airways';
const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  firs: true, vorRose: true, navaids: true, waypoints: false, airports: true, airways: false,
};

const findAirport = (icao: string): PlannerAirport | undefined =>
  AIRPORTS.find(a => a.icao === icao.trim().toUpperCase());

// Polygon centroid (average of outer ring) for FIR labels.
function firCentroid(coords: number[][][][]): [number, number] {
  const ring = coords[0]?.[0] ?? [];
  let sx = 0, sy = 0;
  for (const [lon, lat] of ring) { sx += lon; sy += lat; }
  const n = ring.length || 1;
  return [sy / n, sx / n];
}

export const RouteTab: React.FC = () => {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
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
  const [depFields, setDepFields] = useState<FlightFields>(BLANK_FIELDS);
  const [arrFields, setArrFields] = useState<FlightFields>(BLANK_FIELDS);
  const [distanceNm, setDistanceNm] = useState<number | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(DEFAULT_LAYERS);

  const tokens = THEMES[theme];

  // ── Map bootstrap ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapHostRef.current || mapRef.current) return;
    const map = L.map(mapHostRef.current, {
      center: [15, -65], zoom: 4, worldCopyJump: true, zoomControl: true,
    });
    mapRef.current = map;
    (['firs', 'vorRose', 'airways', 'navaids', 'waypoints', 'airports'] as LayerKey[])
      .forEach(k => { layersRef.current[k] = L.layerGroup().addTo(map); });
    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      routeRef.current = null;
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

  // ── Build feature layers (rebuilt on theme change for colour consistency) ─
  useEffect(() => {
    const L_ = L;
    const groups = layersRef.current;

    // FIR boundaries + labels
    if (groups.firs) {
      groups.firs.clearLayers();
      for (const f of FIR_BOUNDARIES) {
        for (const poly of f.coordinates) {
          const rings = poly.map(r => r.map(([lon, lat]) => [lat, lon] as [number, number]));
          L_.polygon(rings, {
            color: tokens.accent, weight: 1, opacity: 0.55, fill: false, dashArray: '4 4',
          }).bindTooltip(`${f.ident} — ${firDisplayName(f.ident)}`).addTo(groups.firs);
        }
        const [clat, clon] = firCentroid(f.coordinates);
        L_.marker([clat, clon], {
          interactive: false,
          icon: L_.divIcon({
            className: 'fir-label',
            html: `<div style="color:${tokens.accent};font:700 10px/1 Inter,sans-serif;text-shadow:0 0 4px ${tokens.panelBg};letter-spacing:.1em;white-space:nowrap;opacity:.85">${f.ident}</div>`,
          }),
        }).addTo(groups.firs);
      }
    }

    // VOR compass rose
    if (groups.vorRose) {
      groups.vorRose.clearLayers();
      for (const ring of vorRoseRings().features) {
        const pts = ring.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
        L_.polyline(pts, { color: tokens.accent, weight: 0.8, opacity: 0.55 }).addTo(groups.vorRose);
      }
      for (const tick of vorRoseTicks().features) {
        const pts = tick.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
        L_.polyline(pts, {
          color: tokens.accent,
          weight: (tick.properties as { long?: boolean }).long ? 1.2 : 0.6,
          opacity: 0.7,
        }).addTo(groups.vorRose);
      }
      for (const lbl of vorRoseLabels().features) {
        const [lon, lat] = lbl.geometry.coordinates;
        const props = lbl.properties as { label: string };
        L_.marker([lat, lon], {
          interactive: false,
          icon: L_.divIcon({
            className: 'vor-radial-label',
            html: `<div style="color:${tokens.accent};font:600 8px/1 'Share Tech Mono',monospace;opacity:.8">${props.label}</div>`,
          }),
        }).addTo(groups.vorRose);
      }
    }

    // Navaids (VOR / NDB)
    if (groups.navaids) {
      groups.navaids.clearLayers();
      for (const n of NAVAIDS) {
        const isVor = n.type !== 'NDB';
        L_.circleMarker([n.lat, n.lon], {
          radius: 4, color: tokens.accent, weight: 1.5,
          fillColor: isVor ? tokens.accent : 'transparent', fillOpacity: isVor ? 0.6 : 0,
        })
          .bindTooltip(`${n.ident} · ${n.type}${n.frequency ? ' · ' + n.frequency : ''}`)
          .addTo(groups.navaids);
        L_.marker([n.lat, n.lon], {
          interactive: false,
          icon: L_.divIcon({
            className: 'navaid-label',
            html: `<div style="color:${tokens.accent};font:600 10px/1 'Share Tech Mono',monospace;margin-left:8px;text-shadow:0 0 3px ${tokens.panelBg}">${n.ident}</div>`,
          }),
        }).addTo(groups.navaids);
      }
    }

    // Waypoints (fixes)
    if (groups.waypoints) {
      groups.waypoints.clearLayers();
      for (const w of WAYPOINTS) {
        L_.circleMarker([w.lat, w.lon], {
          radius: 2.5, color: tokens.accent, weight: 1, fillOpacity: 0.4, opacity: 0.7,
        }).bindTooltip(w.ident).addTo(groups.waypoints);
        L_.marker([w.lat, w.lon], {
          interactive: false,
          icon: L_.divIcon({
            className: 'fix-label',
            html: `<div style="color:${tokens.panelText};font:500 9px/1 Inter,sans-serif;margin-left:6px;opacity:.75">${w.ident}</div>`,
          }),
        }).addTo(groups.waypoints);
      }
    }

    // Airports
    if (groups.airports) {
      groups.airports.clearLayers();
      for (const ap of AIRPORTS) {
        L_.circleMarker([ap.lat, ap.lon], {
          radius: 5, color: tokens.accent, weight: 2,
          fillColor: tokens.accent, fillOpacity: 0.85,
        })
          .bindTooltip(`${ap.icao}${ap.iata ? ' · ' + ap.iata : ''} — ${ap.name}`, { direction: 'top', offset: [0, -6] })
          .bindPopup(`<strong>${ap.icao}${ap.iata ? ' / ' + ap.iata : ''}</strong><br/>${ap.name}`)
          .addTo(groups.airports);
        L_.marker([ap.lat, ap.lon], {
          interactive: false,
          icon: L_.divIcon({
            className: 'airport-label',
            html: `<div style="color:${tokens.panelText};font:700 10px/1 Inter,sans-serif;margin:10px 0 0 8px;text-shadow:0 0 4px ${tokens.panelBg}"><span style="color:${tokens.accent}">${ap.icao}</span> ${ap.name}</div>`,
          }),
        }).addTo(groups.airports);
      }
    }

    // Airways
    if (groups.airways) {
      groups.airways.clearLayers();
      for (const aw of AIRWAYS) {
        for (const seg of aw.segments) {
          const f = fixByIdent(seg.from); const t = fixByIdent(seg.to);
          if (!f || !t) continue;
          L_.polyline([[f.lat, f.lon], [t.lat, t.lon]], {
            color: tokens.accent, weight: 1, opacity: 0.4,
          }).bindTooltip(`${aw.id} · ${seg.from}→${seg.to}`).addTo(groups.airways);
        }
      }
    }
  }, [theme, tokens.accent, tokens.panelBg, tokens.panelText]);

  // ── Layer visibility ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    (Object.keys(layers) as LayerKey[]).forEach(k => {
      const g = layersRef.current[k]; if (!g) return;
      if (layers[k]) { if (!map.hasLayer(g)) g.addTo(map); }
      else { if (map.hasLayer(g)) map.removeLayer(g); }
    });
  }, [layers]);

  // ── Great-circle route + distance ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }
    const dep = findAirport(depIcao); const arr = findAirport(arrIcao);
    if (!dep || !arr || dep.icao === arr.icao) { setDistanceNm(null); return; }
    const pts = greatCirclePoints(dep, arr, 96);
    const line = L.polyline(pts, {
      color: tokens.routeStroke, weight: 2.5, opacity: 0.95, dashArray: '6 6',
    }).addTo(map);
    routeRef.current = line;
    setDistanceNm(kmToNm(haversineKm(dep, arr)));
    map.fitBounds(line.getBounds(), { padding: [60, 60] });
  }, [depIcao, arrIcao, tokens.routeStroke]);

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

  const datalistOptions = useMemo(
    () => AIRPORTS.map(a => (
      <option key={a.icao} value={a.icao}>{a.iata ? `${a.iata} — ` : ''}{a.name}</option>
    )),
    [],
  );

  const layerToggles: { key: LayerKey; label: string }[] = [
    { key: 'firs', label: 'FIR Boundaries' },
    { key: 'vorRose', label: 'VOR Rose (360°)' },
    { key: 'navaids', label: 'Navaids (VOR/NDB)' },
    { key: 'waypoints', label: 'Waypoints' },
    { key: 'airports', label: 'Airports' },
    { key: 'airways', label: 'Airways' },
  ];

  const fieldGroup = (
    fields: FlightFields,
    setFields: React.Dispatch<React.SetStateAction<FlightFields>>,
  ) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
      <div><label style={labelStyle}>EOBT</label>
        <input style={inputStyle} placeholder="HHMM" value={fields.eobt}
          onChange={e => setFields(f => ({ ...f, eobt: e.target.value }))} /></div>
      <div><label style={labelStyle}>EET</label>
        <input style={inputStyle} placeholder="HHMM" value={fields.eet}
          onChange={e => setFields(f => ({ ...f, eet: e.target.value }))} /></div>
      <div><label style={labelStyle}>ETA</label>
        <input style={inputStyle} placeholder="HHMM" value={fields.eta}
          onChange={e => setFields(f => ({ ...f, eta: e.target.value }))} /></div>
      <div><label style={labelStyle}>Fuel (kg)</label>
        <input style={inputStyle} placeholder="—" value={fields.fuel}
          onChange={e => setFields(f => ({ ...f, fuel: e.target.value }))} /></div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Route</label>
        <input style={inputStyle} placeholder="e.g. BGI DCT A555 FOF" value={fields.route}
          onChange={e => setFields(f => ({ ...f, route: e.target.value }))} /></div>
    </div>
  );

  return (
    <div style={{
      position: 'relative', width: '100%',
      height: 'calc(100vh - 80px)', minHeight: 560,
      overflow: 'hidden', borderRadius: 12,
    }}>
      <div ref={mapHostRef} style={{ position: 'absolute', inset: 0 }} />

      <datalist id="planner-airport-list">{datalistOptions}</datalist>

      <div
        style={{
          position: 'absolute', top: 12, left: 12, bottom: 12,
          width: collapsed ? 44 : 340,
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
              <input
                style={inputStyle} list="planner-airport-list"
                placeholder="e.g. TBPB" value={depIcao}
                onChange={e => setDepIcao(e.target.value.toUpperCase())}
              />
              {fieldGroup(depFields, setDepFields)}
            </div>

            <div>
              <label style={labelStyle}>Arrival (ICAO)</label>
              <input
                style={inputStyle} list="planner-airport-list"
                placeholder="e.g. TTPP" value={arrIcao}
                onChange={e => setArrIcao(e.target.value.toUpperCase())}
              />
              {fieldGroup(arrFields, setArrFields)}
            </div>

            <div style={{
              padding: '8px 10px',
              border: `1px solid ${tokens.panelBorder}`,
              borderRadius: 8, fontSize: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: tokens.panelMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10, fontWeight: 700 }}>
                Route Distance
              </span>
              <span style={{ fontFamily: '"Share Tech Mono", ui-monospace, monospace', fontWeight: 700, color: tokens.accent }}>
                {distanceNm == null ? '—' : `${distanceNm.toFixed(0)} NM`}
              </span>
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
