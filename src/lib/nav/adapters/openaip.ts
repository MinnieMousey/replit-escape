// OpenAIP adapter stub. The real implementation paginates
// https://api.core.openaip.net/api/{airports,navaids,airspaces} with an API
// key and projects each record into the local Airport/Navaid/Waypoint shape.
// Left as a stub so the UI architecture is ready when data ingestion is wired.

import type { NavAdapter, AdapterContext, NavDataset } from './types';

export const openAipAdapter: NavAdapter = {
  id: 'openaip',
  async fetch(_ctx?: AdapterContext): Promise<NavDataset> {
    return { airports: [], navaids: [], waypoints: [], airways: [] };
  },
};
