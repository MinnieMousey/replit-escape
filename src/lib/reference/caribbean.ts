// ── Caribbean reference data ────────────────────────────────────────────────
// User-supplied reference tables for the AIS Duty Simulator: ICAO airline
// callsign mapping and the Caribbean airport ICAO → IATA reference list. The
// data here is the source of truth for the "Caribbean Reference Data" glossary
// tab; do not duplicate elsewhere.

export interface AirlineCallsign {
  /** Common airline name. */ airline: string;
  /** ICAO 3-letter operator code (e.g. "BAW"). */ icao: string;
}

export const AIRLINE_CALLSIGNS: AirlineCallsign[] = [
  { airline: 'Air Canada',         icao: 'ACA' },
  { airline: 'Air Canada Rouge',   icao: 'ROU' },
  { airline: 'Air France',         icao: 'AFR' },
  { airline: 'American Airlines',  icao: 'AAL' },
  { airline: 'British Airways',    icao: 'BAW' },
  { airline: 'Caribbean Airlines', icao: 'BWA' },
  { airline: 'Condor',             icao: 'CFG' },
  { airline: 'Copa Airlines',      icao: 'CMP' },
  { airline: 'Delta Air Lines',    icao: 'DAL' },
  { airline: 'Discover Airlines',  icao: 'OCN' },
  { airline: 'JetBlue Airways',    icao: 'JBU' },
  { airline: 'LIAT',               icao: 'LIA' },
  { airline: 'Mustique Airways',   icao: 'MAY' },
  { airline: 'Norse Atlantic',     icao: 'LBT' },
  { airline: 'TUI Airways',        icao: 'TOM' },
  { airline: 'United Airlines',    icao: 'UAL' },
  { airline: 'Virgin Atlantic',    icao: 'VIR' },
  { airline: 'WestJet',            icao: 'WJA' },
  { airline: 'Winair',             icao: 'WIA' },
];

export interface AirportRef {
  /** ICAO 4-letter code. */ icao: string;
  /** IATA 3-letter code. */ iata: string;
  /** Common name (added for usability — not on the original reference sheet). */
  name?: string;
}

/** Caribbean airport reference — ICAO / IATA pairs from the handwritten sheet. */
export const CARIBBEAN_AIRPORTS: AirportRef[] = [
  { icao: 'TKPK', iata: 'SKB', name: 'St Kitts — R.L. Bradshaw Int\'l' },
  { icao: 'TKPN', iata: 'NEV', name: 'Nevis — Vance W. Amory Int\'l' },
  { icao: 'TAPA', iata: 'ANU', name: 'Antigua — V.C. Bird Int\'l' },
  { icao: 'TAPB', iata: 'BBQ', name: 'Barbuda — Codrington' },
  { icao: 'TRPG', iata: 'MNI', name: 'Montserrat — John A. Osborne' },
  { icao: 'TFFR', iata: 'PTP', name: 'Guadeloupe — Pointe-à-Pitre' },
  { icao: 'TDPD', iata: 'DOM', name: 'Dominica — Douglas–Charles' },
  { icao: 'TDCF', iata: 'DCF', name: 'Dominica — Canefield' },
  { icao: 'TFFF', iata: 'FDF', name: 'Martinique — Aimé Césaire' },
  { icao: 'TLPC', iata: 'SLU', name: 'St Lucia — George F.L. Charles' },
  { icao: 'TLPL', iata: 'UVF', name: 'St Lucia — Hewanorra Int\'l' },
  { icao: 'TVSA', iata: 'SVD', name: 'St Vincent — Argyle Int\'l' },
  { icao: 'TVSB', iata: 'BQU', name: 'St Vincent — J.F. Mitchell (Bequia)' },
  { icao: 'TVSM', iata: 'MQS', name: 'St Vincent — Mustique' },
  { icao: 'TVSC', iata: 'CIW', name: 'St Vincent — Canouan' },
  { icao: 'TVSU', iata: 'UNI', name: 'St Vincent — Union Island' },
  { icao: 'TGPY', iata: 'GND', name: 'Grenada — Maurice Bishop Int\'l' },
  { icao: 'TBPB', iata: 'BGI', name: 'Barbados — Grantley Adams Int\'l' },
  { icao: 'TTCP', iata: 'TAB', name: 'Tobago — A.N.R. Robinson Int\'l' },
  { icao: 'TTPP', iata: 'POS', name: 'Trinidad — Piarco Int\'l' },
  { icao: 'SYEC', iata: 'OGL', name: 'Guyana — Eugene F. Correia (Ogle)' },
  { icao: 'SYCJ', iata: 'GEO', name: 'Guyana — Cheddi Jagan Int\'l' },
  { icao: 'TJSJ', iata: 'SJU', name: 'Puerto Rico — Luis Muñoz Marín Int\'l' },
  { icao: 'MKJP', iata: 'KIN', name: 'Jamaica — Norman Manley Int\'l' },
  { icao: 'MKJS', iata: 'MBJ', name: 'Jamaica — Sangster Int\'l (Montego Bay)' },
  { icao: 'TGPZ', iata: 'CRU', name: 'Grenada — Lauriston (Carriacou)' },
  { icao: 'SOCA', iata: 'CAY', name: 'French Guiana — Félix Éboué' },
  // Wider Central America / North America destinations frequently filed from TBPB.
  { icao: 'MZBZ', iata: 'BZE', name: 'Belize — Philip S.W. Goldson Int\'l' },
  { icao: 'TNCM', iata: 'SXM', name: 'Sint Maarten — Princess Juliana Int\'l' },
  { icao: 'TNCA', iata: 'AUA', name: 'Aruba — Queen Beatrix Int\'l' },
  { icao: 'TNCC', iata: 'CUR', name: 'Curaçao — Hato Int\'l' },
  { icao: 'MDSD', iata: 'SDQ', name: 'Dominican Rep. — Las Américas Int\'l' },
  { icao: 'MUHA', iata: 'HAV', name: 'Cuba — José Martí Int\'l' },
  { icao: 'KMIA', iata: 'MIA', name: 'Miami Int\'l' },
  { icao: 'KJFK', iata: 'JFK', name: 'New York — John F. Kennedy Int\'l' },
  { icao: 'CYYZ', iata: 'YYZ', name: 'Toronto — Pearson Int\'l' },
  { icao: 'EGLL', iata: 'LHR', name: 'London Heathrow' },
];
