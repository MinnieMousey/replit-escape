// ── Curated worldwide airway skeletons ──────────────────────────────────────
// Sequences of fix/navaid/waypoint idents that must exist in the merged DB.
// Segments with missing endpoints are silently skipped downstream in db.ts.

export interface RawAirway { id: string; points: string[]; }

export const WORLD_AIRWAYS: RawAirway[] = [
  // North Atlantic tracks (skeleton)
  { id: 'NATA', points: ['DOGAL', 'RESNO', 'GISTI', 'LOMPI', 'BOBTU', 'CYMON'] },
  { id: 'NATB', points: ['MALOT', 'PIKIL', 'GISTI', 'LOMPI', 'JOOPY'] },
  { id: 'NATC', points: ['BEDRA', 'SUNOT', 'GISTI', 'LOMPI', 'JOOPY'] },
  // US NE
  { id: 'J121', points: ['JFK', 'DPK', 'HTO'] },
  { id: 'J75',  points: ['JFK', 'CMK'] },
  { id: 'J174', points: ['ACY', 'DCA'] },
  { id: 'J209', points: ['MIA', 'PBI', 'VRB', 'OMN', 'SAV', 'CHS'] },
  // Transcon US
  { id: 'J146', points: ['DFW', 'ABQ', 'PHX', 'LAX'] },
  { id: 'J80',  points: ['LAX', 'LAS', 'DEN'] },
  { id: 'J148', points: ['SFO', 'OAK', 'SEA'] },
  { id: 'J24',  points: ['ATL', 'MEM', 'STL', 'ORD'] },
  // Europe upper
  { id: 'UN601', points: ['LON', 'BIG', 'DVR', 'KONAN', 'BUB', 'FRA'] },
  { id: 'UL9',   points: ['BNN', 'BRY', 'SHA'] },
  { id: 'UN869', points: ['FRA', 'RIXED', 'ROLIS', 'MUN'] },
  { id: 'UL607', points: ['LON', 'BIG', 'DVR', 'KONAN', 'PAM', 'SPY'] },
  { id: 'UM616', points: ['BCN', 'MMD', 'ELV', 'LPPT'] },
  { id: 'UM603', points: ['ROM', 'SRN', 'MUN'] },
  { id: 'UP975', points: ['ATH', 'BOS'] },
  // Middle East
  { id: 'UL425', points: ['DBA', 'PARAR', 'IMRAN', 'DOH'] },
  { id: 'UN563', points: ['AUH', 'DBA', 'ORSAR'] },
  { id: 'UP559', points: ['DOH', 'LOVAR', 'RUH'] },
  { id: 'UM860', points: ['JED', 'CAI', 'TLV'] },
  // South Asia
  { id: 'UL425A',points: ['DPN', 'BBB'] },
  { id: 'UP574', points: ['BBB', 'JKT'] },
  { id: 'UB579', points: ['BKK', 'SJI'] },
  // East Asia / Pacific
  { id: 'A1',    points: ['CAN', 'CH', 'PVG'] },
  { id: 'B576',  points: ['PVG', 'ICN'] },
  { id: 'R220',  points: ['HND', 'IGURU', 'ADNAP', 'ONION'] },
  { id: 'R580',  points: ['NRT', 'BUNGA', 'OATIS'] },
  // Pacific to Hawaii
  { id: 'R463',  points: ['SFO', 'REKIP', 'CINNY', 'NIKLL'] },
  // Australia / NZ
  { id: 'H65',   points: ['SY', 'ML', 'PH'] },
  { id: 'Q29',   points: ['SY', 'BN'] },
  { id: 'T172',  points: ['AK', 'SY'] },
  // South America
  { id: 'UM409', points: ['GRU', 'GIG', 'INTOL'] },
  { id: 'UL301', points: ['EZE', 'SCL'] },
  { id: 'UA315', points: ['BOG', 'LIM'] },
  { id: 'UA320', points: ['UIO', 'LIM'] },
  // Africa
  { id: 'UA400', points: ['CAI', 'JED', 'NBO'] },
  { id: 'UA600', points: ['JNB', 'CPT'] },
  { id: 'UB612', points: ['LOS', 'ADD'] },
];
