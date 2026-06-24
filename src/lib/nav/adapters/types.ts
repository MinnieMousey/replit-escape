// ── External nav-data adapter contract ──────────────────────────────────────
// Every adapter returns a NavDataset in the shape `src/lib/nav/db.ts` consumes,
// so swapping or refreshing data sources never touches the router or UI.

import type { Airport, Navaid, Waypoint, Airway } from '../types';

export interface NavDataset {
  airports: Airport[];
  navaids: Navaid[];
  waypoints: Waypoint[];
  airways: Airway[];
  /** ISO date of the AIRAC cycle the data was published for. */
  cycle?: string;
}

export interface AdapterContext {
  /** Bounding box (W,S,E,N) to restrict the fetch — adapters may ignore. */
  bbox?: [number, number, number, number];
  /** Auth token for the underlying API, if the adapter needs one. */
  apiKey?: string;
}

export interface NavAdapter {
  readonly id: string;
  fetch(ctx?: AdapterContext): Promise<NavDataset>;
}
