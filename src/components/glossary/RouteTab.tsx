import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AIRPORTS, type PlannerAirport } from './leaflet/airports';
import { greatCirclePoints, haversineKm, kmToNm } from './leaflet/geo';
import { THEMES, type PlannerTheme } from './leaflet/theme';

// ── Route Planner (Leaflet, phase 1 + phase 2) ──────────────────────────────
// World-scale map with hardcoded airport markers, a collapsible sidebar with
// departure/arrival selects + flight-plan fields, a dashed great-circle line
// drawn on selection, and a dark / SkyVector theme toggle.

const THEME_KEY = 'ais-route-leaflet-theme';

type FlightFields = { eobt: string; fuel: string; eet: string; eta: string; route: string };
const BLANK_FIELDS: FlightFields = { eobt: '', fuel: '', eet: '', eta: '', route: '' };

const findAirport = (icao: string): PlannerAirport | undefined =>
  AIRPORTS.find(a => a.icao === icao);

export const RouteTab: React.FC = () => {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);

  const [theme, setTheme] = useState<PlannerTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const v = window.localStorage.getItem(THEME_KEY);
    return v === 'skyvector' ? 'skyvector' : 'dark';
  });
  const [collapsed, setCollapsed] = useState(false);
  const [depIcao, setDepIcao] = useState('');
  const [arrIcao, setArrIcao] = useState('');
  const [depFields, setDepFields] = useState<FlightFields>(BLANK_FIELDS);
  const [arrFields, setArrFields] = useState<FlightFields>(BLANK_FIELDS);
  const [distanceNm, setDistanceNm] = useState<number | null>(null);

  const tokens = THEMES[theme];

  // ── Map bootstrap (runs once) ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapHostRef.current || mapRef.current) return;
    const map = L.map(mapHostRef.current, {
      center: [20, 0],
      zoom: 2,
      worldCopyJump: true,
      zoomControl: true,
    });
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      markersRef.current = null;
      routeRef.current = null;
    };
  }, []);

  // ── Theme / tile / marker styling ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;
    if (tileRef.current) { tileRef.current.remove(); tileRef.current = null; }
    tileRef.current = L.tileLayer(tokens.tileUrl, {
      attribution: tokens.tileAttribution,
      maxZoom: 18,
    }).addTo(map);
    // (re)draw markers in the active accent
    markers.clearLayers();
    for (const ap of AIRPORTS) {
      L.circleMarker([ap.lat, ap.lon], {
        radius: 5,
        color: tokens.accent,
        weight: 2,
        fillColor: tokens.accent,
        fillOpacity: 0.85,
      })
        .bindTooltip(`${ap.icao}${ap.iata ? ' · ' + ap.iata : ''}`, { direction: 'top', offset: [0, -6] })
        .bindPopup(`<strong>${ap.icao}${ap.iata ? ' / ' + ap.iata : ''}</strong><br/>${ap.name}`)
        .addTo(markers);
    }
    // restyle the existing route polyline if any
    if (routeRef.current) {
      routeRef.current.setStyle({ color: tokens.routeStroke });
    }
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, theme);
  }, [theme, tokens.tileUrl, tokens.tileAttribution, tokens.accent, tokens.routeStroke]);

  // ── Great-circle route + distance ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }
    const dep = findAirport(depIcao);
    const arr = findAirport(arrIcao);
    if (!dep || !arr || dep.icao === arr.icao) {
      setDistanceNm(null);
      return;
    }
    const pts = greatCirclePoints(dep, arr, 96);
    const line = L.polyline(pts, {
      color: tokens.routeStroke,
      weight: 2.5,
      opacity: 0.95,
      dashArray: '6 6',
    }).addTo(map);
    routeRef.current = line;
    setDistanceNm(kmToNm(haversineKm(dep, arr)));
    map.fitBounds(line.getBounds(), { padding: [40, 40] });
  }, [depIcao, arrIcao, tokens.routeStroke]);

  // Force Leaflet to recompute size when the sidebar collapses.
  useEffect(() => {
    const id = window.setTimeout(() => mapRef.current?.invalidateSize(), 250);
    return () => window.clearTimeout(id);
  }, [collapsed]);

  // Invalidate on container resize (tab re-mounts at different heights).
  useEffect(() => {
    const host = mapHostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const options = useMemo(
    () => AIRPORTS.map(a => (
      <option key={a.icao} value={a.icao}>
        {a.icao}{a.iata ? ` / ${a.iata}` : ''} — {a.name}
      </option>
    )),
    [],
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: tokens.inputBg,
    border: `1px solid ${tokens.inputBorder}`,
    color: tokens.inputText,
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 12,
    fontFamily: 'inherit',
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: tokens.panelMuted,
    display: 'block',
    marginBottom: 2,
  };

  const fieldGroup = (
    fields: FlightFields,
    setFields: React.Dispatch<React.SetStateAction<FlightFields>>,
  ) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
      <div>
        <label style={labelStyle}>EOBT</label>
        <input style={inputStyle} placeholder="HHMM" value={fields.eobt}
          onChange={e => setFields(f => ({ ...f, eobt: e.target.value }))} />
      </div>
      <div>
        <label style={labelStyle}>EET</label>
        <input style={inputStyle} placeholder="HHMM" value={fields.eet}
          onChange={e => setFields(f => ({ ...f, eet: e.target.value }))} />
      </div>
      <div>
        <label style={labelStyle}>ETA</label>
        <input style={inputStyle} placeholder="HHMM" value={fields.eta}
          onChange={e => setFields(f => ({ ...f, eta: e.target.value }))} />
      </div>
      <div>
        <label style={labelStyle}>Fuel (kg)</label>
        <input style={inputStyle} placeholder="—" value={fields.fuel}
          onChange={e => setFields(f => ({ ...f, fuel: e.target.value }))} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Route</label>
        <input style={inputStyle} placeholder="e.g. BGI DCT A555 FOF"
          value={fields.route}
          onChange={e => setFields(f => ({ ...f, route: e.target.value }))} />
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '70vh', minHeight: 480, overflow: 'hidden', borderRadius: 12 }}>
      <div ref={mapHostRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Sidebar */}
      <div
        style={{
          position: 'absolute',
          top: 12, left: 12, bottom: 12,
          width: collapsed ? 44 : 320,
          background: tokens.panelBg,
          border: `1px solid ${tokens.panelBorder}`,
          borderRadius: 10,
          color: tokens.panelText,
          backdropFilter: 'blur(6px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 180ms ease',
          zIndex: 500,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', borderBottom: `1px solid ${tokens.panelBorder}` }}>
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
                title="Toggle theme"
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
              <label style={labelStyle}>Departure Airport</label>
              <select style={inputStyle} value={depIcao} onChange={e => setDepIcao(e.target.value)}>
                <option value="">— Select —</option>
                {options}
              </select>
              {fieldGroup(depFields, setDepFields)}
            </div>

            <div>
              <label style={labelStyle}>Arrival Airport</label>
              <select style={inputStyle} value={arrIcao} onChange={e => setArrIcao(e.target.value)}>
                <option value="">— Select —</option>
                {options}
              </select>
              {fieldGroup(arrFields, setArrFields)}
            </div>

            <div style={{
              padding: '8px 10px',
              border: `1px solid ${tokens.panelBorder}`,
              borderRadius: 8,
              fontSize: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: tokens.panelMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10, fontWeight: 700 }}>
                Route Distance
              </span>
              <span style={{ fontFamily: '"Share Tech Mono", ui-monospace, monospace', fontWeight: 700, color: tokens.accent }}>
                {distanceNm == null ? '—' : `${distanceNm.toFixed(0)} NM`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteTab;
