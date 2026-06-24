// OurAirports adapter stub. Real impl downloads
// https://davidmegginson.github.io/ourairports-data/{airports,navaids,runways}.csv,
// CSV-parses, then projects rows into the local schema. No API key required.

import type { NavAdapter, AdapterContext, NavDataset } from './types';

export const ourAirportsAdapter: NavAdapter = {
  id: 'ourairports',
  async fetch(_ctx?: AdapterContext): Promise<NavDataset> {
    return { airports: [], navaids: [], waypoints: [], airways: [] };
  },
};
