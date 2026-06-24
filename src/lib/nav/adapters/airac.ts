// AIRAC-cycle adapter stub. Real impl pulls airways + waypoints + procedures
// from a licensed AIRAC provider (Jeppesen / Lido / Navblue) and stamps the
// active cycle (e.g. "2606" = AIRAC cycle 6 of 2026) onto the dataset.

import type { NavAdapter, AdapterContext, NavDataset } from './types';

export const airacAdapter: NavAdapter = {
  id: 'airac',
  async fetch(_ctx?: AdapterContext): Promise<NavDataset> {
    return { airports: [], navaids: [], waypoints: [], airways: [], cycle: undefined };
  },
};
