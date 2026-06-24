// AirportDB.io adapter stub. Real impl calls
// https://airportdb.io/api/v1/airport/{ICAO}?apiToken=... per airport and
// merges runway/frequency detail into the local Airport record.

import type { NavAdapter, AdapterContext, NavDataset } from './types';

export const airportDbAdapter: NavAdapter = {
  id: 'airportdb',
  async fetch(_ctx?: AdapterContext): Promise<NavDataset> {
    return { airports: [], navaids: [], waypoints: [], airways: [] };
  },
};
