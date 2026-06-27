## Route Planner Enhancements

### 1. Disable tap-to-add on map
In `RouteTab.tsx`, remove the map `click` handler that appends the nearest fix to the route. Symbols remain visible; route edits happen only via the Flight Plan overlay (typing/parsing tokens) and the search box.

### 2. Caribbean country boundaries
New dataset `src/components/glossary/countryBoundaries.ts` with simplified polygon outlines for each Caribbean state/territory tied to the Caribbean Ref list (Barbados, Trinidad & Tobago, Grenada, St Vincent, St Lucia, Martinique, Dominica, Guadeloupe, Antigua & Barbuda, St Kitts & Nevis, Montserrat, Puerto Rico, Dominican Rep., Jamaica, Cuba, Sint Maarten, Aruba, Curaçao, Belize, Guyana, French Guiana). Rendered as MapLibre line+label layer, toggleable in the layer panel, separate from FIRs, with country-name labels at z≥4.

### 3. VOR compass rose overlay (360° radials)
For every VOR/VORDME in the nav DB, generate a small compass rose centered on the station:
- Outer circle ring (~10 NM radius, scaled with zoom).
- Tick marks every 10° (short) and every 30° (longer), plus a North arrow.
- Degree labels (`000`, `030`, `060`, …, `330`) at the 30° ticks, shown at z≥7.
- Subtle stroke colour matched to the active theme (dark / SkyVector blue).
- Built once in `src/lib/nav/radials.ts` as a single GeoJSON FeatureCollection using `greatCircle.ts` for accurate bearing endpoints.
- Toggled via a new "VOR radials" switch in the layer panel; off by default.

### 4. Aerodrome full names on the map
Add a second symbol layer beneath the existing ICAO labels that shows every airport's full name (e.g. "Grantley Adams", "Maurice Bishop", "Piarco", "Hewanorra") for **all** airports in `AIRPORTS` / `CARIBBEAN_AIRPORTS`, not just Caribbean ones. Display rules:
- Visible at z≥6 (Caribbean hubs) / z≥8 (smaller fields) using a zoom-stepped `text-size` and `symbol-sort-key`.
- Auto-trim trailing " Int'l", " International", and the "Country — " prefix so labels stay short.
- Offset below the ICAO label, smaller font, lower opacity so it doesn't dominate.
- Honors the active theme palette.

### 5. Flight-plan overlay panel (SkyVector-style)
Replace the inline Flight Plan card with a floating, draggable overlay positioned top-left over the map (mirrors the attached SkyVector screenshot). Fields, all blank by default:
- Aircraft, Spd, Alt, Fuel
- Departure (ICAO) + resolved airport name
- Destination (ICAO) + resolved airport name
- ETD Zulu (HHMM) + date, Local (HHMM) + date
- Route text input (existing token parser)
- Computed read-outs: Dist, ETE (= Dist / Spd), Burn (= ETE × burn-rate derived from Fuel) — show "—" until Spd + route present
- Buttons: "Briefing & Filing" (stub toast), "Nav Log" (opens existing leg list in a popover)

Behavior:
- Typing in Departure/Destination auto-prepends/-appends the ICAO to the route and recenters the map.
- Route edits redraw the polyline live.
- Panel is collapsible (chevron) and draggable; position persisted to `localStorage`.
- Map fills the tab; panel floats over it with translucent background for real-time plotting.

### Files
- edit `src/components/glossary/RouteTab.tsx` (remove click handler; add radials, country, and aerodrome-name layers + toggles; mount overlay)
- new `src/components/glossary/FlightPlanOverlay.tsx` (draggable form panel)
- new `src/components/glossary/countryBoundaries.ts` (polygons + names)
- new `src/lib/nav/radials.ts` (build VOR compass-rose GeoJSON)
- edit `src/components/glossary/MapTab.tsx` (mirror country + aerodrome-name toggles for consistency)

No backend/business-logic changes; purely presentation + nav-data extension.
