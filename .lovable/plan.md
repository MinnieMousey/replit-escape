# SkyVector-style Route Charting Upgrade

Build out the route planner to match SkyVector's look, feel, and toggles, with proper FIR coverage around Piarco/Barbados, theme-switching, fullscreen, and chart-tier overlays (VFR / IFR Lo / IFR Hi).

## 1. Expand FIR / airspace coverage

Add (verbatim VATSIM VAT-Spy geometry, no eyeballed vertices) every FIR / oceanic boundary that a flight in/out of TBPB or TTPP can plausibly transit, plus the upper sectors where they differ from the lower FIR:

- **TTZP** Piarco (have)
- **TJZS / TJZX** San Juan FIR + CERAP
- **KZNY** New York Oceanic
- **KZMA** Miami Oceanic (also KZMA domestic for Florida)
- **SVZM** Maiquetia (have)
- **SOOO** Cayenne (have)
- **SBAO / SBAZ** Atlantico (Brazil oceanic neighbour to SOOO)
- **SKED** Barranquilla (have)
- **MPZL** Panama (have)
- **MHTG** Central America / COCESNA (have)
- **MKJK** Kingston (have)
- **MUFH** Havana (have)
- **MDCS** Santo Domingo (have)
- **TNCF** Curaçao (have)
- **GOOO** Dakar Oceanic (eastbound transatlantic neighbour)
- **EGGX** Shanwick Oceanic (NAT eastbound exits via NY Oceanic → Shanwick)

Each feature gets `ident`, `name`, `tier` (`FIR` / `UIR` / `OCEANIC` / `CTA` / `TMA`), and the existing MultiPolygon coords. A new lookup `firsContainingPoint(lat, lon)` lets the planner annotate each route leg with the FIRs it enters/exits.

## 2. Chart tiers (VFR / IFR Lo / IFR Hi) + zoom-driven detail

Add a tier toggle to the route map header:

- **VFR** — sectional-style: airports, VORs+freqs, NDBs, waypoints, no airways, soft daylight basemap.
- **IFR Lo** — VICTOR + LOW airways + RNAV "T" routes + VORs/NDBs + intersections.
- **IFR Hi** — JET + UPPER + RNAV "Q/Y/Z" + OCEANIC airways + VORs only (no NDBs).

Layer visibility per tier is computed from the existing `Airway.type` and `Navaid.type`. A `minzoom`/`maxzoom` ladder on every MapLibre layer enforces SkyVector's "more detail as you zoom in" rule (airways appear ≥ z4, waypoints ≥ z6, navaid frequencies ≥ z8, FIR labels ≥ z3 but airport name labels only ≥ z7, etc.). Add a small text label layer beside each VOR/NDB showing the three-letter ID (`BGI`, `SLU`, `BNE` …) using the dataset's idents, visible from z6+.

A separate toggle group exposes the SkyVector-style overlays the user asked for: **Boundaries (FIR)**, **CTAs/TMAs**, **VOR IDs**, **NDBs**, **Waypoints**, **Airways**, **Airports**. Each toggle flips MapLibre layer visibility — no map rebuild.

FIR polygons render as a stroked line layer + tier-coloured fill (low opacity) + symbol layer with the FIR ident centred on the polygon (kept curved/inset using the existing `curvedLabelChars` helper). The router walks the densified great-circle / airway path against `firsContainingPoint` and emits entry/exit transitions; those show in the route summary panel as "TTZP → TJZS at 18°00′N 63°00′W".

## 3. Real string-route validation (TBPB → MZBZ style)

The current `validateManualRoute` already checks airway membership. Strengthen it so the user can paste an Item-15 string like `TBPB DCT BGI UA301 ANU UA555 ZBV DCT MZBZ` and the engine:

1. Resolves every token against the nav DB.
2. Confirms each airway transition (`UA301`) actually contains both endpoints.
3. Builds great-circle leg paths (already done) and totals distance.
4. Reports per-leg FIR transitions and a `valid: true/false` with reasons (`"ANU is not on UA555"`).

The output drives the on-map highlight (red for invalid leg, gold for valid) that already exists, plus a textual validation panel under the input.

## 4. SkyVector "bright blue" theme toggle

Reintroduce a theme switcher in the route tab header (Dark / SkyVector Blue). The blue theme swaps:

- Basemap → CARTO `positron` (light grey-blue) tiles.
- Background `#cfe8ff` (SkyVector pale blue).
- Airways → saturated blue/red palette matching SkyVector.
- FIR strokes → solid blue with white halo.
- Text labels → dark navy.

Theme lives in component state, persisted to `localStorage` (`ais-route-theme`). No global theme rewrite; only the map's MapLibre style + container classes change.

## 5. Collapsible + fullscreen map

- Add a header bar with **Collapse** (chevron) and **Fullscreen** (expand icon) buttons on the route map and the existing `MapTab`.
- Collapsed state hides the map container, persisted per-map in `localStorage`.
- Fullscreen uses the browser Fullscreen API on the map's wrapper div (`requestFullscreen`/`exitFullscreen`); a fallback class pins the wrapper to `fixed inset-0 z-[100]` on iOS Safari (no FS API on iPhone). On entering/exiting fullscreen, the MapLibre instance calls `map.resize()` so tiles re-fit.
- Apply the same controls to `MapTab.tsx` so every map in the glossary is collapsible/fullscreen.

## 6. Caribbean Ref data already wired

`CARIBBEAN_AIRPORTS` already covers the user's reference sheet (TBPB/BGI, TLPC/SLU, TLPL/BNE, MZBZ etc). Verify `MZBZ` (Belize/Philip Goldson) is present; if missing, append it from the user's table so TBPB→MZBZ resolves.

## 7. Files touched

```text
src/components/glossary/firBoundaries.ts        # +TJZS,TJZX,KZNY,KZMA,SBAO,GOOO,EGGX +tier
src/lib/nav/firs.ts                              # new: firsContainingPoint, transitions
src/lib/nav/router.ts                            # annotate legs with FIR transitions
src/lib/nav/types.ts                             # +RouteLeg.firTransitions
src/components/glossary/RouteTab.tsx             # tier toggle, theme toggle, collapse/FS,
                                                  # VOR ID labels, layer visibility ladder
src/components/glossary/MapTab.tsx               # collapse + fullscreen header
src/lib/reference/caribbean.ts                   # add MZBZ if absent
```

## Acceptance

- TBPB → MZBZ planned via "Plan route" returns a real airway path (or DCT fallback) with FIR transitions listed.
- Pasting `TBPB DCT BGI UA301 ANU DCT MZBZ` validates leg-by-leg and flags any invalid airway hop in red on the map.
- Tier toggle hides JET routes in IFR-Lo and VICTOR routes in IFR-Hi.
- Zooming out hides waypoints + navaid IDs; zooming in restores them.
- Theme button switches the map between dark and SkyVector-blue without losing the route.
- Collapse button hides the map; expand button restores it; fullscreen fills the viewport on iPhone, iPad, and desktop.
