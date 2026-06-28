## Rebuild RouteTab with Leaflet (Phase 1 + Phase 2)

Replace the current MapLibre-based `RouteTab` with a Leaflet implementation that follows the user's vanilla-JS spec, wrapped in a thin React component so it fits the existing TanStack/React stack. Keep both themes (dark AIS default, SkyVector bright-blue toggle).

### Files

- **edit** `src/components/glossary/RouteTab.tsx` — rewrite as a Leaflet host. A single `useEffect` creates the `L.map` on a `div` ref and runs all logic via plain Leaflet/JS APIs (no `react-leaflet`). Cleans up on unmount.
- **new** `src/components/glossary/leaflet/airports.ts` — exported `AIRPORTS` array of test objects (`name`, `icao`, `iata`, `lat`, `lon`): KJFK New York, EGLL London, RJTT Tokyo, OMDB Dubai, KLAX Los Angeles, plus a handful of Caribbean/SA/NA hubs to satisfy "world airports" (TBPB, TTPP, MKJS, MZBZ, SBGR, SAEZ, CYYZ, KMIA, SKBO). Make sure to add all current airports on the existing map in this new map.
- **new** `src/components/glossary/leaflet/geo.ts` — pure-JS helpers: `haversineKm(a,b)`, `kmToNm(km)` (× 0.539957), `greatCirclePoints(a,b,segments=64)` (spherical interpolation, no external lib — avoids the CDN-script issue inside a bundled React app).
- **new** `src/components/glossary/leaflet/theme.ts` — two tile-layer configs and CSS variable sets: `dark` (CartoDB Dark Matter, slate panels, sky-300 accents — matches today's overlay) and `skyvector` (CartoDB Voyager/Positron, white panels, SkyVector cyan `#1f8fff`).

### Phase 1 — Map + sidebar

1. Mount a full-tab Leaflet map on a `div ref`, initial view world-centred (`[20, 0]`, zoom 2). Add the active theme's tile layer; swap layers when the theme toggle changes.
2. For each airport in `AIRPORTS`, add `L.circleMarker([lat,lon], { radius: 5, color: accent, weight: 2, fillOpacity: 0.9 })` with a `.bindTooltip(\`${icao} · ${iata})`and`.bindPopup` showing full name.
3. Sidebar (left, collapsible, themed): two native `<select>` dropdowns "Departure Airport" and "Arrival Airport", both populated from `AIRPORTS` (option label `ICAO — Name`). Under each, all text inputs necessary for flights according to the SkyVector example: **EOBT** (HHMM), **FUEL** (kg), **EET** (HHMM), **ETA**(HHMM), and a **ROUTE** (string of NBDs, VORs, waypoints, routes, and FIRs that link to make an intended route plan shwon in real time as inputted- eg. BGI DCT A555 FOF) all blank by default, stored in component state — no validation beyond input pattern. Default-empty placeholder values, no preselected airport.
4. A "Theme" toggle button at the top of the sidebar switches dark ↔ SkyVector.

### Phase 2 — Great Circle + distance

1. A `useEffect` watches `[departure, arrival]`. When both selected:
  - Remove any prior polyline stored in a `routeLayerRef`.
  - Compute `greatCirclePoints(dep, arr, 96)` and draw `L.polyline(pts, { color: accent, weight: 2.5, dashArray: '6 6', opacity: 0.9 })`.
  - Compute `distanceNm = kmToNm(haversineKm(dep, arr))`, store in state.
  - Call `map.fitBounds(polyline.getBounds(), { padding: [40,40] })`.
2. Sidebar shows `Route Distance: {distanceNm.toFixed(0)} NM` (—  when either side is empty).
3. Re-draw on theme change so the line colour follows the palette.

### Out of scope (do not touch this phase)

- FIR/country boundary layers, VOR rose, airway routing (`src/lib/nav/*`), Flight Plan overlay, navaid search. These stay as-is but become unused by the new RouteTab; we leave them in the tree for later phases.

### Technical notes

- Leaflet + its CSS are already loaded (stylesheet link is in `__root.tsx`). Run `bun add leaflet @types/leaflet` for the JS module — current code uses MapLibre, not Leaflet.
- No `react-leaflet`. Everything inside one `useEffect(() => { ... return cleanup }, [])`, with a second effect for theme and a third for dep/arr selection. State held in plain `useState`.
- Tile URLs: dark = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`, skyvector-ish = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`. Both free, no key.