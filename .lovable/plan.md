# RouteTab expansion plan

## 1. Global nav data (curated static JSON)

New files under `src/lib/nav/data/`:
- `airports.world.ts` — ~400 major/intl airports across all inhabited regions (ICAO, IATA, name, country, lat, lon). Merged into existing `AIRPORTS` export.
- `navaids.world.ts` — ~600 VOR/VOR-DME/NDB records (ident, type, freq, lat, lon, country).
- `waypoints.world.ts` — ~1200 named enroute fixes (ident, lat, lon, region).
- `airways.world.ts` — ~150 high-altitude airway skeletons across NAM, SAM, EUR, MID, ASIA, OCE keyed by `id` + `segments[{from,to}]`.

Existing Caribbean DB stays authoritative; world data is appended so no idents are duplicated (dedupe by `ident`+region on load). `src/lib/nav/db.ts` re-exports the merged lists so `NAVAIDS`, `WAYPOINTS`, `AIRWAYS`, `ALL_FIXES` gain global coverage without callsite changes.

## 2. Zoom-scalable rendering

In `RouteTab.tsx` add a `zoom` state synced via `map.on('zoomend')`. Replace fixed radii/font sizes with helpers:

```
sizeFor(zoom, base) = clamp(base * (zoom / 6), base * 0.5, base * 2.2)
```

Applied to:
- `circleMarker` radii (airports/navaids/waypoints).
- `divIcon` label font-size (px) and margin offsets.
- Density gate: hide `waypoints` and `airways` layers below zoom 5; hide navaid labels below zoom 4; VOR rose only when a navaid is selected or zoom ≥ 6.

Labels rebuild in the existing feature-layer effect, now also keyed on `zoom` bucket (rounded to 1) to avoid rebuilding on every wheel tick.

## 3. Dep/Arr: dropdown + typable

Replace the two `<input list=...>` fields with a small combobox pattern:
- Text input (existing typable behaviour, uppercase, ICAO validation).
- Chevron button opens a scrollable panel (400 rows max, filtered by current text) grouped by region: Caribbean, North America, South America, Europe, Africa, Asia, Oceania.
- Click a row → sets ICAO, closes panel. Keeps datalist as a fallback.

Component lives inline in `RouteTab.tsx` (no new shadcn dep) using existing token colours.

## 4. Aircraft profile + auto-calc

New file `src/lib/nav/aircraft.ts`:

```
AIRCRAFT = [
  { id: 'C172', label: 'Cessna 172', tasKt: 110, burnKgHr: 32, reserveMin: 45 },
  { id: 'B738', label: 'Boeing 737-800', tasKt: 450, burnKgHr: 2500, reserveMin: 45 },
  { id: 'A320', label: 'Airbus A320',    tasKt: 447, burnKgHr: 2400, reserveMin: 45 },
  { id: 'A333', label: 'Airbus A330-300', tasKt: 470, burnKgHr: 5600, reserveMin: 45 },
  { id: 'B77W', label: 'Boeing 777-300ER', tasKt: 490, burnKgHr: 6800, reserveMin: 45 },
  { id: 'DH8D', label: 'Dash 8 Q400',    tasKt: 360, burnKgHr: 1100, reserveMin: 45 },
]
```

New `computeFlightPlan({distanceNm, eobt, aircraft, routeDistanceNm})` returns:
- `eetMin = round(routeDistanceNm / tasKt * 60)`
- `fuelKg = round((eetMin + reserveMin) / 60 * burnKgHr)`
- `etaHHMM = addMinutes(eobtHHMM, eetMin)`

Sidebar adds an **Aircraft** `<select>` above the flight-plan grid. When dep+arr+aircraft are set, computed EET/Fuel show as placeholders in disabled-looking (but overridable) fields. Any manual edit sets a per-field `override` flag so the calculator stops overwriting that field. EOBT change re-derives ETA.

Route distance used for calc: if the manual `route` field is empty or invalid, use great-circle NM; otherwise sum leg distances from parsed route (dep → each waypoint → arr) using `haversineKm`.

## 5. Route parsing, validation & autocorrect

Extend `src/lib/nav/search.ts`:
- Export `suggestToken(raw)` — Levenshtein ≤ 1 over `ALL_FIXES` idents + airway ids, returns best candidate.
- Existing `parseRouteString` already flags unknown tokens.

New sidebar block **Route** replaces the plain text input:
- `<textarea>` (1 row, grows) with monospace font.
- Beneath: token chips coloured green (ok), amber (auto-fix suggestion available), red (unknown, no suggestion). Hover shows suggestion; click amber chip to accept.
- Toggle: **Autocorrect on blur** (checkbox, persisted in `localStorage`). When on, blur replaces amber tokens with their suggestion and shows an inline "corrected N tokens" note.
- Validation summary line: `4 fixes · 1 airway · 0 errors`.

Parsed route also feeds the map: draw a solid polyline through dep → resolved fixes → arr in `tokens.routeStroke` (distinct from the dashed great-circle) inside the existing route effect; falls back to great-circle when route is empty/invalid.

## 6. Files touched

Created:
- `src/lib/nav/data/airports.world.ts`
- `src/lib/nav/data/navaids.world.ts`
- `src/lib/nav/data/waypoints.world.ts`
- `src/lib/nav/data/airways.world.ts`
- `src/lib/nav/aircraft.ts`
- `src/lib/nav/flightCalc.ts` (`computeFlightPlan`, HHMM helpers)

Edited:
- `src/lib/nav/db.ts` — merge world data into existing exports; dedupe.
- `src/lib/nav/search.ts` — add `suggestToken`.
- `src/components/glossary/RouteTab.tsx` — zoom-aware rendering, combobox, aircraft select, auto-calc wiring, route chips + autocorrect toggle, parsed-route polyline.

Out of scope: real AIRAC ingestion, SID/STAR, winds aloft, altitude/FL routing. Auto-calc uses zero wind and cruise-only (no climb/descent fuel), matching the training-tool scope.
