// ── Airport reference for the Leaflet route planner ─────────────────────────
// Hardcoded world hubs (per phase-1 spec) merged with the curated Caribbean
// aerodrome dataset already loaded from the nav DB. Each entry has the five
// fields required by the planner: name, icao, iata, lat, lon.

import { AIRPORTS as NAV_AIRPORTS } from '@/lib/nav/db';

export interface PlannerAirport {
  name: string;
  icao: string;
  iata: string;
  lat: number;
  lon: number;
}

// World / regional hubs (test set + a handful of N./S. America + Europe + Asia).
const HARDCODED: PlannerAirport[] = [
  // Spec-required test set
  { name: 'John F. Kennedy Intl',     icao: 'KJFK', iata: 'JFK', lat: 40.6413,  lon: -73.7781 },
  { name: 'London Heathrow',          icao: 'EGLL', iata: 'LHR', lat: 51.4700,  lon: -0.4543 },
  { name: 'Tokyo Haneda',             icao: 'RJTT', iata: 'HND', lat: 35.5494,  lon: 139.7798 },
  { name: 'Dubai Intl',               icao: 'OMDB', iata: 'DXB', lat: 25.2532,  lon: 55.3657 },
  { name: 'Los Angeles Intl',         icao: 'KLAX', iata: 'LAX', lat: 33.9416,  lon: -118.4085 },
  // North America
  { name: 'Miami Intl',               icao: 'KMIA', iata: 'MIA', lat: 25.7959,  lon: -80.2870 },
  { name: 'Hartsfield-Jackson Atlanta', icao: 'KATL', iata: 'ATL', lat: 33.6407, lon: -84.4277 },
  { name: 'Chicago O\u2019Hare',      icao: 'KORD', iata: 'ORD', lat: 41.9742,  lon: -87.9073 },
  { name: 'Dallas/Fort Worth',        icao: 'KDFW', iata: 'DFW', lat: 32.8998,  lon: -97.0403 },
  { name: 'San Francisco Intl',       icao: 'KSFO', iata: 'SFO', lat: 37.6213,  lon: -122.3790 },
  { name: 'Seattle-Tacoma',           icao: 'KSEA', iata: 'SEA', lat: 47.4502,  lon: -122.3088 },
  { name: 'Toronto Pearson',          icao: 'CYYZ', iata: 'YYZ', lat: 43.6777,  lon: -79.6248 },
  { name: 'Vancouver Intl',           icao: 'CYVR', iata: 'YVR', lat: 49.1967,  lon: -123.1815 },
  { name: 'Mexico City Intl',         icao: 'MMMX', iata: 'MEX', lat: 19.4361,  lon: -99.0719 },
  // South America
  { name: 'São Paulo Guarulhos',      icao: 'SBGR', iata: 'GRU', lat: -23.4356, lon: -46.4731 },
  { name: 'Buenos Aires Ezeiza',      icao: 'SAEZ', iata: 'EZE', lat: -34.8222, lon: -58.5358 },
  { name: 'Bogotá El Dorado',         icao: 'SKBO', iata: 'BOG', lat: 4.7016,   lon: -74.1469 },
  { name: 'Lima Jorge Chávez',        icao: 'SPJC', iata: 'LIM', lat: -12.0219, lon: -77.1143 },
  { name: 'Santiago Arturo Merino',   icao: 'SCEL', iata: 'SCL', lat: -33.3930, lon: -70.7858 },
  { name: 'Caracas Maiquetía',        icao: 'SVMI', iata: 'CCS', lat: 10.6013,  lon: -66.9911 },
  // Europe / Africa / Asia / Oceania
  { name: 'Paris Charles de Gaulle',  icao: 'LFPG', iata: 'CDG', lat: 49.0097,  lon: 2.5479  },
  { name: 'Frankfurt Main',           icao: 'EDDF', iata: 'FRA', lat: 50.0379,  lon: 8.5622  },
  { name: 'Amsterdam Schiphol',       icao: 'EHAM', iata: 'AMS', lat: 52.3105,  lon: 4.7683  },
  { name: 'Madrid Barajas',           icao: 'LEMD', iata: 'MAD', lat: 40.4719,  lon: -3.5626 },
  { name: 'Singapore Changi',         icao: 'WSSS', iata: 'SIN', lat: 1.3644,   lon: 103.9915 },
  { name: 'Hong Kong Intl',           icao: 'VHHH', iata: 'HKG', lat: 22.3080,  lon: 113.9185 },
  { name: 'Sydney Kingsford Smith',   icao: 'YSSY', iata: 'SYD', lat: -33.9399, lon: 151.1753 },
  { name: 'Johannesburg O.R. Tambo',  icao: 'FAOR', iata: 'JNB', lat: -26.1392, lon: 28.2460 },
];

// Best-effort IATA map for the curated Caribbean aerodromes (icao → iata).
const CARIB_IATA: Record<string, string> = {
  TBPB: 'BGI', TTPP: 'POS', TTCP: 'TAB', TGPY: 'GND', TVSV: 'SVD', TVSC: 'CIW',
  TLPL: 'UVF', TLPC: 'SLU', TFFF: 'FDF', TFFR: 'PTP', TDPD: 'DOM', TDCF: 'DCF',
  TKPK: 'SKB', TKPN: 'NEV', TUPJ: 'EIS', TAPA: 'ANU', TQPF: 'AXA', TJSJ: 'SJU',
  TJBQ: 'BQN', TJPS: 'PSE', TNCM: 'SXM', TFFG: 'SFG', TFFJ: 'SBH', TNCA: 'AUA',
  TNCC: 'CUR', TNCB: 'BON', MKJS: 'MBJ', MKJP: 'KIN', MZBZ: 'BZE', SYCJ: 'GEO',
  SOCA: 'CAY', SMJP: 'PBM', SAEZ: 'EZE', MUHA: 'HAV', MDSD: 'SDQ', MDPC: 'PUJ',
};

const NAV_AS_PLANNER: PlannerAirport[] = NAV_AIRPORTS
  .filter(a => !HARDCODED.some(h => h.icao === a.icao))
  .map(a => ({
    name: a.name,
    icao: a.icao,
    iata: CARIB_IATA[a.icao] ?? '',
    lat: a.lat,
    lon: a.lon,
  }));

export const AIRPORTS: PlannerAirport[] = [...HARDCODED, ...NAV_AS_PLANNER]
  .sort((a, b) => a.icao.localeCompare(b.icao));
