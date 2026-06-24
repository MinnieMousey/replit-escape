# SkyVector-Style Route Planner Overhaul

Replace the existing `RouteTab` planner and its `navdb` / `routeParser` engine with a new module backed by a real navigation database, MapLibre vector map, and an airway-graph router. Leave authentication, theme, airport search, flight-strip generation, aircraft performance, weather, and every other completed module untouched.

## Scope boundary

In scope (will change):
- `src/components/glossary/RouteTab.tsx` (route input + map)
- `src/components/glossary/MapTab.tsx` (Leaflet map → MapLibre)
- `src/components/glossary/navdb.ts`, `navdbExtended.ts`, `firBoundaries.ts`, `routeParser.ts`
- New `src/lib/nav/*` engine
- New glossary tab: **Caribbean Reference Data** (callsigns + airport table)

Out of scope (will not touch): `ShiftContext`, task generator, all `components/games/*`, HUD, flight board, report, login/shift selection, theme, SkyBackground, scoring.

## Architecture

```text
src/lib/nav/
  db.ts                SQLite (sql.js) loader + spatial index (rbush)
  greatCircle.ts       WGS84 distance / bearing / midpoint / geodesic polyline
  graph.ts             A* over airway_segments, Dijkstra fallback
  router.ts            plan(dep, dest, opts) → published airway → RNAV → great-circle
  search.ts            token resolver: ICAO / waypoint / VOR / NDB / airway
  adapters/
    openaip.ts         stub fetcher
    ourairports.ts     stub fetcher
    airportdb.ts       stub fetcher
    airac.ts           stub fetcher (all return Promise<NavDataset>, unused at runtime)
  types.ts

src/components/glossary/
  RouteTab.tsx         rewritten: search box + editable waypoint chips + map
  MapTab.tsx           rewritten on MapLibre with layered nav data
  CaribbeanRefTab.tsx  new glossary tab (callsigns + airport table)
  GlossaryOverlay.tsx  add the new tab
```

## Navigation database

Ship as a prebuilt SQLite file at `public/nav/navdata.sqlite`, loaded in-browser via `sql.js` (WASM) and cached in IndexedDB for offline use. Schema exactly as requested: `airports`, `waypoints`, `navaids(type IN VOR|VORDME|VORTAC|DME|NDB|TACAN)`, `airways`, `airway_segments`. Seed with the existing Caribbean fixes/airways from `navdb.ts` + `navdbExtended.ts` so nothing currently working regresses, plus a curated worldwide starter set (major ICAO airports, high-altitude airways through the Caribbean / N-Atlantic, common VORs). Adapters are wired but not auto-run; a future job can refresh the SQLite from OpenAIP / OurAirports / AirportDB / AIRAC.

Spatial queries (viewport culling, nearest-fix click) use an in-memory `rbush` index built once on load.

## Routing engine

`router.plan(dep, dest, { prefer })` tries in order:
1. Published airway path — A* on the airway graph, edge cost = `distance_nm`, restricted to one airway family at a time (RNAV → Jet → Victor).
2. Mixed airway path — A* across all airways with a small transition penalty.
3. Great-circle DCT fallback (WGS84) when no airway path exists.

User-typed routes (`TBPB UA301 ANU DCT TJSJ`) are parsed by `search.ts` and validated leg-by-leg against `airway_segments` — same contract the existing `routeParser` exposes, so callers don't change.

## Map (MapLibre GL)

Replace Leaflet with `maplibre-gl` + a free vector basemap style (no API key). Layers, each toggleable and zoom-gated:

| Layer        | Min zoom | Symbol                    | Color    |
|--------------|----------|---------------------------|----------|
| Airports     | 3        | circle                    | white    |
| VOR          | 6        | hexagon (outline)         | blue     |
| VOR/DME      | 6        | hexagon (filled)          | blue     |
| NDB          | 7        | diamond                   | brown    |
| Waypoints    | 8        | small dot                 | grey     |
| Victor awys  | 7        | line                      | blue     |
| Jet awys     | 5        | line                      | magenta  |
| RNAV awys    | 5        | line                      | green    |
| Oceanic      | 3        | line                      | cyan     |
| FIR bounds   | 3        | dashed line               | yellow   |
| User route   | always   | thick line + numbered pts | white    |
| Aircraft     | always   | plane icon                | red      |

Symbols rendered as SDF icons so they scale + recolor on mobile. Renderer tuned for iPhone/iPad (`maxPitch: 0`, `fadeDuration: 0`, raster tile prefetch off).

## Interactive editing

Route is state of an ordered `RouteElement[]`. Users can:
- Click any map symbol → "Insert after <prev fix>" / "Append" / "Set as origin/destination".
- Drag a route segment midpoint → inserts the nearest fix under the cursor.
- Click a chip in the route bar → remove, or replace via typeahead.
- Type free-text route (SkyVector syntax) → parsed, chips rebuilt.

Recalculation runs in a `requestIdleCallback` debounce; target < 2 s for transoceanic routes (A* over the seeded graph is well under that).

## Caribbean Reference Data glossary tab

New tab `CaribbeanRefTab.tsx` with two searchable tables, sourced from the user's lists verbatim:
- **Airline callsigns** (Air Canada ACA … Discover Airlines OCN, full list provided).
- **Caribbean airport reference** (TKPK SKB … MKJS MBJ, full list provided).

Stored as typed TS constants in `src/lib/reference/caribbean.ts`; tab renders shadcn `Table` with a filter input. Added to `GlossaryOverlay` between AIP and Aircraft.

## Performance & offline

- `sql.js` WASM + `navdata.sqlite` cached in IndexedDB via `idb-keyval`.
- MapLibre style + sprite sheet cached by the SW (only if the project already has a SW; not adding one).
- Lazy-load `maplibre-gl` and `sql.js` via dynamic `import()` so the login/shift flows stay light.
- Viewport-culled symbol rendering through MapLibre's native filter on `["<=", ["zoom"], ...]`.

## Dependencies to add

`maplibre-gl`, `sql.js`, `rbush`, `idb-keyval`, `@turf/along`, `@turf/great-circle`. Remove `leaflet`, `react-leaflet`, `@types/leaflet` once `MapTab` and `RouteTab` no longer import them.

## Verification

- Existing Caribbean routes from the seeded set (e.g. `TBPB DCT ANU`, `TBPB UA301 TJSJ`) still parse, validate, and render.
- New worldwide examples route end-to-end: `KJFK … EGLL` produces an oceanic track; `KSFO J1 KLAX` produces a jet-airway path.
- Glossary tab renders all callsigns and airport rows; filter works.
- Build passes; bundle for `/shift` does not regain leaflet.
- Manual mobile check via Playwright viewport 390×844 for map interaction + route edit.

## Risks / notes

- Worldwide nav data is large. Starter SQLite will be ~5–10 MB (Caribbean + N-Atlantic + major hubs). Full global AIRAC import is left to the adapter job — UI is ready, data refresh is operational, not a code change.
- No real AIRAC license is included; adapters are stubs that document the expected response shape.
