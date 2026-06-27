## Goal
Match the SkyVector World Lo look in the route planner: solid blue FIR outlines (with Piarco fixed), FIR ICAO+name labels at boundary touch points, and worldwide IFR low airways labeled inline (e.g. `A632`) — all driven by open redistributable data.

## 1. Data ingestion (build-time, bundled JSON)

New folder `src/lib/nav/data/` with three generated JSON bundles + a tiny pipeline script `scripts/build-navdata.mjs` (run once, output committed):

- `firs.geo.json` — FIR/UIR polygons from the public **OpenAIP airspace** export (CC-BY) filtered to `type ∈ {FIR, UIR, OCA}`. Each feature keeps `ident`, `name`, `tier`.
- `airways.geo.json` — IFR low airways from the **FAA NASR ARTCC + ICAO public AIRAC dumps** mirrored on OurAirports (`navaids.csv` + `airways.csv` from the openflightmaps public bundle). Each LineString carries `id` (A632), `type` (LOW/HIGH), `level`.
- `airports.json` / `navaids.json` — already present, extended from OurAirports global CSV.

Script does: fetch → filter → simplify (Douglas-Peucker 0.01°) → write GeoJSON. Re-runnable; no runtime fetch.

## 2. Piarco FIR rebuild

Replace the current Piarco polygon in `firBoundaries.ts` with the published TTZP corner sequence (TT AIP ENR 2.1):

```
14°00N 063°00W → 14°00N 053°00W → 09°00N 053°00W → 09°00N 056°30W →
07°00N 056°30W → 07°00N 058°30W → 08°30N 060°00W → 08°30N 060°45W →
10°00N 062°00W (TT/SV boundary) → northwest along Lesser Antilles arc to
14°00N 063°00W
```

Encoded as a single closed ring, also added to `firs.geo.json` so the layer source is consistent.

## 3. Map rendering (RouteTab.tsx + MapTab.tsx)

Replace the current FIR layer block with three MapLibre layers fed from `firs.geo.json`:

- `fir-fill` — transparent (hit area only).
- `fir-line` — solid `#1e6fb8` (SkyVector blue), width 1.2 px, no dash. Honors theme toggle (dark mode → `#5aa9e6`).
- `fir-label-edge` — symbol layer on a derived "edge points" source (computed once: for every shared vertex between two FIR polygons, emit a point feature with both idents). Renders two stacked text fields: top line = ICAO (`TTZP`), bottom = name (`PIARCO`), small white halo, only at z ≥ 4.

Airways:

- New source `airways` from `airways.geo.json`.
- `airway-line` — thin `#6a7a8c` line, `minzoom: 5`.
- `airway-label` — symbol layer with `symbol-placement: line`, `text-field: ['get','id']`, `text-padding: 2`, white background box drawn via a second symbol layer (`text-halo-width: 4`, `text-halo-color: #fff`, and a small `box`-style background using `icon-image` of a 1×1 sdf rectangle scaled by `text-size` — gives the boxed `A632` look). `minzoom: 6` for label, `minzoom: 5` for line.
- Filter by `World Hi` / `World Lo` / `VFR` chip already in the UI: `Hi` → `type=HIGH`, `Lo` → `type=LOW`.

Zoom-scaled visibility tables added to keep the map readable on mobile.

## 4. Layer controls

Existing layer toggle panel gains:
- **FIRs** (on by default) — toggles `fir-line` + `fir-label-edge`.
- **Airway labels** — independent of airway lines so users can declutter.

No new tabs; no logic changes outside presentation.

## 5. Files

- new `scripts/build-navdata.mjs`
- new `src/lib/nav/data/firs.geo.json`
- new `src/lib/nav/data/airways.geo.json`
- new `src/lib/nav/data/firEdgePoints.ts` (derives label points from polygons at load time, memoised)
- edit `src/components/glossary/firBoundaries.ts` (Piarco rebuild + re-export from JSON)
- edit `src/components/glossary/RouteTab.tsx` (replace FIR layer block, add airway source/layers, extend layer-toggle UI)
- edit `src/components/glossary/MapTab.tsx` (mirror the same FIR + airway layers)

No backend, no schema changes — purely data + presentation.

## Caveats (worth knowing)

- Worldwide IFR Lo airways bundled ≈ 4–6 MB gzipped. Loaded lazily when the Route or Map tab first opens, cached in `localStorage`. Mobile users on slow links will see a one-time spinner.
- Open datasets lag SkyVector by one AIRAC cycle and can miss a handful of newly-commissioned airways; the bundle is regenerated whenever `scripts/build-navdata.mjs` is re-run.
