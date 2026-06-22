// ── Navigation database for the Route Planner & Mapper ──────────────────────────
// Scoped to the Barbados / eastern-Caribbean / Piarco-FIR region represented on the
// Grantley Adams TMA area chart (Barbados AIP AD 2-20). Seeded from the chart data
// also shown in MapTab / the Aerodromes & Nav tab. For training use only.

import { EXT_POINTS, EXT_AIRWAYS } from './navdbExtended';

export type NavKind = 'VOR' | 'NDB' | 'FIX' | 'AD' | 'BDY' | 'FIR';

export interface NavPoint {
  ident: string;
  name: string;
  lat: number;
  lon: number;
  kind: NavKind;
  freq?: string;
  note?: string;
  /** ICAO FIR this point sits in (aerodromes), where reliably known. */
  fir?: string;
  /** For boundary points: the two FIRs the point divides, e.g. ['TTZP','KZWY']. */
  between?: [string, string];
}

export interface Airway {
  id: string;
  /** Ordered sequence of point idents along the route. */
  points: string[];
  /** Altitude band: 'upper' = high/Jet routes (IFR-High), 'lower' = low/conventional (IFR-Low). */
  band?: 'upper' | 'lower';
  note?: string;
}

// ── VOR / VOR-DME navaids ───────────────────────────────────────────────────────
export const NAVAIDS: NavPoint[] = [
  { ident:'BGI', name:'Adams (Grantley Adams) VOR/DME', lat:13.0750, lon:-59.4839, kind:'VOR', freq:'112.7', note:'Centre of the Adams CTR/TMA. All TMA ATS routes radiate from BGI.' },
  { ident:'BNE', name:'Hewanorra VOR/DME (St Lucia)',   lat:13.7333, lon:-60.9769, kind:'VOR', freq:'112.4', note:'W end of G642 — centre of the Adams TMA 25 NM western arc. Co-located at Hewanorra (TLPL).' },
  { ident:'SV',  name:'Argyle VOR/DME (St Vincent)',    lat:13.1560, lon:-61.1490, kind:'VOR', freq:'108.4', note:'W end of A511 / A312 via GOTER. St Vincent (Argyle, TVSA).' },
  { ident:'GND', name:'Maurice Bishop VOR (Grenada)',   lat:12.0040, lon:-61.7860, kind:'VOR', note:'SW end of A561 via RAKAN.' },
  { ident:'ANU', name:'V.C. Bird VOR (Antigua)',        lat:17.1400, lon:-61.7920, kind:'VOR', note:'NW end of A632 via BIRNO.' },
  { ident:'FOF', name:'Fort-de-France VOR (Martinique)',lat:14.5910, lon:-61.0030, kind:'VOR', note:'NW end of A555 via BORUS.' },
  { ident:'PTR', name:'Piarco VOR (Trinidad)',          lat:10.5950, lon:-61.3370, kind:'VOR', note:'S end of A632 via ERROL — Piarco FIR centre navaid.' },
  { ident:'CYR', name:'CYR VOR (oceanic)',              lat:11.4000, lon:-57.9000, kind:'VOR', note:'SE end of A555 via KELSO (oceanic — approximate).' },
  // ── NDBs ──────────────────────────────────────────────────────────────────────
  { ident:'SLU', name:'George Charles NDB (St Lucia)',  lat:14.0202, lon:-60.9926, kind:'NDB', freq:'415', note:'NDB at George F.L. Charles (Vigie, TLPC), Castries — N St Lucia.' },
];

// ── Compulsory reporting fixes — Adams TMA (AIP AD 2-20) ─────────────────────────
export const FIXES: NavPoint[] = [
  { ident:'BIRNO', name:'BIRNO', lat:14.365, lon:-60.211, kind:'FIX', note:'A632 — 346°/88 DME BGI. NW to Martinique / Antigua.' },
  { ident:'BORUS', name:'BORUS', lat:14.046, lon:-60.466, kind:'FIX', note:'A555 — 330°/82 DME BGI. NW to Fort-de-France (FOF).' },
  { ident:'TEDDY', name:'TEDDY', lat:13.734, lon:-60.549, kind:'FIX', note:'G642 — 317°/74 DME BGI. W to St Lucia (BNE).' },
  { ident:'TIBOT', name:'TIBOT', lat:13.563, lon:-60.586, kind:'FIX', note:'R750 — 309°/71 DME BGI. W to St Lucia / St Vincent.' },
  { ident:'DAMOV', name:'DAMOV', lat:13.483, lon:-60.634, kind:'FIX', note:'Reporting fix near the Piarco FIR boundary.' },
  { ident:'GOTER', name:'GOTER', lat:13.128, lon:-60.878, kind:'FIX', note:'A511 / A312 — 287°/82 DME BGI. W to St Vincent (SV).' },
  { ident:'AMULA', name:'AMULA', lat:12.830, lon:-60.691, kind:'FIX', note:'R893 — 273°/72 DME BGI. SW to Canouan.' },
  { ident:'RAKAN', name:'RAKAN', lat:12.587, lon:-60.539, kind:'FIX', note:'A561 — 260°/68 DME BGI. SW to Grenada (GND).' },
  { ident:'LOGAN', name:'LOGAN', lat:12.138, lon:-60.143, kind:'FIX', note:'R515 — 230°/68 DME BGI. SW onward to TABEX / DALGA.' },
  { ident:'ERROL', name:'ERROL', lat:11.956, lon:-59.272, kind:'FIX', note:'A632 — 184°/68 DME BGI. S to Trinidad (Piarco).' },
  { ident:'KELSO', name:'KELSO', lat:12.217, lon:-58.722, kind:'FIX', note:'A555 — 154°/68 DME BGI. SE to CYR (oceanic).' },
];

// ── Aerodromes (regional subset, ICAO idents) ───────────────────────────────────
export const AERODROMES: NavPoint[] = [
  { ident:'TBPB', name:"Grantley Adams Int'l (Barbados)",  lat:13.07, lon:-59.49, kind:'AD', fir:'TTZP' },
  { ident:'TTPP', name:"Piarco Int'l (Trinidad)",          lat:10.59, lon:-61.34, kind:'AD', fir:'TTZP' },
  { ident:'TTCP', name:'Crown Point (Tobago)',             lat:11.15, lon:-60.83, kind:'AD' },
  { ident:'TGPY', name:"Maurice Bishop Int'l (Grenada)",   lat:12.00, lon:-61.79, kind:'AD' },
  { ident:'TLPL', name:"Hewanorra Int'l (St Lucia)",       lat:13.73, lon:-60.95, kind:'AD' },
  { ident:'TLPC', name:'George F.L. Charles (St Lucia)',   lat:14.01, lon:-61.00, kind:'AD' },
  { ident:'TVSA', name:"Argyle Int'l (St Vincent)",        lat:13.14, lon:-61.21, kind:'AD' },
  { ident:'TVSM', name:'J.F. Mitchell (Mustique)',         lat:12.88, lon:-61.18, kind:'AD' },
  { ident:'TVSC', name:'Canouan (St Vincent)',             lat:12.70, lon:-61.34, kind:'AD' },
  { ident:'TAPA', name:"V.C. Bird Int'l (Antigua)",        lat:17.14, lon:-61.79, kind:'AD' },
  { ident:'TKPK', name:"R.L. Bradshaw Int'l (St Kitts)",   lat:17.31, lon:-62.72, kind:'AD' },
  { ident:'TNCM', name:"Princess Juliana Int'l (St Maarten)", lat:18.04, lon:-63.11, kind:'AD' },
  { ident:'TQPF', name:"Clayton J. Lloyd Int'l (Anguilla)",lat:18.20, lon:-63.05, kind:'AD' },
  { ident:'TUPJ', name:'Terrance B. Lettsome (BVI)',       lat:18.44, lon:-64.54, kind:'AD' },
  { ident:'TNCC', name:"Hato Int'l (Curaçao)",             lat:12.19, lon:-68.96, kind:'AD' },
  { ident:'TNCO', name:'Flamingo (Bonaire)',               lat:12.21, lon:-68.27, kind:'AD' },
  { ident:'TFFF', name:'Aimé Césaire (Martinique)',        lat:14.59, lon:-61.00, kind:'AD' },
  { ident:'TFFR', name:'Pointe-à-Pitre (Guadeloupe)',      lat:16.27, lon:-61.53, kind:'AD' },
  // ── Wider Caribbean → Central America corridor (TBPB → MZBZ) ──────────────────
  { ident:'TNCA', name:'Queen Beatrix (Aruba)',            lat:12.5014, lon:-70.0152, kind:'AD', fir:'TNCF' },
  { ident:'SVMI', name:'Simón Bolívar / Maiquetía (Caracas)', lat:10.6013, lon:-66.9911, kind:'AD', fir:'SVZM' },
  { ident:'SYCJ', name:'Cheddi Jagan Int\'l (Guyana)',     lat:6.4986,  lon:-58.2541, kind:'AD' },
  { ident:'SOCA', name:'Félix Éboué (Cayenne)',            lat:4.8198,  lon:-52.3604, kind:'AD', fir:'SOOO' },
  { ident:'TJSJ', name:'Luis Muñoz Marín (San Juan)',      lat:18.4394, lon:-66.0018, kind:'AD', fir:'TJZS' },
  { ident:'TIST', name:'Cyril E. King (US Virgin Is.)',    lat:18.3373, lon:-64.9734, kind:'AD', fir:'TJZS' },
  { ident:'MDSD', name:'Las Américas (Santo Domingo)',     lat:18.4297, lon:-69.6689, kind:'AD', fir:'MDCS' },
  { ident:'MDPC', name:'Punta Cana Int\'l',                lat:18.5674, lon:-68.3634, kind:'AD', fir:'MDCS' },
  { ident:'MTPP', name:'Toussaint Louverture (Port-au-Prince)', lat:18.5800, lon:-72.2925, kind:'AD', fir:'MDCS' },
  { ident:'MKJP', name:'Norman Manley (Kingston)',         lat:17.9357, lon:-76.7875, kind:'AD', fir:'MKJK' },
  { ident:'MKJS', name:'Sangster Int\'l (Montego Bay)',    lat:18.5037, lon:-77.9134, kind:'AD', fir:'MKJK' },
  { ident:'MWCR', name:'Owen Roberts (Grand Cayman)',      lat:19.2928, lon:-81.3577, kind:'AD', fir:'MKJK' },
  { ident:'MUHA', name:'José Martí (Havana)',              lat:22.9892, lon:-82.4091, kind:'AD', fir:'MUFH' },
  { ident:'MZBZ', name:'Philip S.W. Goldson (Belize City)',lat:17.5391, lon:-88.3082, kind:'AD', fir:'MHTG' },
  { ident:'MGGT', name:'La Aurora (Guatemala City)',       lat:14.5833, lon:-90.5275, kind:'AD', fir:'MHTG' },
  { ident:'MHLM', name:'Ramón Villeda (San Pedro Sula)',   lat:15.4526, lon:-87.9236, kind:'AD', fir:'MHTG' },
  { ident:'MNMG', name:'Augusto C. Sandino (Managua)',     lat:12.1415, lon:-86.1682, kind:'AD', fir:'MHTG' },
  { ident:'MROC', name:'Juan Santamaría (San José)',       lat:9.9939,  lon:-84.2088, kind:'AD', fir:'MHTG' },
  { ident:'MPTO', name:'Tocumen Int\'l (Panama City)',     lat:9.0714,  lon:-79.3835, kind:'AD', fir:'MPZL' },
  { ident:'SKBO', name:'El Dorado (Bogotá)',               lat:4.7016,  lon:-74.1469, kind:'AD', fir:'SKED' },
  { ident:'SKBQ', name:'Ernesto Cortissoz (Barranquilla)', lat:10.8896, lon:-74.7808, kind:'AD', fir:'SKED' },
  // ── Wider Barbados destination/departure network (real ICAO idents, sourced coords) ──
  // K — USA
  { ident:'KJFK', name:'John F. Kennedy Int\'l (New York)', lat:40.6394, lon:-73.7793, kind:'AD', fir:'KZNY' },
  { ident:'KEWR', name:'Newark Liberty Int\'l',            lat:40.6894, lon:-74.1705, kind:'AD', fir:'KZNY' },
  { ident:'KBOS', name:'Boston Logan Int\'l',              lat:42.3620, lon:-71.0079, kind:'AD', fir:'KZBW' },
  { ident:'KMIA', name:'Miami Int\'l',                     lat:25.7960, lon:-80.2898, kind:'AD', fir:'KZMA' },
  { ident:'KFLL', name:'Fort Lauderdale–Hollywood Int\'l', lat:26.0726, lon:-80.1527, kind:'AD', fir:'KZMA' },
  { ident:'KCLT', name:'Charlotte Douglas Int\'l',         lat:35.2140, lon:-80.9431, kind:'AD', fir:'KZDC' },
  { ident:'KATL', name:'Hartsfield–Jackson (Atlanta)',     lat:33.6367, lon:-84.4281, kind:'AD', fir:'KZTL' },
  // C — Canada
  { ident:'CYYZ', name:'Toronto Pearson Int\'l',           lat:43.6759, lon:-79.6294, kind:'AD', fir:'CZYZ' },
  { ident:'CYUL', name:'Montréal–Trudeau Int\'l',          lat:45.4678, lon:-73.7423, kind:'AD', fir:'CZUL' },
  // E — Northern Europe / UK
  { ident:'EGKK', name:'London Gatwick',                   lat:51.1487, lon:-0.1857,  kind:'AD', fir:'EGTT' },
  { ident:'EGLL', name:'London Heathrow',                  lat:51.4707, lon:-0.4599,  kind:'AD', fir:'EGTT' },
  { ident:'EGCC', name:'Manchester',                       lat:53.3494, lon:-2.2795,  kind:'AD', fir:'EGTT' },
  // G — Eastern Atlantic ferry/charter stops
  { ident:'GCLP', name:'Gran Canaria (Canary Is.)',        lat:27.9319, lon:-15.3866, kind:'AD', fir:'GCCC' },
  { ident:'GVAC', name:'Amílcar Cabral (Cape Verde)',      lat:16.7414, lon:-22.9494, kind:'AD', fir:'GVSC' },
];

// ── ATS routes (airways) — ordered point sequences ──────────────────────────────
// Each TMA airway radiates from Adams VOR (BGI) out to a reporting fix and on to the
// neighbouring navaid named on the chart. Membership of both endpoints on the airway
// is what makes an airway leg valid.
// Curated Adams-TMA airways (Barbados AIP AD 2-20). All are low/conventional ATS
// routes (no "U" upper prefix) → band 'lower'. The wider regional upper & lower
// network is appended from the sourced EXT_AIRWAYS set below.
const TMA_AIRWAYS: Airway[] = [
  { id:'A632', band:'lower', points:['ANU','BIRNO','BGI','ERROL','PTR'], note:'NW–SE through BGI: Antigua ↔ BIRNO ↔ BGI ↔ ERROL ↔ Piarco.' },
  { id:'A555', band:'lower', points:['FOF','BORUS','BGI','KELSO','CYR'], note:'NW–SE through BGI: Martinique ↔ BORUS ↔ BGI ↔ KELSO ↔ CYR.' },
  { id:'G642', band:'lower', points:['BNE','TEDDY','BGI'],               note:'W–E: Hewanorra (BNE) ↔ TEDDY ↔ BGI.' },
  { id:'R750', band:'lower', points:['TIBOT','BGI'],                     note:'TIBOT ↔ BGI.' },
  { id:'A511', band:'lower', points:['SV','GOTER','BGI'],                note:'W–E: Argyle SV ↔ GOTER ↔ BGI.' },
  { id:'A312', band:'lower', points:['SV','GOTER','BGI'],                note:'Parallels A511 via GOTER.' },
  { id:'R893', band:'lower', points:['AMULA','BGI'],                     note:'AMULA ↔ BGI.' },
  { id:'A561', band:'lower', points:['GND','RAKAN','BGI'],               note:'SW: Grenada (GND) ↔ RAKAN ↔ BGI.' },
  { id:'R515', band:'lower', points:['LOGAN','BGI'],                     note:'LOGAN ↔ BGI.' },
];

// Full airway set = curated TMA routes (authoritative) + sourced regional network.
export const AIRWAYS: Airway[] = [...TMA_AIRWAYS, ...EXT_AIRWAYS];

// ── FIR-boundary reporting points (exact AIP coordinates) ───────────────────────
// Compulsory RNAV reporting points published on Piarco-FIR (TTZP) common boundaries.
// Sources: Trinidad & Tobago CAA AIRAC AIP SUP 08/24 (TTZP/KZWY), SUP 08/23 (TTZP/SOOO)
// and the Adams-TMA / Piarco supplements. Each point's `between` names the two FIRs it
// divides. Coordinates are exact (DMS → decimal); they are the only boundary geometry
// rendered on the map — full lateral limits are shown via the reference chart in the
// Location Indicators tab rather than drawn as an approximation.
export const BOUNDARY_POINTS: NavPoint[] = [
  // TTZP / KZWY — northern (New York Oceanic) common boundary, ordered NE
  { ident:'SAXEZ', name:'SAXEZ — TTZP/KZWY boundary', lat:18.71944, lon:-44.19333, kind:'BDY', between:['TTZP','KZWY'], note:'18°43′10″N 044°11′36″W. Compulsory RNAV report on the TTZP/KZWY boundary (AIP SUP 08/24).' },
  { ident:'THYRD', name:'THYRD — TTZP/KZWY boundary', lat:19.43528, lon:-43.37944, kind:'BDY', between:['TTZP','KZWY'], note:'19°26′07″N 043°22′46″W. TTZP/KZWY boundary RNAV report.' },
  { ident:'URICO', name:'URICO — TTZP/KZWY boundary', lat:20.14722, lon:-42.55833, kind:'BDY', between:['TTZP','KZWY'], note:'20°08′50″N 042°33′30″W. TTZP/KZWY boundary RNAV report.' },
  // TTZP / SOOO — south-eastern (Cayenne) common boundary
  { ident:'ASDOT', name:'ASDOT — TTZP/SOOO boundary', lat:12.53583, lon:-40.54222, kind:'BDY', between:['TTZP','SOOO'], note:'12°32′09″N 040°32′32″W. TTZP/SOOO boundary RNAV report (AIP SUP 08/23).' },
  { ident:'KADEL', name:'KADEL — TTZP/SOOO boundary', lat:13.35833, lon:-37.95611, kind:'BDY', between:['TTZP','SOOO'], note:'13°21′30″N 037°57′22″W. TTZP/SOOO boundary RNAV report.' },
  { ident:'SEMLO', name:'SEMLO — TTZP/SOOO boundary', lat:12.04722, lon:-42.035,   kind:'BDY', between:['TTZP','SOOO'], note:'12°02′50″N 042°02′06″W. TTZP/SOOO boundary RNAV report.' },
  { ident:'LONEP', name:'LONEP — TTZP/SOOO boundary', lat:11.13139, lon:-44.75611, kind:'BDY', between:['TTZP','SOOO'], note:'11°07′53″N 044°45′22″W. TTZP/SOOO boundary RNAV report.' },
  { ident:'PANON', name:'PANON — TTZP/SOOO boundary', lat:10.0,     lon:-48.0,     kind:'BDY', between:['TTZP','SOOO'], note:'10°00′00″N 048°00′00″W. TTZP/SOOO boundary RNAV report.' },
  { ident:'MOTSI', name:'MOTSI — TTZP/SOOO boundary', lat:9.85222,  lon:-49.41861, kind:'BDY', between:['TTZP','SOOO'], note:'09°51′08″N 049°25′07″W. TTZP/SOOO boundary RNAV report.' },
  { ident:'VALOV', name:'VALOV — TTZP/SOOO boundary', lat:9.67444,  lon:-51.05,    kind:'BDY', between:['TTZP','SOOO'], note:'09°40′28″N 051°03′00″W. TTZP/SOOO boundary RNAV report.' },
  // Adams-TMA / Piarco oceanic boundary points (NE of Barbados)
  { ident:'URSIK', name:'URSIK — Adams TMA / TTZP boundary', lat:14.20306, lon:-59.03,    kind:'BDY', between:['TTZP','TTZP'], note:'14°12′11″N 059°01′48″W. NE corner of the Adams TMA on the Piarco oceanic boundary.' },
  { ident:'TWELM', name:'TWELM — Adams TMA / TTZP boundary', lat:13.92222, lon:-58.70778, kind:'BDY', between:['TTZP','TTZP'], note:'13°55′20″N 058°42′28″W. Adams TMA boundary on the Piarco oceanic sector.' },
];

/** Sequences of boundary points that form a published common-boundary line (ordered). */
export const BOUNDARY_LINES: { firs: [string, string]; points: string[]; note: string }[] = [
  { firs:['TTZP','KZWY'], points:['SAXEZ','THYRD','URICO'], note:'Piarco / New York Oceanic common boundary — compulsory RNAV reporting points (AIP SUP 08/24).' },
];

// ── Flight Information Regions (idents + representative label anchors) ────────────
// NOTE: anchors are label positions near each FIR's control centre/region — they are
// NOT boundary geometry. Exact lateral limits are not drawn; consult the AIP / the
// reference FIR chart. Only the sourced boundary reporting points above are plotted.
export interface Fir {
  ident: string;
  name: string;
  authority: string;
  /** Representative label anchor (control centre / region) — not a boundary vertex. */
  lat: number;
  lon: number;
  role?: string;
}
export const FIRS: Fir[] = [
  { ident:'TTZP', name:'Piarco FIR',            authority:'Trinidad & Tobago CAA (Piarco ACC)', lat:12.6, lon:-58.6, role:'Home FIR — controls the airspace over Barbados & the Adams TMA.' },
  { ident:'TJZS', name:'San Juan Oceanic FIR',  authority:'USA / FAA (San Juan CERAP)',          lat:18.9, lon:-65.5, role:'NW neighbour — Puerto Rico, US/Brit. Virgin Islands.' },
  { ident:'KZWY', name:'New York Oceanic FIR',  authority:'USA / FAA (New York Oceanic)',        lat:21.5, lon:-60.0, role:'Northern oceanic neighbour (TTZP/KZWY boundary).' },
  { ident:'SVZM', name:'Maiquetía FIR',         authority:'Venezuela (INAC)',                    lat:10.4, lon:-65.5, role:'SW/W neighbour — Venezuela.' },
  { ident:'SOOO', name:'Cayenne FIR/UIR',       authority:'France (DSNA)',                       lat:6.0,  lon:-52.5, role:'SE oceanic neighbour (TTZP/SOOO boundary).' },
  { ident:'TNCF', name:'Curaçao FIR',           authority:'Dutch Caribbean (DC-ANSP)',           lat:12.4, lon:-69.2, role:'ABC islands (Aruba, Bonaire, Curaçao) & Sint Maarten.' },
  { ident:'MDCS', name:'Santo Domingo FIR',     authority:'Dominican Republic (IDAC)',           lat:18.7, lon:-69.9, role:'Hispaniola — Dominican Republic & Haiti.' },
  { ident:'MKJK', name:'Kingston FIR',          authority:'Jamaica (JCAA)',                      lat:17.6, lon:-77.5, role:'Jamaica & Cayman Islands.' },
  { ident:'MUFH', name:'Habana FIR',            authority:'Cuba (IACC)',                          lat:22.4, lon:-79.5, role:'Cuba.' },
  { ident:'MHTG', name:'Central American FIR',  authority:'COCESNA',                              lat:15.0, lon:-87.5, role:'Belize, Guatemala, Honduras, El Salvador, Nicaragua, Costa Rica — contains MZBZ.' },
  { ident:'MPZL', name:'Panamá FIR',            authority:'Panama (AAC)',                         lat:8.3,  lon:-80.0, role:'Panama.' },
  { ident:'SKED', name:'Barranquilla FIR',      authority:'Colombia (Aerocivil)',                lat:11.2, lon:-74.5, role:'N Colombia / SW Caribbean.' },
];

// ── Lookups ─────────────────────────────────────────────────────────────────────
export const ALL_POINTS: NavPoint[] = [...NAVAIDS, ...FIXES, ...AERODROMES, ...BOUNDARY_POINTS, ...EXT_POINTS];

const POINT_BY_IDENT = new Map<string, NavPoint>();
ALL_POINTS.forEach(p => { if (!POINT_BY_IDENT.has(p.ident)) POINT_BY_IDENT.set(p.ident, p); });
const AIRWAY_BY_ID = new Map<string, Airway>();
AIRWAYS.forEach(a => { if (!AIRWAY_BY_ID.has(a.id)) AIRWAY_BY_ID.set(a.id, a); });
const FIR_BY_IDENT = new Map<string, Fir>();
FIRS.forEach(f => { if (!FIR_BY_IDENT.has(f.ident)) FIR_BY_IDENT.set(f.ident, f); });

export const lookupPoint = (ident: string): NavPoint | undefined => POINT_BY_IDENT.get(ident.toUpperCase());
export const lookupAirway = (id: string): Airway | undefined => AIRWAY_BY_ID.get(id.toUpperCase());
export const lookupFir = (ident: string): Fir | undefined => FIR_BY_IDENT.get(ident.toUpperCase());

/**
 * A FIR used inside a route string is plotted as a labelled REGION marker at the
 * FIR's representative label anchor — NOT a precise navaid fix and NOT boundary
 * geometry. The returned NavPoint carries kind 'FIR' so the map can render it
 * distinctly. `name` is the full region name; callers append the ident.
 */
export const firAsPoint = (ident: string): NavPoint | undefined => {
  const f = lookupFir(ident);
  if (!f) return undefined;
  return { ident: f.ident, name: f.name, lat: f.lat, lon: f.lon, kind: 'FIR', note: `${f.authority}. Region label anchor — not a precise fix.` };
};

// ── Geometry helpers ────────────────────────────────────────────────────────────
const R_NM = 3440.065; // Earth radius in nautical miles
const toRad = (d: number) => (d * Math.PI) / 180;

export interface LatLon { lat: number; lon: number; }

export function haversineNm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function initialBearingTrue(a: LatLon, b: LatLon): number {
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Barbados / eastern Caribbean magnetic variation is ~15°W. "Variation West, Magnetic Best"
// → magnetic = true + variation. Matches the chart radials (e.g. BGI→BIRNO 331°T ≈ 346°M).
export const MAG_VAR_W = 15;
export const toMagnetic = (trueDeg: number): number => (trueDeg + MAG_VAR_W + 360) % 360;

// ── Direct great-circle interpolation ────────────────────────────────────────────
// Densify a leg into intermediate points along the true great-circle path so a
// "direct" line bends correctly on the projection. Returns >= 2 points (a..b).
export function greatCirclePoints(a: LatLon, b: LatLon, segs = 24): LatLon[] {
  const la1 = toRad(a.lat), lo1 = toRad(a.lon);
  const la2 = toRad(b.lat), lo2 = toRad(b.lon);
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2,
  ));
  if (!isFinite(d) || d < 1e-9) return [{ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }];
  const n = Math.max(2, Math.min(64, segs));
  const out: LatLon[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    out.push({ lat: Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI, lon: Math.atan2(y, x) * 180 / Math.PI });
  }
  return out;
}

// ── Airway-network graph + shortest path ─────────────────────────────────────────
// Adjacency built ONLY from the sourced airway point sequences (consecutive members
// are connected, weighted by great-circle distance). No edges are invented.
const NETWORK_ADJ = (() => {
  const adj = new Map<string, Map<string, number>>();
  const link = (ai: string, bi: string) => {
    const a = lookupPoint(ai), b = lookupPoint(bi);
    if (!a || !b) return;
    const w = haversineNm(a, b);
    if (!adj.has(ai)) adj.set(ai, new Map());
    if (!adj.has(bi)) adj.set(bi, new Map());
    const ea = adj.get(ai)!, eb = adj.get(bi)!;
    if (!ea.has(bi) || ea.get(bi)! > w) ea.set(bi, w);
    if (!eb.has(ai) || eb.get(ai)! > w) eb.set(ai, w);
  };
  AIRWAYS.forEach(awy => {
    for (let i = 0; i < awy.points.length - 1; i++) link(awy.points[i], awy.points[i + 1]);
  });
  return adj;
})();

const NETWORK_NODES: NavPoint[] = [...NETWORK_ADJ.keys()]
  .map(id => lookupPoint(id))
  .filter((p): p is NavPoint => !!p);

// Nearest network node to a point, within an optional cap (nm).
function nearestNode(p: LatLon, capNm: number): NavPoint | null {
  let best: NavPoint | null = null, bd = Infinity;
  for (const n of NETWORK_NODES) {
    const d = haversineNm(p, n);
    if (d < bd) { bd = d; best = n; }
  }
  return best && bd <= capNm ? best : null;
}

// Dijkstra over the airway network between two node idents.
function dijkstra(fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId];
  const dist = new Map<string, number>([[fromId, 0]]);
  const prev = new Map<string, string>();
  const seen = new Set<string>();
  while (seen.size < NETWORK_ADJ.size) {
    let u: string | null = null, ud = Infinity;
    for (const [id, d] of dist) if (!seen.has(id) && d < ud) { ud = d; u = id; }
    if (u == null) break;
    if (u === toId) break;
    seen.add(u);
    for (const [v, w] of NETWORK_ADJ.get(u) ?? []) {
      if (seen.has(v)) continue;
      const nd = ud + w;
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); }
    }
  }
  if (!dist.has(toId)) return null;
  const path: string[] = [toId];
  let cur = toId;
  while (cur !== fromId) {
    const p = prev.get(cur);
    if (!p) return null;
    path.unshift(p); cur = p;
  }
  return path;
}

export interface RouteLink { path: NavPoint[]; viaNetwork: boolean; distanceNm: number; }

/**
 * Shortest path between two aerodromes (or any two points). Prefers routing over the
 * sourced airway network — each endpoint is joined to its nearest network node (within
 * `connectCapNm`) and Dijkstra finds the least-distance chain. Falls back to a direct
 * great-circle line when either endpoint cannot reach the network or no path exists.
 */
export function shortestRouteLink(from: NavPoint, to: NavPoint, connectCapNm = 150): RouteLink {
  const directGc = greatCirclePoints(from, to).map(p => ({
    ident: '', name: '', lat: p.lat, lon: p.lon, kind: 'FIX' as NavKind,
  }));
  const direct: RouteLink = {
    path: [from, ...directGc.slice(1, -1), to],
    viaNetwork: false,
    distanceNm: haversineNm(from, to),
  };
  const a = nearestNode(from, connectCapNm);
  const b = nearestNode(to, connectCapNm);
  if (!a || !b) return direct;
  const ids = dijkstra(a.ident, b.ident);
  if (!ids) return direct;
  const nodes = ids.map(id => lookupPoint(id)).filter((p): p is NavPoint => !!p);
  if (nodes.length < 1) return direct;
  // Stitch: aerodrome → entry node → … → exit node → aerodrome (dedupe coincident ends).
  const path: NavPoint[] = [];
  if (haversineNm(from, nodes[0]) > 0.5) path.push(from);
  path.push(...nodes);
  if (haversineNm(to, nodes[nodes.length - 1]) > 0.5) path.push(to);
  let dist = 0;
  for (let i = 0; i < path.length - 1; i++) dist += haversineNm(path[i], path[i + 1]);
  // If the network detour is dramatically longer than a straight line, prefer direct.
  if (dist > direct.distanceNm * 2.2) return direct;
  return { path, viaNetwork: true, distanceNm: dist };
}
