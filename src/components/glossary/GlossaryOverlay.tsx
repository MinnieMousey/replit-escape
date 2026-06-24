import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapTab } from './MapTab';
import { LocIndTab } from './LocIndTab';
import { AipTab } from './AipTab';
import { AircraftTab, ACFT_TYPES, AIRLINES, WTC_CATS } from './AircraftTab';
import { RouteTab } from './RouteTab';
import { CaribbeanRefTab } from './CaribbeanRefTab';
import { NAVAIDS, FIXES, AIRWAYS } from './navdb';

interface GlossaryOverlayProps { isOpen: boolean; onClose: () => void; }
type Tab = 'abbrevs' | 'qcodes' | 'fplequip' | 'metar' | 'ats' | 'handling' | 'docs' | 'calllog' | 'aerodromes' | 'map' | 'locind' | 'aip' | 'aircraft' | 'route' | 'caribbean';
interface CallLogEntry { id: string; text: string; timestamp: number; }

// ── Accordion helper ───────────────────────────────────────────────────────────
function useAccordion(defaultOpen: string[] = []) {
  const [open, setOpen] = useState<Set<string>>(new Set(defaultOpen));
  const toggle = useCallback((k: string) =>
    setOpen(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s; }), []);
  const isOpen = (k: string) => open.has(k);
  return { isOpen, toggle };
}

const Section: React.FC<{
  id: string; title: string; isOpen: boolean; onToggle: () => void;
  badge?: string | number; color?: string; children: React.ReactNode;
}> = ({ id, title, isOpen, onToggle, badge, color = 'text-white', children }) => (
  <div className="border border-white/10 rounded-xl overflow-hidden mb-2">
    <button
      className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
      style={{ touchAction: 'manipulation' }}
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={`sec-${id}`}
    >
      <span className={`font-bold text-sm ${color}`}>{title}</span>
      <div className="flex items-center gap-2">
        {badge !== undefined && (
          <span className="text-xs text-white/30 bg-white/10 px-2 py-0.5 rounded-full">{badge}</span>
        )}
        <span className="text-white/40 text-xs select-none">{isOpen ? '▲' : '▼'}</span>
      </div>
    </button>
    {isOpen && (
      <div id={`sec-${id}`} className="px-4 py-3 bg-black/10">
        {children}
      </div>
    )}
  </div>
);

// ── Data ───────────────────────────────────────────────────────────────────────
const ABBREVS: [string, string][] = [
  ['ACC','Area Control Centre — provides ATC service to controlled airspace'],
  ['AD','Aerodrome'],
  ['ADF','Automatic Direction Finder — airborne receiver using NDB signals'],
  ['ADIZ','Air Defence Identification Zone'],
  ['AGL','Above Ground Level'],
  ['AIC','Aeronautical Information Circular — advisory, not operationally binding'],
  ['AIP','Aeronautical Information Publication — official state publication of permanent aeronautical information'],
  ['AIRAC','Aeronautical Information Regulation And Control — 28-day cycle for regulated changes'],
  ['AIS','Aeronautical Information Services — office responsible for NOTAM, AIP, PIB etc.'],
  ['AMDT','Amendment'],
  ['AMSL','Above Mean Sea Level'],
  ['ATC','Air Traffic Control'],
  ['ATIS','Automatic Terminal Information Service — recorded broadcast of aerodrome conditions'],
  ['ATS','Air Traffic Services'],
  ['BCAD','Barbados Civil Aviation Department — competent authority for civil aviation in Barbados'],
  ['CAS','Controlled Airspace'],
  ['CTR','Control Zone — controlled airspace around an aerodrome, from surface upward'],
  ['DME','Distance Measuring Equipment — ground transponder giving slant range'],
  ['EOBT','Estimated Off-Block Time — planned time aircraft pushes back from stand'],
  ['EET','Estimated Elapsed Time — planned total flight time departure to destination'],
  ['ETD','Estimated Time of Departure'],
  ['FIC','Flight Information Centre'],
  ['FIR','Flight Information Region — airspace with defined lateral limits within which FIS/ATC provided'],
  ['FL','Flight Level — altitude in hundreds of feet using standard pressure 1013.25 hPa'],
  ['FPL','Filed Flight Plan'],
  ['GBAS','Ground Based Augmentation System — precision approach via VHF data link'],
  ['IFR','Instrument Flight Rules'],
  ['ILS','Instrument Landing System — precision approach aid (localizer + glide path + markers)'],
  ['METAR','Meteorological Aerodrome Report — regular aviation weather observation'],
  ['MDA','Minimum Descent Altitude — NPA minimum below which descent not permitted without visual reference'],
  ['MEA','Minimum En-route Altitude'],
  ['MOCA','Minimum Obstacle Clearance Altitude'],
  ['MSA','Minimum Safe Altitude — published in approach charts for emergency use'],
  ['NDB','Non-Directional Beacon — HF/LF/MF navaid for ADF homing/bearing'],
  ['NOTAM','Notice to Air Missions — information concerning establishment, condition or change of aeronautical facility/service/procedure/hazard'],
  ['OCA','Obstacle Clearance Altitude'],
  ['PAPI','Precision Approach Path Indicator — visual glidepath lights'],
  ['PIB','Pre-flight Information Bulletin — collation of relevant NOTAMs for a flight'],
  ['QFE','Altimeter setting so altimeter reads height above aerodrome elevation'],
  ['QNH','Altimeter setting so altimeter reads altitude above MSL'],
  ['RNAV','Area Navigation — aircraft can fly any desired path not limited to navaid routes'],
  ['RNP','Required Navigation Performance — RNAV with on-board monitoring and alerting'],
  ['SBAS','Satellite Based Augmentation System — e.g. EGNOS, WAAS'],
  ['SID','Standard Instrument Departure — published ATC departure route'],
  ['SIGMET','Significant Meteorological Information — advisory affecting aircraft safety'],
  ['SPECI','Special Meteorological Report — unscheduled METAR on significant condition change'],
  ['STAR','Standard Terminal Arrival Route — published ATC arrival route'],
  ['TAF','Terminal Aerodrome Forecast — aerodrome weather forecast in coded format'],
  ['TMA','Terminal Manoeuvring Area — controlled airspace around busy aerodromes'],
  ['UAS','Unmanned Aircraft System — drone and its control infrastructure'],
  ['VFR','Visual Flight Rules'],
  ['VOLMET','Meteorological information broadcast for aircraft in flight'],
  ['VOR','VHF Omnidirectional Range — short-range navaid giving magnetic bearing from station'],
  ['VORTAC','Co-located VOR and TACAN'],
];

const SUBJECT_CATS = [
  { cat:'Movement / Landing Area', codes:[
    ['RW','Runway (general)'],['TW','Taxiway'],['MN','Apron / ramp'],
    ['MD','Declared distances (TORA/TODA/ASDA/LDA)'],['MT','Threshold'],
    ['MU','Runway turning bay'],['MW','Runway strip / clearway'],
  ]},
  { cat:'Navigation Aids', codes:[
    ['NI','ILS — complete system'],['NH','Localizer'],['NG','Glide path'],
    ['NK','DME (ILS/MLS associated)'],['NV','VOR / VORTAC'],['NX','VOR/DME'],
    ['NB','NDB'],['ND','DVOR'],['NN','TACAN'],
  ]},
  { cat:'Lighting', codes:[
    ['LA','Approach lighting'],['LB','Aerodrome beacon'],['LC','Runway centreline lights'],
    ['LE','Runway edge lights'],['LP','PAPI'],['LV','VASI'],
    ['LT','Threshold lights'],['LZ','Touchdown zone lights'],
    ['LY','Taxiway edge lights'],['LG','Pilot-controlled lighting'],
  ]},
  { cat:'Airspace / Restrictions', codes:[
    ['GZ','Prohibited area'],['GR','Restricted area'],['GW','Warning area'],
    ['GD','Danger area'],['AC','Airspace classification'],
    ['AE','Control area (CTA)'],['AT','TMA'],['AF','FIR'],
  ]},
  { cat:'Obstacles & Procedures', codes:[
    ['OB','Obstacle (general)'],['OL','Obstacle lights'],
    ['PA','Instrument approach procedure'],['PD','SID'],['PE','STAR'],
    ['PH','Holding procedure'],['PI','ILS approach'],['PK','VOR approach'],
  ]},
];

const CONDITION_CODES: [string,string][] = [
  ['XX','Unserviceable'],['LC','Closed'],['LH','Limited operating hours'],
  ['LR','Limited / restricted'],['LV','VFR only'],['CA','Activated'],
  ['CC','Commissioned'],['CD','Downgraded'],['CE','Erected / installed'],
  ['CF','Operating on reduced power'],['CH','Changed / modified'],
  ['CT','On test — do not use for navigation'],['RM','Removed'],['RO','Returned to service'],
];

const PURPOSE_CODES: [string,string,string][] = [
  ['N','Immediate','Safety critical — included in all PIBs immediately'],
  ['B','Pre-flight','Essential for pre-flight planning'],
  ['O','Operational','Operationally significant, not safety-critical'],
  ['M','Miscellaneous','Information only, not in PIBs by default'],
  ['K','Checklist','Included only in NOTAM checklists'],
  ['NBO','N+B+O combined','Most common for runway/navaid closures'],
  ['BO','B+O combined','Pre-flight check + ops significance required'],
];

const SCOPE_CODES: [string,string,string][] = [
  ['A','Aerodrome','Affects aerodrome operations only'],
  ['E','En-route','Affects en-route phase (navaids, airways)'],
  ['W','Navigation warning','Danger/warning areas, hazards in flight'],
  ['AE','Aerodrome + En-route','e.g. VOR at an aerodrome affecting both'],
  ['AW','Aerodrome + Warning','e.g. TRA overlapping ATZ'],
  ['AEW','All scopes','Implications across all categories'],
];

const TRAFFIC_CODES: [string,string,string][] = [
  ['I','IFR only','NOTAM applies to IFR traffic'],
  ['V','VFR only','NOTAM applies to VFR traffic'],
  ['IV','IFR and VFR','All traffic (most common)'],
];

const FPL_ITEMS = [
  { item:'7', title:'Aircraft Identification', format:'Up to 7 chars — callsign or registration', description:'The callsign used on radio (e.g. BAW456) or, if none, the aircraft registration (e.g. 9Y-BAC).' },
  { item:'8', title:'Flight Rules / Type of Flight', format:'Rules letter + Type letter', description:'Rules: I=IFR, V=VFR, Y=IFR then VFR, Z=VFR then IFR. Type: S=Scheduled, N=Non-scheduled, G=GA, M=Military, X=Other.' },
  { item:'9', title:'Number / Type / Wake', format:'[Number] + ICAO type + / + wake category', description:'ICAO type designator (e.g. B738, A320, C172). Wake: L=Light (<7000kg), M=Medium, H=Heavy (>136000kg), J=Super.' },
  { item:'10', title:'Equipment — COM/NAV & SSR', format:'Letter codes / SSR code', description:'Before /: S=Standard (VHF+VOR+ILS), N=Nil, or individual codes. After /: N=none, C=Mode A+C, S=Mode S, SDE1=Mode S+ADS-B.' },
  { item:'13', title:'Departure Aerodrome / EOBT', format:'4-letter ICAO + HHMM UTC', description:'ICAO location indicator for departure aerodrome (e.g. TBPB). EOBT in UTC.' },
  { item:'15', title:'Cruising Speed / Level / Route', format:'Speed Level space Route', description:'N=knots (N0450), K=km/h, M=Mach. Level: F=FL (F350), A=altitude in 100s ft, VFR. Route: DCT for direct or airway/waypoint sequence.' },
  { item:'16', title:'Destination / EET / Alternates', format:'ICAO + HHMM EET + up to 2 alternate ICAO', description:'Destination ICAO. Total EET from take-off in HHMM. Up to 2 alternate aerodromes.' },
  { item:'18', title:'Other Information', format:'KEYWORD/ value or 0', description:'Mandatory order: STS/ PBN/ NAV/ COM/ DAT/ SUR/ DEP/ DEST/ DOF/ REG/ EET/ SEL/ CODE/ OPR/ RMK/. Use 0 if nothing.' },
  { item:'19', title:'Supplementary Information', format:'E/ P/ R/ S/ J/ D/ A/ N/ C/', description:'E/ Endurance HHMM. P/ POB (3 digits). R/ Radio: U/V/E. S/ Survival: P/D/M/J. J/ Jackets: L/F/U/V. A/ Aircraft colour. C/ Pilot name.' },
];

const ITEM_10A = [
  {code:'N',  desc:'Nil equipment'},
  {code:'S',  desc:'Standard — VHF RTF, VOR, ILS'},
  {code:'A',  desc:'GBAS landing system'},
  {code:'B',  desc:'LPV (APV with SBAS)'},
  {code:'D',  desc:'DME'},
  {code:'F',  desc:'ADF'},
  {code:'G',  desc:'GNSS — specify in Item 18 NAV/'},
  {code:'H',  desc:'HF RTF'},
  {code:'I',  desc:'Inertial Navigation'},
  {code:'J1', desc:'CPDLC ATN VHF'},
  {code:'J4', desc:'CPDLC FANS 1/A VDL Mode 2'},
  {code:'J5', desc:'CPDLC FANS 1/A SATCOM (INMARSAT)'},
  {code:'L',  desc:'ILS'},
  {code:'O',  desc:'VOR'},
  {code:'R',  desc:'PBN approved — specify in Item 18 PBN/'},
  {code:'T',  desc:'TACAN'},
  {code:'U',  desc:'UHF RTF'},
  {code:'V',  desc:'VHF RTF'},
  {code:'W',  desc:'RVSM approved'},
  {code:'Y',  desc:'VHF with 8.33 kHz channel spacing'},
  {code:'Z',  desc:'Other equipment — specify in Item 18 NAV/ or COM/'},
];

const ITEM_10B = [
  {code:'N',   desc:'No transponder'},
  {code:'A',   desc:'Mode A only (4096 codes)'},
  {code:'C',   desc:'Mode A + Mode C (altitude)'},
  {code:'S',   desc:'Mode S — aircraft ID + altitude'},
  {code:'E',   desc:'Mode S + ADS-B 1090 MHz extended squitter'},
  {code:'H',   desc:'Mode S + aircraft ID + altitude + enhanced surveillance'},
  {code:'L',   desc:'Mode S + extended squitter + enhanced surveillance'},
  {code:'SDE1',desc:'Mode S + ID + altitude + ADS-B out (most common commercial)'},
  {code:'U',   desc:'ADS-B 1090 MHz extended squitter out only'},
  {code:'B1',  desc:'ADS-B UAT out only'},
  {code:'B2',  desc:'ADS-B UAT in and out'},
];

const ITEM_18_ORDER = [
  {kw:'STS/', eg:'STS/HOSP'},
  {kw:'PBN/', eg:'PBN/B2 (RNAV 5 GNSS) · PBN/L1 (RNP AR)'},
  {kw:'NAV/', eg:'NAV/RNVD1E2'},
  {kw:'COM/', eg:'COM/SATVOICE'},
  {kw:'SUR/', eg:'SUR/RSP180'},
  {kw:'DEP/', eg:'DEP/TBPB 1300 (if ZZZZ in Item 13)'},
  {kw:'DEST/',eg:'DEST/TTPP (if ZZZZ in Item 16)'},
  {kw:'DOF/', eg:'DOF/260603'},
  {kw:'REG/', eg:'REG/9YBAC'},
  {kw:'EET/', eg:'EET/TBAD0030 TTTT0110'},
  {kw:'SEL/', eg:'SEL/ABCD'},
  {kw:'CODE/',eg:'CODE/A1F2E9'},
  {kw:'OPR/', eg:'OPR/BAW'},
  {kw:'RMK/', eg:'RMK/CREW REQ OXYGEN'},
];

const CLOUD_COV = [
  {code:'SKC',  oktas:'0',   meaning:'Sky clear'},
  {code:'NSC',  oktas:'0',   meaning:'Nil significant cloud (auto station)'},
  {code:'NCD',  oktas:'0',   meaning:'No cloud detected (auto station)'},
  {code:'FEW',  oktas:'1–2', meaning:'1–2 oktas — mostly clear'},
  {code:'SCT',  oktas:'3–4', meaning:'3–4 oktas — scattered'},
  {code:'BKN',  oktas:'5–7', meaning:'5–7 oktas — mostly cloudy, some gaps'},
  {code:'OVC',  oktas:'8',   meaning:'Full overcast — no gaps'},
  {code:'CAVOK',oktas:'—',   meaning:'Vis ≥ 10 km, no cloud below 5000 ft, no sig wx'},
];

const WX_DESC: [string,string][] = [
  ['MI','Shallow'],['PR','Partial'],['BC','Patches'],['DR','Low drifting'],
  ['BL','Blowing'],['SH','Shower(s)'],['TS','Thunderstorm'],['FZ','Freezing'],
];

const WX_PHEN: [string,string][] = [
  ['RA','Rain'],['DZ','Drizzle'],['SN','Snow'],['SG','Snow grains'],
  ['PL','Ice pellets'],['GR','Hail (≥5mm)'],['GS','Small hail'],
  ['BR','Mist (vis 1000–9999m)'],['FG','Fog (vis <1000m)'],
  ['FU','Smoke'],['VA','Volcanic ash'],['HZ','Haze'],
  ['PO','Dust/sand whirls'],['SQ','Squall'],['FC','Funnel cloud / tornado'],
  ['SS','Sandstorm'],['DS','Duststorm'],
];

const ATS_MSGS = [
  { cat:'Movement & Control', color:'text-sky-400', msgs:[
    {code:'FPL',  trigger:'Filed before departure',                   fields:'Aircraft ID, rules, type, equipment, DEP, EOBT, speed, level, route, DEST, EET, alternates'},
    {code:'DEP',  trigger:'Aircraft becomes airborne',                fields:'Aircraft ID, departure aerodrome, actual departure time'},
    {code:'ARR',  trigger:'Aircraft lands',                           fields:'Aircraft ID, DEP aerodrome, DEST aerodrome, actual arrival time'},
    {code:'DLA',  trigger:'Delay > 30 minutes',                       fields:'Aircraft ID, revised EOBT, reason for delay'},
    {code:'CHG',  trigger:'Amendment to filed flight plan',           fields:'Aircraft ID, item number, old value, new value'},
    {code:'CNL',  trigger:'Flight plan cancelled before departure',   fields:'Aircraft ID, DEP aerodrome, EOBT, reason'},
  ]},
  { cat:'Flight Information', color:'text-green-400', msgs:[
    {code:'EST',  trigger:'Position estimate at next reporting point', fields:'Aircraft ID, reporting point, estimated time, FL, next reporting point'},
    {code:'CPL',  trigger:'Full FPL passed at ATC unit boundary',     fields:'Full FPL data + position, level, speed, estimates to all remaining waypoints'},
    {code:'CDN',  trigger:'Unit A requests transfer to Unit B',       fields:'Aircraft ID, boundary point, estimated crossing time, requested level'},
    {code:'ACP',  trigger:'Unit B accepts flight (reply to CDN)',     fields:'Aircraft ID, acceptance confirmation'},
  ]},
  { cat:'Alerting', color:'text-red-400', msgs:[
    {code:'INCERFA',  trigger:'> 30 min overdue, no contact',         fields:'Aircraft ID, last known position, fuel endurance, POB, nature of uncertainty'},
    {code:'ALERFA',   trigger:'Uncertainty continues or distress indicated', fields:'Aircraft ID, last known position, actions taken, SAR notified'},
    {code:'DETRESFA', trigger:'Distress known or believed',           fields:'Aircraft ID, last known position, distress nature, SAR activated'},
    {code:'RCF',      trigger:'Aircraft squawking 7600 (NORDO)',      fields:'Aircraft ID, last communication frequency, lost-comms time'},
  ]},
];

const TRANSPONDER_CODES = [
  {code:'7500', meaning:'Unlawful interference (hijack)'},
  {code:'7600', meaning:'Radio communication failure (NORDO)'},
  {code:'7700', meaning:'General emergency / distress'},
];

const HANDLING_CRITERIA = [
  { criterion:'1. Urgency', opts:[
    {val:'Immediate (< 24 hours)', desc:'Must reach users before it takes effect → NOTAM'},
    {val:'Non-immediate (planned)', desc:'Known in advance with sufficient lead time → AIRAC/AIP/AIC cycle'},
  ]},
  { criterion:'2. Operational Significance', opts:[
    {val:'Essential — safety critical', desc:'Directly affects aircraft safety → NOTAM or AIRAC Amendment'},
    {val:'Significant — operationally relevant', desc:'Affects operations, not immediately safety-critical → AIP Supplement or NOTAM'},
    {val:'Informational — advisory only', desc:'No direct effect on operations → AIC'},
  ]},
  { criterion:'3. Scope', opts:[
    {val:'International', desc:'Affects foreign operators / international routes → NOTAM via ICAO network or AIRAC'},
    {val:'National', desc:'Affects all operators in the state → AIP or AIC'},
    {val:'Regional', desc:'Affects a region or FIR → NOTAM or AIP Supplement'},
    {val:'Local / Aerodrome', desc:'One aerodrome only → ATIS, local NOTAM, or AIP Supplement'},
  ]},
  { criterion:'4. Volume of Information', opts:[
    {val:'Brief (NOTAM-sized)', desc:'Fits in NOTAM text field, no graphics → NOTAM'},
    {val:'Moderate (one–two pages)', desc:'More than NOTAM, manageable as text → AIC or AIP Amendment'},
    {val:'Extensive (multi-page / graphics)', desc:'Requires charts, diagrams, plates → AIP Supplement or AIRAC Amendment'},
  ]},
  { criterion:'5. Duration', opts:[
    {val:'Permanent', desc:'Updates AIP indefinitely → AIP Amendment or AIRAC Amendment'},
    {val:'Long-term (> 3 months)', desc:'Temporary but > 3 months → AIP Supplement'},
    {val:'Short-term (< 3 months)', desc:'Temporary, < 3 months → NOTAM (if significant)'},
    {val:'Temporary (hours / days)', desc:'Very short duration, immediate promulgation → NOTAM only'},
  ]},
];

const PUB_DECISION = [
  {type:'NOTAM',           criteria:'Immediate urgency + brief text + any duration < 3 months',             color:'text-red-400'},
  {type:'AIP Supplement',  criteria:'Non-immediate + long-term (> 3 months) + significant volume / graphics', color:'text-orange-400'},
  {type:'AIRAC Amendment', criteria:'Non-immediate + permanent + nav database update / charting required',   color:'text-amber-400'},
  {type:'AIP Amendment',   criteria:'Permanent change, immediate but no AIRAC coordination required',        color:'text-yellow-400'},
  {type:'AIC',             criteria:'Non-immediate + informational only + no operational impact',            color:'text-green-400'},
];

const AIC_COVER_COLORS = [
  {
    series:'A', color:'White', hex:'#f8fafc', textCls:'text-slate-100', borderCls:'border-white/30', bgCls:'bg-white/10',
    subject:'General / Administrative',
    description:'Administrative notices, general information, non-operational advisories. No direct effect on charts, AIP data, or flight operations.',
    examples:'Regulatory update notices, fee schedule changes, contact directory updates.',
  },
  {
    series:'B', color:'Yellow', hex:'#eab308', textCls:'text-yellow-300', borderCls:'border-yellow-400/50', bgCls:'bg-yellow-500/15',
    subject:'Flight Operations',
    description:'Information relevant to flight crews and operators — fuel conservation, wake turbulence guidance, airspace use notices, operational best practices.',
    examples:'Wake turbulence research updates, bird strike best practices, dangerous goods advisories for operators.',
  },
  {
    series:'C', color:'Mauve / Pink', hex:'#c084fc', textCls:'text-purple-300', borderCls:'border-purple-400/50', bgCls:'bg-purple-500/15',
    subject:'Air Traffic Services',
    description:'Information related to ATC procedures, controller guidance, phraseology updates, ATS system changes that are advisory in nature.',
    examples:'Phraseology guidance changes, contingency ATC procedure advisories, ATS unit contact updates.',
  },
  {
    series:'D', color:'Green', hex:'#22c55e', textCls:'text-green-300', borderCls:'border-green-400/50', bgCls:'bg-green-500/15',
    subject:'Aeronautical Charts',
    description:'Chart-related information: map symbology changes, chart series notifications, cartographic guidance, datum and projection advisories.',
    examples:'New chart series announcement, topographic symbology update, WGS-84 datum advisory.',
  },
  {
    series:'E', color:'Blue', hex:'#3b82f6', textCls:'text-blue-300', borderCls:'border-blue-400/50', bgCls:'bg-blue-500/15',
    subject:'AIS / Information Management',
    description:'AIS-specific guidance: NOTAM system changes, AIM transition advisories, AIRAC cycle schedule, digital NOTAM / SWIM implementation notices.',
    examples:'iNOTAM system launch notice, AIRAC effective date calendar, SWIM connectivity guidance.',
  },
];

const DOCUMENTS = [
  {
    ref:'ICAO Annex 15',
    title:'Aeronautical Information Services',
    edition:'17th Edition',
    color:'text-amber-400',
    description:'The primary standard governing AIS worldwide. Defines the Aeronautical Information Package (AIP, NOTAM, AIRAC, AIC, PIB), the NOTAM format and Q-line structure, AIRAC cycle requirements and effective dates, NOTAM creation, distribution, cancellation and checklists. Also defines AIM (Aeronautical Information Management) as the successor framework to AIS.',
    keyChapters:[
      'Chapter 1 — Definitions (AIP, NOTAM, PIB, AIRAC, AIC)',
      'Chapter 3 — Aeronautical Information Publication (AIP)',
      'Chapter 4 — AIP Supplements and AIP Amendments',
      'Chapter 5 — Aeronautical Information Circulars (AIC)',
      'Chapter 6 — NOTAMs (format, Q-line, distribution)',
      'Chapter 7 — Pre-flight Information Bulletins (PIB)',
      'Chapter 8 — AIRAC System and effective dates',
      'Appendix 6 — NOTAM Format and Q-code table',
    ],
  },
  {
    ref:'ICAO Doc 8126',
    title:'Aeronautical Information Services Manual',
    edition:'7th Edition',
    color:'text-sky-400',
    description:'The detailed procedural manual that implements Annex 15. Contains guidance on how to set up, operate and quality-assure an AIS office. Covers the full lifecycle of NOTAM creation (checking, formatting, coding, Q-line construction), PIB compilation workflows, AIRAC cycle coordination, and AIS staff training requirements. Essential day-to-day reference for AIS officers.',
    keyChapters:[
      'Part I — Organisation and management of AIS',
      'Part II — Aeronautical Information Products (NOTAM creation workflow)',
      'Part III — NOTAM Q-code guidance and examples',
      'Part IV — AIP structure and amendment procedures',
      'Part V — AIRAC cycle coordination',
      'Part VI — PIB compilation and distribution',
      'Appendix — NOTAM coding examples and Q-code tables',
    ],
  },
  {
    ref:'ICAO Doc 10066',
    title:'PANS-AIM — Procedures for Air Navigation Services: Aeronautical Information Management',
    edition:'2nd Edition',
    color:'text-green-400',
    description:'PANS-AIM transitions AIS from static document-based publication to dynamic digital Aeronautical Information Management (AIM). Covers the SWIM (System Wide Information Management) concept, AIXM (Aeronautical Information Exchange Model), iNOTAM (digital NOTAM), and eTOD (Electronic Terrain and Obstacle Data). This is the future direction of AIS globally and is increasingly required by states.',
    keyChapters:[
      'Chapter 2 — Aeronautical data quality requirements (accuracy, resolution, timeliness)',
      'Chapter 3 — Metadata and data origination',
      'Chapter 4 — SWIM and data exchange standards',
      'Chapter 5 — Digital NOTAM (iNOTAM) framework',
      'Chapter 6 — Electronic Terrain and Obstacle Data (eTOD)',
      'Chapter 8 — AIM transition and implementation guidance',
    ],
  },
  {
    ref:'ICAO Doc 4444',
    title:'PANS-ATM — Procedures for Air Navigation Services: Air Traffic Management',
    edition:'16th Edition',
    color:'text-purple-400',
    description:'The ATC procedures bible. Although primarily for ATC, AIS officers must understand Chapters relevant to ATS messages, flight plan processing, and coordination. Defines all ATS message types (FPL, DEP, ARR, DLA, CHG, CNL, CPL, CDN, ACP, EST, alerting phases INCERFA/ALERFA/DETRESFA). Also contains the complete flight plan form (ICAO Doc 4444 Appendix 2).',
    keyChapters:[
      'Chapter 3 — General provisions on ATC',
      'Chapter 11 — ATS messages (FPL, DEP, ARR, DLA, CHG, CNL, CPL, CDN, ACP)',
      'Chapter 15 — Alerting service (INCERFA / ALERFA / DETRESFA)',
      'Appendix 2 — ICAO flight plan form (Items 7–19)',
      'Appendix 3 — ICAO repetitive flight plan',
    ],
  },
  {
    ref:'ICAO Annex 2',
    title:'Rules of the Air',
    edition:'10th Edition',
    color:'text-cyan-400',
    description:'Defines the fundamental rules governing the conduct of all flights (VFR, IFR). AIS officers need Annex 2 for understanding flight plan filing obligations, alternate aerodrome requirements, and the conditions under which a flight plan must be filed. Also defines the right of way rules and signals that appear in the AIP GEN section.',
    keyChapters:[
      'Chapter 3 — General rules (flight plan requirement, altitude / level selection)',
      'Chapter 4 — Visual flight rules',
      'Chapter 5 — Instrument flight rules',
      'Appendix 2 — Flight plan form',
    ],
  },
  {
    ref:'ICAO Annex 3',
    title:'Meteorological Service for International Air Navigation',
    edition:'20th Edition',
    color:'text-blue-400',
    description:'Defines aviation meteorological products — METAR, TAF, SIGMET, AIRMET, VOLMET, and wind/temperature forecasts. AIS officers use Annex 3 for understanding METAR coding (observation standards, cloud reporting, weather phenomena, trend forecasts), SIGMET distribution, and how met information integrates with PIBs and AIS products.',
    keyChapters:[
      'Chapter 4 — METAR and SPECI observations',
      'Chapter 6 — TAF (terminal aerodrome forecast)',
      'Chapter 7 — SIGMET and AIRMET',
      'Chapter 8 — VOLMET broadcasts',
      'Appendix 3 — METAR/SPECI coding format',
      'Appendix 5 — TAF coding format',
    ],
  },
  {
    ref:'ICAO Doc 8168',
    title:'PANS-OPS — Procedures for Air Navigation Services: Aircraft Operations',
    edition:'6th Edition',
    color:'text-pink-400',
    description:'PANS-OPS defines the criteria for designing instrument flight procedures (SIDs, STARs, approaches, holding patterns). AIS officers need to understand PANS-OPS when NOTAMs or AIRAC amendments affect instrument procedures, as procedure changes require specific charting and AIRAC-cycle coordination. Also referenced when PIBs contain approach procedure NOTAMs.',
    keyChapters:[
      'Volume I — Flight procedures (SID, STAR, approach, holding)',
      'Volume II — Construction of visual and instrument flight procedures',
      'Chapter 1 — Criteria for RNAV and RNP procedures',
    ],
  },
  {
    ref:'ICAO Doc 7910',
    title:'Location Indicators',
    edition:'Updated annually',
    color:'text-teal-400',
    description:'The authoritative list of all ICAO 4-letter location indicators (e.g. TBPB = Grantley Adams International, TTPP = Piarco, MKJP = Norman Manley). Used in NOTAM Q-lines, FPL Items 13 and 16, ATS messages, and all AIS products. AIS officers must verify location indicators against this document. Published as a subscription document and updated regularly.',
    keyChapters:[
      'Part 1 — Location indicators by ICAO region',
      'Part 2 — Alphabetical index',
      'Caribbean / NACC region — includes all TBXX, TTXX, MKXX indicators',
    ],
  },
  {
    ref:'ICAO Doc 8585',
    title:'Designators for Aircraft Operating Agencies, Aeronautical Authorities and Services',
    edition:'Updated annually',
    color:'text-rose-400',
    description:'The official list of ICAO airline designators and callsigns (e.g. BAW = British Airways, BWA = Caribbean Airlines). Used in FPL Item 7 (aircraft identification) and in ATS messages to identify the operating agency. AIS officers use this when processing flight plans to verify callsign format and operator identity.',
    keyChapters:[
      'Part 1 — Alphabetical list of ICAO designators',
      'Part 2 — Alphabetical list of telephony designators (callsigns)',
    ],
  },
  {
    ref:'ICAO Doc 9426',
    title:'ATS Planning Manual',
    edition:'1st Edition (with amendments)',
    color:'text-lime-400',
    description:'Provides guidance on planning air traffic services, airspace structure, and AIS co-ordination requirements. Relevant for understanding how FIRs, CTRs, TMAs, and airways are established and how NOTAM and AIP publications support airspace changes. Useful background reading for Caribbean / NACC region airspace planning.',
    keyChapters:[
      'Part I — Airspace organisation (FIR, UIR, CTA, TMA, CTR, AWY)',
      'Part II — ATS route network and point designations',
      'Part V — Co-ordination between ATC, AIS and MET services',
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────────────────
export const GlossaryOverlay: React.FC<GlossaryOverlayProps> = ({ isOpen, onClose }) => {
  const [tab, setTab]         = useState<Tab>('abbrevs');
  const [search, setSearch]   = useState('');
  const [starredTerms, setStarredTerms] = useState<Set<string>>(new Set());
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [callNote, setCallNote] = useState('');

  const acc = useAccordion(['Aviation Abbreviations', 'Subject Codes', 'Items 7–19', 'Item 10a', 'Cloud Coverage', 'Intensity', 'Movement & Control', '1. Urgency', 'Key Documents']);

  // Persist starred terms
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ais-glossary-stars');
      if (stored) setStarredTerms(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  // Persist call log
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ais-shift-call-log');
      if (stored) setCallLog(JSON.parse(stored));
    } catch {}
  }, []);

  const toggleStar = useCallback((term: string) => {
    setStarredTerms(prev => {
      const next = new Set(prev);
      next.has(term) ? next.delete(term) : next.add(term);
      try { localStorage.setItem('ais-glossary-stars', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const addCallNote = () => {
    if (!callNote.trim()) return;
    const entry: CallLogEntry = { id: Date.now().toString(), text: callNote.trim(), timestamp: Date.now() };
    const next = [entry, ...callLog];
    setCallLog(next);
    setCallNote('');
    try { localStorage.setItem('ais-shift-call-log', JSON.stringify(next)); } catch {}
  };

  const deleteCallNote = (id: string) => {
    const next = callLog.filter(e => e.id !== id);
    setCallLog(next);
    try { localStorage.setItem('ais-shift-call-log', JSON.stringify(next)); } catch {}
  };

  const q = search.trim().toLowerCase();

  const filtAbbrevs = useMemo(() =>
    ABBREVS.filter(([c,d]) => !q || c.toLowerCase().includes(q) || d.toLowerCase().includes(q)), [q]);

  const filtCondCodes = useMemo(() =>
    CONDITION_CODES.filter(([c,d]) => !q || c.toLowerCase().includes(q) || d.toLowerCase().includes(q)), [q]);

  const filtFpl = useMemo(() =>
    FPL_ITEMS.filter(i => !q || i.item.includes(q) || i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)), [q]);

  const filtDocs = useMemo(() =>
    DOCUMENTS.filter(d => !q || d.ref.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)), [q]);

  // ── Global search index: a flat view of EVERY module dataset in the glossary ──
  const searchIndex = useMemo(() => {
    const idx: { cat: string; code: string; desc: string }[] = [];
    ABBREVS.forEach(([c, d]) => idx.push({ cat: 'Abbreviation', code: c, desc: d }));
    SUBJECT_CATS.forEach(g => g.codes.forEach(([c, d]) => idx.push({ cat: `Q-Code · ${g.cat}`, code: c, desc: d })));
    CONDITION_CODES.forEach(([c, d]) => idx.push({ cat: 'Q-Code · Condition', code: c, desc: d }));
    PURPOSE_CODES.forEach(([c, s, l]) => idx.push({ cat: 'Q-Code · Purpose', code: c, desc: `${s} — ${l}` }));
    SCOPE_CODES.forEach(([c, s, l]) => idx.push({ cat: 'Q-Code · Scope', code: c, desc: `${s} — ${l}` }));
    TRAFFIC_CODES.forEach(([c, s, l]) => idx.push({ cat: 'Q-Code · Traffic', code: c, desc: `${s} — ${l}` }));
    FPL_ITEMS.forEach(i => idx.push({ cat: 'FPL Item', code: `Item ${i.item}`, desc: `${i.title} — ${i.description}` }));
    ITEM_10A.forEach(i => idx.push({ cat: 'FPL Item 10a — Equipment', code: i.code, desc: i.desc }));
    ITEM_10B.forEach(i => idx.push({ cat: 'FPL Item 10b — Surveillance', code: i.code, desc: i.desc }));
    ITEM_18_ORDER.forEach(i => idx.push({ cat: 'FPL Item 18', code: i.kw, desc: i.eg }));
    CLOUD_COV.forEach(c => idx.push({ cat: 'METAR · Cloud', code: c.code, desc: `${c.oktas} oktas — ${c.meaning}` }));
    WX_DESC.forEach(([c, d]) => idx.push({ cat: 'METAR · Wx descriptor', code: c, desc: d }));
    WX_PHEN.forEach(([c, d]) => idx.push({ cat: 'METAR · Wx phenomenon', code: c, desc: d }));
    ATS_MSGS.forEach(g => g.msgs.forEach(m => idx.push({ cat: `ATS Message · ${g.cat}`, code: m.code, desc: `${m.trigger} — ${m.fields}` })));
    TRANSPONDER_CODES.forEach(t => idx.push({ cat: 'Transponder code', code: t.code, desc: t.meaning }));
    HANDLING_CRITERIA.forEach(g => g.opts.forEach(o => idx.push({ cat: `AIS Handling · ${g.criterion}`, code: o.val, desc: o.desc })));
    PUB_DECISION.forEach(p => idx.push({ cat: 'Publication decision', code: p.type, desc: p.criteria }));
    AIC_COVER_COLORS.forEach(a => idx.push({ cat: `AIC Series ${a.series} (${a.color})`, code: `Series ${a.series}`, desc: `${a.subject} — ${a.description} Examples: ${a.examples}` }));
    DOCUMENTS.forEach(d => idx.push({ cat: 'Key Document', code: d.ref, desc: `${d.title} — ${d.description}` }));
    WTC_CATS.forEach(c => idx.push({ cat: 'Wake Turbulence Category', code: c.code, desc: `${c.label} — ${c.rule} ${c.note}` }));
    ACFT_TYPES.forEach(g => g.items.forEach(t => idx.push({ cat: `Aircraft Type · ${g.group}`, code: t.icao, desc: `${t.name} — WTC ${t.wtc}, MTOW ≈ ${t.mtow}. ${t.role}` })));
    AIRLINES.forEach(g => g.items.forEach(a => idx.push({ cat: `Airline · ${g.group}`, code: a.icao, desc: `${a.name} (callsign “${a.callsign}”) — Fleet: ${a.fleet}. Base: ${a.base}. Livery: ${a.livery}` })));
    NAVAIDS.forEach(n => idx.push({ cat: 'Route Planner · VOR/Navaid', code: n.ident, desc: `${n.name} — ${Math.abs(n.lat).toFixed(3)}°N ${Math.abs(n.lon).toFixed(3)}°W.${n.note ? ' ' + n.note : ''}` }));
    FIXES.forEach(f => idx.push({ cat: 'Route Planner · Reporting fix', code: f.ident, desc: `${Math.abs(f.lat).toFixed(3)}°N ${Math.abs(f.lon).toFixed(3)}°W.${f.note ? ' ' + f.note : ''}` }));
    AIRWAYS.forEach(a => idx.push({ cat: 'Route Planner · Airway', code: a.id, desc: `${a.points.join(' – ')}.${a.note ? ' ' + a.note : ''}` }));
    return idx;
  }, []);

  const searchResults = useMemo(() =>
    !q ? [] : searchIndex.filter(e =>
      e.code.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q) || e.cat.toLowerCase().includes(q)
    ), [q, searchIndex]);

  if (!isOpen) return null;

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <button
      className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
        tab === id ? 'border-sky-400 text-sky-400' : 'border-transparent text-white/40 hover:text-white/70'
      }`}
      style={{ touchAction: 'manipulation' }}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  const Row = ({ code, desc, codeColor = 'text-sky-400', width = 'w-14' }: {
    code: string; desc: string; codeColor?: string; width?: string;
  }) => (
    <div className="flex gap-3 py-1 border-b border-white/5 last:border-0">
      <span className={`shrink-0 ${width} font-mono font-bold text-sm ${codeColor}`}>{code}</span>
      <span className="text-white/70 text-sm leading-relaxed">{desc}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900/98 border border-white/20 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-sky-400">AIS Reference Glossary</h2>
            <p className="text-white/40 text-xs mt-0.5">ICAO Annex 15 · Doc 8126 · PANS-ATM · PANS-AIM</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none px-2" data-testid="glossary-close">×</button>
        </div>

        {/* Search */}
        <div className="shrink-0 px-6 py-3 border-b border-white/10">
          <input
            type="text"
            placeholder="Search codes, terms, descriptions…"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:border-sky-400 outline-none placeholder-white/30 transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {q && <p className="text-white/30 text-xs mt-1.5 pl-1">{searchResults.length} match{searchResults.length === 1 ? '' : 'es'} across the whole glossary</p>}
        </div>

        {/* Tabs (hidden during a global search) */}
        {!q && (
        <div className="shrink-0 flex border-b border-white/10 px-2 overflow-x-auto">
          <TabBtn id="abbrevs"  label="Abbreviations" />
          <TabBtn id="qcodes"   label="NOTAM Q-Codes" />
          <TabBtn id="fplequip" label="FPL & Equipment" />
          <TabBtn id="metar"    label="METAR & Weather" />
          <TabBtn id="ats"      label="ATS Messages" />
          <TabBtn id="handling" label="AIS Handling" />
          <TabBtn id="docs"     label="Documents" />
          <TabBtn id="aip"      label="AIP Contents" />
          <TabBtn id="calllog"    label="Call Log" />
          <TabBtn id="aerodromes" label="Aerodromes & Nav" />
          <TabBtn id="route"      label="Route Planner" />
          <TabBtn id="aircraft"   label="Aircraft & Airlines" />
          <TabBtn id="map"        label="Caribbean Map" />
          <TabBtn id="caribbean"  label="Caribbean Ref" />
          <TabBtn id="locind"     label="Loc. Indicators / AFTN" />
        </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* ── Global search results (across the entire glossary) ── */}
          {q ? (
            <div className="space-y-1">
              {searchResults.length === 0 && (
                <p className="text-white/40 text-sm py-4">No matches for "{search}" anywhere in the glossary.</p>
              )}
              {searchResults.map((e, i) => (
                <div key={`${e.cat}-${e.code}-${i}`} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0 items-start">
                  <span className="shrink-0 w-28 font-mono font-bold text-sm text-sky-400 break-words">{e.code}</span>
                  <span className="flex-1 min-w-0">
                    <span className="text-white/70 text-sm leading-relaxed">{e.desc}</span>
                    <span className="block text-white/30 text-[10px] uppercase tracking-wider mt-0.5">{e.cat}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
          <>

          {/* ── Abbreviations ── */}
          {tab === 'abbrevs' && (
            <>
              {starredTerms.size > 0 && (
                <div className="border border-amber-500/30 bg-amber-900/10 rounded-xl overflow-hidden mb-2">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-amber-900/20">
                    <span className="text-amber-400 text-sm">★</span>
                    <span className="font-bold text-sm text-amber-300">Starred Terms</span>
                    <span className="text-xs text-white/30 bg-white/10 px-2 py-0.5 rounded-full">{starredTerms.size}</span>
                  </div>
                  <div className="px-4 py-3 space-y-0.5">
                    {ABBREVS.filter(([c]) => starredTerms.has(c)).map(([code, def]) => (
                      <div key={code} className="flex gap-3 py-1 border-b border-white/5 last:border-0 items-start">
                        <button style={{touchAction:'manipulation'}} onClick={() => toggleStar(code)} className="shrink-0 text-amber-400 hover:text-amber-300 text-sm mt-0.5">★</button>
                        <span className="shrink-0 w-14 font-mono font-bold text-sm text-sky-400">{code}</span>
                        <span className="text-white/70 text-sm leading-relaxed">{def}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Section id="abbrevs-main" title="Aviation Abbreviations" isOpen={acc.isOpen('Aviation Abbreviations')} onToggle={() => acc.toggle('Aviation Abbreviations')} badge={filtAbbrevs.length}>
                {filtAbbrevs.length === 0 && <p className="text-white/40 text-sm py-2">No results for "{search}"</p>}
                {filtAbbrevs.map(([code, def]) => (
                  <div key={code} className="flex gap-3 py-1 border-b border-white/5 last:border-0 items-start">
                    <button
                      style={{ touchAction: 'manipulation' }}
                      onClick={() => toggleStar(code)}
                      className={`shrink-0 text-sm mt-0.5 transition-colors ${starredTerms.has(code) ? 'text-amber-400 hover:text-amber-300' : 'text-white/15 hover:text-amber-400'}`}
                      title={starredTerms.has(code) ? 'Remove star' : 'Star this term'}
                    >
                      ★
                    </button>
                    <span className="shrink-0 w-14 font-mono font-bold text-sm text-sky-400">{code}</span>
                    <span className="text-white/70 text-sm leading-relaxed">{def}</span>
                  </div>
                ))}
              </Section>
            </>
          )}

          {/* ── NOTAM Q-Codes ── */}
          {tab === 'qcodes' && (
            <>
              <Section id="sc" title="Subject Codes (3rd–4th characters)" isOpen={acc.isOpen('Subject Codes')} onToggle={() => acc.toggle('Subject Codes')}>
                {SUBJECT_CATS.map(cat => {
                  const filtered = cat.codes.filter(([c,d]) => !q || c.toLowerCase().includes(q) || d.toLowerCase().includes(q) || cat.cat.toLowerCase().includes(q));
                  if (!filtered.length) return null;
                  return (
                    <div key={cat.cat} className="mb-4">
                      <div className="text-white/30 text-xs uppercase tracking-widest mb-1.5">{cat.cat}</div>
                      {filtered.map(([code,desc]) => <Row key={code} code={code} desc={desc} codeColor="text-amber-400" width="w-10" />)}
                    </div>
                  );
                })}
              </Section>

              <Section id="cond" title="Condition Codes (5th–6th characters)" isOpen={acc.isOpen('Condition Codes')} onToggle={() => acc.toggle('Condition Codes')}>
                {filtCondCodes.map(([c,d]) => <Row key={c} code={c} desc={d} codeColor="text-green-400" width="w-10" />)}
              </Section>

              <Section id="traffic" title="Traffic Codes" isOpen={acc.isOpen('Traffic Codes')} onToggle={() => acc.toggle('Traffic Codes')}>
                {TRAFFIC_CODES.filter(([c,,d]) => !q || c.toLowerCase().includes(q) || d.toLowerCase().includes(q)).map(([c,s,d]) => (
                  <div key={c} className="flex gap-3 py-1 border-b border-white/5 last:border-0">
                    <span className="shrink-0 w-10 font-mono font-bold text-sm text-purple-400">{c}</span>
                    <div><span className="text-white/90 text-sm font-semibold">{s}</span><span className="text-white/40 text-xs ml-2">{d}</span></div>
                  </div>
                ))}
              </Section>

              <Section id="purpose" title="Purpose Codes" isOpen={acc.isOpen('Purpose Codes')} onToggle={() => acc.toggle('Purpose Codes')}>
                {PURPOSE_CODES.filter(([c,,d]) => !q || c.toLowerCase().includes(q) || d.toLowerCase().includes(q)).map(([c,s,d]) => (
                  <div key={c} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
                    <span className="shrink-0 w-12 font-mono font-bold text-sm text-pink-400">{c}</span>
                    <div><span className="text-white/90 text-sm font-semibold">{s}</span><p className="text-white/40 text-xs mt-0.5">{d}</p></div>
                  </div>
                ))}
              </Section>

              <Section id="scope" title="Scope Codes" isOpen={acc.isOpen('Scope Codes')} onToggle={() => acc.toggle('Scope Codes')}>
                {SCOPE_CODES.filter(([c,,d]) => !q || c.toLowerCase().includes(q) || d.toLowerCase().includes(q)).map(([c,s,d]) => (
                  <div key={c} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
                    <span className="shrink-0 w-12 font-mono font-bold text-sm text-cyan-400">{c}</span>
                    <div><span className="text-white/90 text-sm font-semibold">{s}</span><p className="text-white/40 text-xs mt-0.5">{d}</p></div>
                  </div>
                ))}
              </Section>

              <div className="bg-black/40 border border-white/10 rounded-xl p-4 mt-2">
                <div className="text-white/40 text-xs uppercase tracking-widest mb-2">Q-Line Structure</div>
                <code className="text-sky-300 text-xs font-mono block">{"Q) FIR/Q{subj}{cond}/traffic/purpose/scope/lower/upper/coord"}</code>
                <div className="text-white/30 text-xs mt-2">Example: <code className="text-white/60">Q) TBAD/QNILC/IV/NBO/A/000/999/1304N05930W005</code></div>
                <div className="text-white/30 text-xs mt-1">= TBAD FIR / ILS closed / All traffic / Safety+Preflight+Ops / Aerodrome / FL000-UNL / centred at TBPB within 5NM</div>
              </div>
            </>
          )}

          {/* ── FPL & Equipment ── */}
          {tab === 'fplequip' && (
            <>
              <Section id="fplitems" title="Items 7–19" isOpen={acc.isOpen('Items 7–19')} onToggle={() => acc.toggle('Items 7–19')} badge={filtFpl.length}>
                {filtFpl.length === 0 && <p className="text-white/40 text-sm py-2">No results</p>}
                {filtFpl.map(i => (
                  <div key={i.item} className="border border-white/10 rounded-xl overflow-hidden mb-3">
                    <div className="flex items-center gap-3 bg-sky-500/10 border-b border-white/10 px-4 py-2">
                      <span className="shrink-0 bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-bold px-2 py-0.5 rounded">ITEM {i.item}</span>
                      <span className="text-white font-semibold text-sm">{i.title}</span>
                    </div>
                    <div className="px-4 py-3 space-y-1">
                      <code className="text-amber-300 text-xs block">{i.format}</code>
                      <p className="text-white/60 text-xs leading-relaxed">{i.description}</p>
                    </div>
                  </div>
                ))}
              </Section>

              <Section id="10a" title="Item 10a — COM/NAV Equipment Codes" isOpen={acc.isOpen('Item 10a')} onToggle={() => acc.toggle('Item 10a')}>
                <p className="text-white/30 text-xs mb-3">Enter before the slash. S = Standard (VHF+VOR+ILS). Z = Other (specify in Item 18 NAV/ or COM/).</p>
                {ITEM_10A.filter(i => !q || i.code.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)).map(i => (
                  <Row key={i.code} code={i.code} desc={i.desc} codeColor="text-amber-400" width="w-12" />
                ))}
              </Section>

              <Section id="10b" title="Item 10b — SSR / Transponder Codes" isOpen={acc.isOpen('Item 10b')} onToggle={() => acc.toggle('Item 10b')}>
                <p className="text-white/30 text-xs mb-3">Enter after the slash. Most commercial aircraft use SDE1.</p>
                {ITEM_10B.filter(i => !q || i.code.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)).map(i => (
                  <Row key={i.code} code={i.code} desc={i.desc} codeColor="text-green-400" width="w-12" />
                ))}
              </Section>

              <Section id="i18" title="Item 18 — Keyword Order" isOpen={acc.isOpen('Item 18')} onToggle={() => acc.toggle('Item 18')}>
                <p className="text-white/30 text-xs mb-3">Must appear in this order. Use 0 (zero) if nothing to report.</p>
                {ITEM_18_ORDER.filter(i => !q || i.kw.toLowerCase().includes(q) || i.eg.toLowerCase().includes(q)).map(i => (
                  <div key={i.kw} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
                    <span className="shrink-0 w-14 font-mono text-sky-400 font-bold text-sm">{i.kw}</span>
                    <span className="text-white/40 text-xs self-center font-mono">{i.eg}</span>
                  </div>
                ))}
              </Section>
            </>
          )}

          {/* ── METAR & Weather ── */}
          {tab === 'metar' && (
            <>
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-2">
                <div className="text-white/40 text-xs uppercase tracking-widest mb-2">METAR Format</div>
                <code className="text-sky-300 text-xs font-mono block leading-loose">METAR [COR] ICAO DDHHMM Z [AUTO] wind [vis-range] vis [wx] cloud T/DP QPHPH [RETS] [trend]</code>
                <div className="text-white/30 text-xs mt-2">Example: <code className="text-white/60">METAR TBPB 031200Z 06012KT 9999 FEW018TCU SCT025 28/23 Q1015 NOSIG</code></div>
              </div>

              <Section id="cloud" title="Cloud Coverage — Oktas" isOpen={acc.isOpen('Cloud Coverage')} onToggle={() => acc.toggle('Cloud Coverage')}>
                <p className="text-white/30 text-xs mb-3">Height in 3 digits = hundreds of feet (018 = 1800 ft). Append CB or TCU when present.</p>
                {CLOUD_COV.filter(c => !q || c.code.toLowerCase().includes(q) || c.meaning.toLowerCase().includes(q)).map(c => (
                  <div key={c.code} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
                    <span className="shrink-0 w-14 font-mono font-bold text-sm text-cyan-400">{c.code}</span>
                    <div>
                      <span className="text-white/90 text-sm">{c.meaning}</span>
                      {c.oktas !== '—' && <span className="text-white/30 text-xs ml-2">{c.oktas} oktas</span>}
                    </div>
                  </div>
                ))}
                <div className="mt-3 text-white/30 text-xs border-t border-white/10 pt-2">
                  <span className="text-amber-400">CB</span> — Cumulonimbus (thunderstorm) always reported when present &nbsp;|&nbsp;
                  <span className="text-amber-400">TCU</span> — Towering Cumulus (convective development)
                </div>
              </Section>

              <Section id="wxint" title="Intensity Prefixes" isOpen={acc.isOpen('Intensity')} onToggle={() => acc.toggle('Intensity')}>
                {[
                  {code:'-',   meaning:'Light intensity (e.g. -RA = light rain)'},
                  {code:'(none)',meaning:'Moderate — no prefix'},
                  {code:'+',   meaning:'Heavy intensity (e.g. +TSRA = heavy thunderstorm with rain)'},
                  {code:'VC',  meaning:'In the vicinity — within 8 km but not at station'},
                ].map(i => (
                  <Row key={i.code} code={i.code} desc={i.meaning} codeColor="text-pink-400" width="w-16" />
                ))}
              </Section>

              <Section id="wxdesc" title="Descriptors & Phenomena" isOpen={acc.isOpen('Descriptors')} onToggle={() => acc.toggle('Descriptors')}>
                <div className="grid grid-cols-2 gap-x-6">
                  <div>
                    <div className="text-white/30 text-xs uppercase tracking-widest mb-2">Descriptors</div>
                    {WX_DESC.filter(([c,d]) => !q || c.toLowerCase().includes(q) || d.toLowerCase().includes(q)).map(([c,d]) => (
                      <Row key={c} code={c} desc={d} codeColor="text-amber-400" width="w-8" />
                    ))}
                  </div>
                  <div>
                    <div className="text-white/30 text-xs uppercase tracking-widest mb-2">Phenomena</div>
                    {WX_PHEN.filter(([c,d]) => !q || c.toLowerCase().includes(q) || d.toLowerCase().includes(q)).map(([c,d]) => (
                      <Row key={c} code={c} desc={d} codeColor="text-green-400" width="w-8" />
                    ))}
                  </div>
                </div>
              </Section>

              <Section id="wind" title="Wind Encoding" isOpen={acc.isOpen('Wind')} onToggle={() => acc.toggle('Wind')}>
                {[
                  {ex:'09012KT',    lab:'Standard wind',      note:'From 090° at 12 kt'},
                  {ex:'25025G40KT', lab:'With gusts',         note:'250° at 25 kt, gusting 40 kt'},
                  {ex:'VRB05KT',    lab:'Variable direction',  note:'Direction variable, speed 5 kt'},
                  {ex:'00000KT',    lab:'Calm',                note:'Speed 0 kt'},
                  {ex:'090V180',    lab:'Variable sector',     note:'Direction varying 090°–180°'},
                ].filter(w => !q || w.ex.toLowerCase().includes(q) || w.lab.toLowerCase().includes(q) || w.note.toLowerCase().includes(q)).map(w => (
                  <div key={w.ex} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
                    <code className="shrink-0 w-24 font-mono text-sky-400 text-sm font-bold">{w.ex}</code>
                    <span className="text-white/80 text-sm">{w.lab}</span>
                    <span className="text-white/40 text-xs self-center ml-auto">{w.note}</span>
                  </div>
                ))}
              </Section>

              <Section id="trend" title="Trend / Change Indicators" isOpen={acc.isOpen('Trend')} onToggle={() => acc.toggle('Trend')}>
                {[
                  {code:'NOSIG', meaning:'No significant change expected in the next 2 hours'},
                  {code:'BECMG', meaning:'Changing permanently — reaching new state within 2 hours'},
                  {code:'TEMPO', meaning:'Temporary fluctuations lasting < 1 hour each, < half the period'},
                  {code:'AT',    meaning:'At a specific time (used within BECMG/TEMPO)'},
                  {code:'FM',    meaning:'From a time — conditions change at this time'},
                  {code:'TL',    meaning:'Until a time — change ends at this time'},
                  {code:'RETS',  meaning:'Recent — event occurred since last observation'},
                ].filter(t => !q || t.code.toLowerCase().includes(q) || t.meaning.toLowerCase().includes(q)).map(t => (
                  <Row key={t.code} code={t.code} desc={t.meaning} codeColor="text-purple-400" width="w-16" />
                ))}
              </Section>
            </>
          )}

          {/* ── ATS Messages ── */}
          {tab === 'ats' && (
            <>
              {ATS_MSGS.map(cat => (
                <Section key={cat.cat} id={cat.cat} title={cat.cat} color={cat.color}
                  isOpen={acc.isOpen(cat.cat)} onToggle={() => acc.toggle(cat.cat)}>
                  <div className="space-y-2">
                    {cat.msgs.filter(m => !q || m.code.toLowerCase().includes(q) || m.trigger.toLowerCase().includes(q) || m.fields.toLowerCase().includes(q)).map(m => (
                      <div key={m.code} className="border border-white/10 rounded-xl overflow-hidden">
                        <div className={`flex items-center gap-3 bg-white/5 border-b border-white/10 px-4 py-2`}>
                          <span className={`font-mono font-bold text-sm ${cat.color}`}>{m.code}</span>
                        </div>
                        <div className="px-4 py-3 space-y-1">
                          <div className="text-white/70 text-xs"><span className="text-white/30 uppercase text-xs mr-2">Trigger:</span>{m.trigger}</div>
                          <div className="text-white/50 text-xs"><span className="text-white/30 uppercase text-xs mr-2">Key fields:</span>{m.fields}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ))}

              <Section id="alerting" title="Alerting Phase Progression" color="text-red-400"
                isOpen={acc.isOpen('Alerting Phase')} onToggle={() => acc.toggle('Alerting Phase')}>
                {[
                  {phase:'INCERFA — Uncertainty', trigger:'> 30 min overdue at reporting point, or > 30 min after ETA with no contact', action:'Initiate inquiries, broadcast on guard, notify adjacent units'},
                  {phase:'ALERFA — Alert',        trigger:'Uncertainty unresolved after further 30 min, or inadequate fuel, or distress not yet confirmed', action:'Alert SAR coordination centre, step up communications'},
                  {phase:'DETRESFA — Distress',   trigger:'Fuel exhausted, MAYDAY declared, wreckage sighted, positively in distress', action:'Activate SAR, notify next of kin, open occurrence file'},
                ].map(p => (
                  <div key={p.phase} className="border border-red-500/20 bg-red-900/5 rounded-xl px-4 py-3 mb-2">
                    <div className="text-red-400 font-bold text-sm mb-1">{p.phase}</div>
                    <div className="text-white/60 text-xs"><span className="text-white/30 mr-1">Triggered by:</span>{p.trigger}</div>
                    <div className="text-white/60 text-xs mt-0.5"><span className="text-white/30 mr-1">Action:</span>{p.action}</div>
                  </div>
                ))}
              </Section>

              <Section id="squawks" title="Emergency Transponder Codes" isOpen={acc.isOpen('Emergency')} onToggle={() => acc.toggle('Emergency')}>
                {TRANSPONDER_CODES.map(t => (
                  <div key={t.code} className="flex gap-3 border border-red-400/20 bg-red-900/10 rounded-lg px-4 py-2 mb-1">
                    <span className="font-mono font-bold text-red-400 text-lg w-14">{t.code}</span>
                    <span className="text-white/80 text-sm self-center">{t.meaning}</span>
                  </div>
                ))}
              </Section>
            </>
          )}

          {/* ── AIS Handling ── */}
          {tab === 'handling' && (
            <>
              <div className="bg-sky-900/20 border border-sky-400/20 rounded-xl p-4 mb-3 text-sm text-white/70">
                AIS information handling is assessed against <span className="text-white font-semibold">5 criteria</span> per ICAO Annex 15. The combination determines which publication channel is used.
              </div>
              {HANDLING_CRITERIA.map(c => (
                <Section key={c.criterion} id={c.criterion} title={c.criterion}
                  isOpen={acc.isOpen(c.criterion)} onToggle={() => acc.toggle(c.criterion)}>
                  <div className="space-y-2">
                    {c.opts.filter(o => !q || o.val.toLowerCase().includes(q) || o.desc.toLowerCase().includes(q)).map(o => (
                      <div key={o.val} className="border border-white/10 rounded-lg px-4 py-3">
                        <div className="text-sky-400 text-sm font-semibold mb-0.5">{o.val}</div>
                        <p className="text-white/60 text-xs leading-relaxed">{o.desc}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              ))}
              <Section id="pubdec" title="Publication Decision Summary" isOpen={acc.isOpen('Publication Decision')} onToggle={() => acc.toggle('Publication Decision')}>
                <div className="space-y-2">
                  {PUB_DECISION.filter(p => !q || p.type.toLowerCase().includes(q) || p.criteria.toLowerCase().includes(q)).map(p => (
                    <div key={p.type} className="border border-white/10 rounded-lg px-4 py-3 flex gap-3">
                      <span className={`shrink-0 font-bold text-sm w-36 ${p.color}`}>{p.type}</span>
                      <span className="text-white/60 text-xs leading-relaxed">{p.criteria}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 bg-black/30 border border-amber-400/20 rounded-xl p-3 text-xs text-white/50 leading-relaxed">
                  <span className="text-amber-400 font-bold">Hint: </span>
                  Safety-critical now → NOTAM. Complex / &gt;3 months → Supplement. Permanent nav-database → AIRAC. Advisory only → AIC.
                </div>
              </Section>

              <Section id="aiccol" title="AIC Cover Colors — ICAO Annex 15 Chapter 5"
                isOpen={acc.isOpen('AIC Cover Colors')} onToggle={() => acc.toggle('AIC Cover Colors')}>
                <p className="text-white/40 text-xs mb-3">
                  Aeronautical Information Circulars use colored covers to indicate their subject category at a glance.
                </p>
                <div className="space-y-2">
                  {AIC_COVER_COLORS.filter(c => !q ||
                    c.color.toLowerCase().includes(q) || c.series.toLowerCase().includes(q) ||
                    c.subject.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
                  ).map(c => (
                    <div key={c.series} className={`border rounded-xl overflow-hidden ${c.borderCls}`}>
                      <div className={`flex items-center gap-3 px-4 py-2.5 ${c.bgCls}`}>
                        <div className="w-5 h-5 rounded border border-white/30 shrink-0" style={{ backgroundColor: c.hex }} />
                        <span className={`font-bold text-sm ${c.textCls}`}>{c.color}</span>
                        <span className="text-white/30 text-xs">Series {c.series}</span>
                        <span className={`ml-auto text-xs font-semibold ${c.textCls}`}>{c.subject}</span>
                      </div>
                      <div className="px-4 py-2.5 bg-black/10">
                        <p className="text-white/60 text-xs leading-relaxed mb-1">{c.description}</p>
                        <p className="text-white/30 text-xs"><span className="text-white/20 uppercase tracking-widest text-xs mr-1">e.g. </span>{c.examples}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white/40 leading-relaxed">
                  <span className="text-sky-400 font-bold">Note: </span>
                  Not all states use all five series. Barbados / BCAD typically uses Series A, B and E. The color is shown on the AIC cover page and listed in the AIP GEN section.
                </div>
              </Section>
            </>
          )}

          {/* ── Documents ── */}
          {tab === 'docs' && (
            <>
              <p className="text-white/40 text-xs mb-3">Key ICAO publications every AIS officer must know. Click a document to expand.</p>
              {filtDocs.length === 0 && <p className="text-white/40 text-sm text-center py-8">No results for "{search}"</p>}
              {filtDocs.map(doc => (
                <Section key={doc.ref} id={doc.ref} title={`${doc.ref} — ${doc.title}`} color={doc.color}
                  badge={doc.edition} isOpen={acc.isOpen(doc.ref)} onToggle={() => acc.toggle(doc.ref)}>
                  <p className="text-white/70 text-sm leading-relaxed mb-3">{doc.description}</p>
                  <div>
                    <div className="text-white/30 text-xs uppercase tracking-widest mb-2">Key Chapters / Sections</div>
                    <ul className="space-y-1">
                      {doc.keyChapters.filter(ch => !q || ch.toLowerCase().includes(q)).map(ch => (
                        <li key={ch} className="text-white/60 text-xs flex gap-2">
                          <span className="text-sky-400/50 shrink-0">›</span>
                          {ch}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Section>
              ))}

            </>
          )}

          {/* ── Call Log ── */}
          {tab === 'calllog' && (
            <div className="space-y-3">
              <div className="border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                  <div className="text-sm font-bold text-white/70 mb-0.5">Add Call Note</div>
                  <div className="text-xs text-white/30">Log callback reminders, caller details, or action items</div>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <textarea
                    className="w-full bg-black/30 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:border-sky-400 outline-none placeholder-white/30 resize-none transition-colors"
                    placeholder="e.g. AA Despatch — callback re PIB for AA2210, need routing confirmation…"
                    rows={3}
                    value={callNote}
                    onChange={e => setCallNote(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addCallNote(); }}
                  />
                  <button
                    style={{ touchAction: 'manipulation' }}
                    onClick={addCallNote}
                    disabled={!callNote.trim()}
                    className="w-full bg-sky-600 disabled:opacity-30 hover:bg-sky-500 text-white font-bold py-2 rounded-xl text-sm transition-colors"
                  >
                    + Log Note
                  </button>
                </div>
              </div>

              {callLog.length === 0 && (
                <p className="text-white/25 text-sm text-center py-6">No call notes yet. Log callback reminders here during your shift.</p>
              )}

              {callLog.map(entry => (
                <div key={entry.id} className="border border-white/10 bg-black/20 rounded-xl px-4 py-3 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white/25 text-xs font-mono mb-1">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                  </div>
                  <button
                    style={{ touchAction: 'manipulation' }}
                    onClick={() => deleteCallNote(entry.id)}
                    className="shrink-0 text-white/20 hover:text-red-400 transition-colors text-sm self-start mt-0.5"
                    title="Delete"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {/* ── Aerodromes & Nav ── */}
          {tab === 'aerodromes' && (
            <div className="space-y-2">
              <div className="bg-sky-900/20 border border-sky-400/20 rounded-xl p-3 text-xs text-white/60 mb-3">
                ICAO indicator codes, FIRs, TMAs, VORs, airways and restricted areas. Eastern Caribbean focus with global reference airports.
              </div>

              {/* Eastern Caribbean Aerodromes */}
              <Section id="ec-ad" title="Eastern Caribbean Aerodromes" color="text-sky-300"
                isOpen={acc.isOpen('ec-ad')} onToggle={() => acc.toggle('ec-ad')}>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead><tr className="text-white/30 uppercase tracking-widest border-b border-white/10">
                      <th className="text-left py-1.5 pr-3 font-normal">ICAO</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Name</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Country</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Elev</th>
                      <th className="text-left py-1.5 pr-3 font-normal">RWY</th>
                      <th className="text-left py-1.5 font-normal">FIR</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        ['TBPB',"Grantley Adams Int'l",'Barbados','169ft','09/27','TTZP'],
                        ['TTPP',"Piarco Int'l",'Trinidad','58ft','10/28','TTZP'],
                        ['TTCP','Crown Point','Tobago','38ft','10/28','TTZP'],
                        ['TGPY',"Maurice Bishop Int'l",'Grenada','41ft','10/28','TTZP'],
                        ['TLPL',"Hewanorra Int'l",'St Lucia','14ft','10/28','TTZP'],
                        ['TLPC','George F.L. Charles','St Lucia','22ft','10/28','TTZP'],
                        ['TVSA',"Argyle Int'l",'St Vincent','74ft','09/27','TTZP'],
                        ['TVSM','J.F. Mitchell (Mustique)','St Vincent','11ft','08/26','TTZP'],
                        ['TVSC','Canouan Airport','St Vincent','11ft','16/34','TTZP'],
                        ['TAPA',"V.C. Bird Int'l",'Antigua','62ft','07/25','TTZP'],
                        ['TKPK',"Robert L. Bradshaw Int'l",'St Kitts','170ft','07/25','TTZP'],
                        ['TNCM',"Princess Juliana Int'l",'Sint Maarten','13ft','09/27','TTZP'],
                        ['TQPF',"Clayton J. Lloyd Int'l",'Anguilla','127ft','10/28','TTZP'],
                        ['TUPJ','Terrance B Lettsome','BVI','15ft','07/25','TJZS'],
                        ['TNCC',"Hato Int'l",'Curaçao','29ft','11/29','TTZP'],
                        ['TNCO','Flamingo','Bonaire','20ft','10/28','TTZP'],
                        ['TNCB','Juancho E. Yrausquin','Saba','60ft','12','TTZP'],
                        ['TNCS','F.D. Roosevelt','St Eustatius','79ft','09/27','TTZP'],
                      ].map(([icao,name,country,elev,rwy,fir]) => (
                        <tr key={icao} className="hover:bg-white/3 transition-colors">
                          <td className="py-1.5 pr-3 font-mono font-bold text-sky-400">{icao}</td>
                          <td className="py-1.5 pr-3 text-white/70">{name}</td>
                          <td className="py-1.5 pr-3 text-white/40">{country}</td>
                          <td className="py-1.5 pr-3 text-white/40 font-mono">{elev}</td>
                          <td className="py-1.5 pr-3 text-white/40 font-mono">{rwy}</td>
                          <td className="py-1.5 text-amber-400/70 font-mono text-[10px]">{fir}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Wider Caribbean & North/South America */}
              <Section id="wider-ad" title="Caribbean, Americas & Reference Airports" color="text-amber-300"
                isOpen={acc.isOpen('wider-ad')} onToggle={() => acc.toggle('wider-ad')}>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead><tr className="text-white/30 uppercase tracking-widest border-b border-white/10">
                      <th className="text-left py-1.5 pr-3 font-normal">ICAO</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Name</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Country</th>
                      <th className="text-left py-1.5 font-normal">FIR</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        ['TJSJ',"Luis Muñoz Marín Int'l",'Puerto Rico (USA)','TJZS'],
                        ['MDSD',"Las Americas Int'l",'Dominican Republic','MDCS'],
                        ['MKJP',"Norman Manley Int'l",'Jamaica','MKZS'],
                        ['MYNN',"Lynden Pindling Int'l",'Bahamas','MYNA'],
                        ['KMIA',"Miami Int'l",'USA (Florida)','KZMA'],
                        ['KJFK',"John F Kennedy Int'l",'USA (New York)','KZNY'],
                        ['KMCO',"Orlando Int'l",'USA (Florida)','KZJX'],
                        ['SVMI',"Simón Bolívar Int'l",'Venezuela','SVZM'],
                        ['SKBO',"El Dorado Int'l",'Colombia','SKEC'],
                        ['SEQM',"Mariscal Sucre Int'l",'Ecuador','SEFG'],
                        ['SBGR',"Guarulhos Int'l",'Brazil (São Paulo)','SBBS'],
                        ['SCEL',"Arturo Merino Benítez",'Chile','SCCI'],
                        ['SAEZ',"Ministro Pistarini",'Argentina (Buenos Aires)','SARE'],
                        ['EGLL',"Heathrow",'United Kingdom','EGTT'],
                        ['LFPG',"Charles de Gaulle",'France','LFBB/LFEE'],
                        ['EDDF',"Frankfurt",'Germany','EDGG'],
                        ['LIRF',"Fiumicino (Rome)",'Italy','LIRR'],
                        ['LEMD',"Adolfo Suárez Madrid-Barajas",'Spain','LECM'],
                        ['GCTS',"Tenerife South",'Spain (Canaries)','GCCC'],
                      ].map(([icao,name,country,fir]) => (
                        <tr key={icao} className="hover:bg-white/3 transition-colors">
                          <td className="py-1.5 pr-3 font-mono font-bold text-amber-400">{icao}</td>
                          <td className="py-1.5 pr-3 text-white/70">{name}</td>
                          <td className="py-1.5 pr-3 text-white/40">{country}</td>
                          <td className="py-1.5 text-white/30 font-mono text-[10px]">{fir}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* FIRs */}
              <Section id="firs" title="Flight Information Regions (FIRs)" color="text-blue-300"
                isOpen={acc.isOpen('firs')} onToggle={() => acc.toggle('firs')}>
                <div className="space-y-2">
                  {[
                    { id:'TTZP', name:'Piarco FIR',             auth:'T&T CAA',    area:'Per Module 5 AIS Trainee Manual: "The airspace of Barbados and all the States and Territories of the Eastern Caribbean Islands form part of Piarco FIR." Encompasses Trinidad, Tobago and the Eastern Caribbean island chain. Lower airspace SFC–FL245; upper airspace FL245 and above.', upper:'UNL' },
                    { id:'TBAD', name:'Adams CTA / Barbados ACC area', auth:'BCAD', area:'TBAD = Barbados location prefix (ICAO Doc 7910). Used in NOTAM Q-lines for Barbados-administered airspace (Adams CTR, Adams TMA, Adams ATZ). The Adams CTA lies within the broader Piarco FIR. BCAD: Barbados Civil Aviation Department.', upper:'FL245' },
                    { id:'TJZS', name:'San Juan Oceanic FIR',   auth:'FAA',        area:'Puerto Rico, USVI, BVI and surrounding oceanic area east of 65W.',                                           upper:'UNL' },
                    { id:'KZMA', name:'Miami Oceanic FIR',      auth:'FAA',        area:'Bahamas, western Caribbean, Gulf of Mexico oceanic.',                                                         upper:'UNL' },
                    { id:'MKZS', name:'Kingston FIR',           auth:'JACAA',      area:'Jamaica and surrounding airspace.',                                                                           upper:'UNL' },
                    { id:'MDCS', name:'Santo Domingo FIR',      auth:'IDAC',       area:'Dominican Republic and Haiti (Hispaniola).',                                                                  upper:'UNL' },
                    { id:'SVZM', name:'Maiquetía FIR',          auth:'INAC',       area:'Venezuela — south of Eastern Caribbean area.',                                                               upper:'UNL' },
                    { id:'EGTT', name:'London FIR/UIR',         auth:'NATS',       area:'United Kingdom and north Atlantic to 30W.',                                                                  upper:'UNL' },
                    { id:'KZNY', name:'New York FIR/Oceanic',   auth:'FAA',        area:'Northeast USA + North Atlantic.',                                                                            upper:'UNL' },
                    { id:'SBBS', name:'Brasília FIR',           auth:'DECEA',      area:'Central & eastern Brazil.',                                                                                  upper:'UNL' },
                  ].map(f => (
                    <div key={f.id} className="border border-white/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono font-bold text-blue-300">{f.id}</span>
                        <span className="text-white/70 text-sm">{f.name}</span>
                        <span className="text-white/30 text-xs ml-auto">Auth: {f.auth}</span>
                      </div>
                      <p className="text-white/40 text-xs leading-relaxed">{f.area}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* TMAs & CTRs */}
              <Section id="tmas" title="TMAs, CTRs & Special Airspace — Eastern Caribbean" color="text-green-300"
                isOpen={acc.isOpen('tmas')} onToggle={() => acc.toggle('tmas')}>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead><tr className="text-white/30 uppercase tracking-widest border-b border-white/10">
                      <th className="text-left py-1.5 pr-3 font-normal">Area</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Type</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Class</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Vertical Limits</th>
                      <th className="text-left py-1.5 font-normal">Centre / Notes</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        ['Adams ATZ','ATZ','D','SFC – 2000ft AMSL','5NM radius centred on ARP 13°04\'29"N 059°29\'32"W. Established at Grantley Adams when density of VFR traffic requires it.'],
                        ['Adams CTR','CTR','D','SFC – 3000ft AMSL','25NM radius circle centred on Adams VOR BGI (13°04\'30"N 059°29\'02"W). Class D. Adams Tower 118.700 MHz; Ground 121.200 MHz.'],
                        ['Adams TMA','TMA','A / D','3000ft MSL – FL245','Class A above FL85; Class D FL85–3000ft. Complex polygon: 25NM arc on BNE VOR (13°44\'00"N 060°58\'37"W) + straight lines + 68NM arc on BGI VOR. Adams APP 129.350 MHz.'],
                        ['Piarco CTR','CTR','D','SFC – 2500ft','TTPP — Piarco, Trinidad'],
                        ['Piarco TMA','TMA','C','2500ft – FL245','Covers Trinidad & Tobago approach area. Lower airspace: up to FL245; upper airspace: FL245+.'],
                        ['San Juan CTR','CTR','B','SFC – 2500ft','TJSJ (18°26N 065°60W)'],
                        ['Norman Manley CTR','CTR','D','SFC – 4500ft','MKJP (17°56N 076°47W)'],
                        ['V.C. Bird CTR','CTR','D','SFC – 3000ft','TAPA (17°08N 061°48W)'],
                        ['Grenada CTR','CTR','D','SFC – 3000ft','TGPY (12°00N 061°47W)'],
                        ['Hewanorra CTR','CTR','D','SFC – 3000ft','TLPL (13°44N 060°57W)'],
                      ].map(([area,type,cls,vl,notes]) => (
                        <tr key={area} className="hover:bg-white/3 transition-colors">
                          <td className="py-1.5 pr-3 text-green-300 font-semibold">{area}</td>
                          <td className="py-1.5 pr-3 text-white/60 font-mono">{type}</td>
                          <td className="py-1.5 pr-3 text-amber-400/80 font-mono font-bold">{cls}</td>
                          <td className="py-1.5 pr-3 text-white/40 font-mono text-[10px]">{vl}</td>
                          <td className="py-1.5 text-white/30 text-[10px]">{notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* VORs */}
              <Section id="vors" title="VOR / VOR-DME Navaids — Caribbean" color="text-purple-300"
                isOpen={acc.isOpen('vors')} onToggle={() => acc.toggle('vors')}>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead><tr className="text-white/30 uppercase tracking-widest border-b border-white/10">
                      <th className="text-left py-1.5 pr-3 font-normal">ID</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Name</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Freq</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Location</th>
                      <th className="text-left py-1.5 font-normal">Notes</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        ['BGI','Adams (Grantley Adams)','—','TBPB, Barbados','Centre of Adams CTR (25NM radius) and Adams TMA (68NM arc). 13°04\'30"N 059°29\'02"W. Correct identifier is BGI not GDS.'],
                        ['PTR','Piarco','—','TTPP, Trinidad','Main Piarco FIR centre navaid'],
                        ['GRN','Grenada','—','TGPY, Grenada',''],
                        ['SLU','Saint Lucia / BNE','—','TLPL, St Lucia','BNE VOR at 13°44\'00"N 060°58\'37"W — centre of 25NM arc defining Adams TMA western limit'],
                        ['SVD','St Vincent','—','TVSA, St Vincent','DVOR'],
                        ['ANU','Antigua','—','TAPA, Antigua',''],
                        ['SKB','St Kitts','—','TKPK, St Kitts','DVOR-DME'],
                        ['SXM','Sint Maarten','—','TNCM, Sint Maarten',''],
                        ['PJA','Punta Juana','—','Curaçao',''],
                        ['SJU','San Juan','—','TJSJ, Puerto Rico','Co-located DME'],
                        ['GNS','Kingston','—','MKJP, Jamaica',''],
                        ['NAS','Nassau','—','MYNN, Bahamas','DVOR'],
                        ['MIA','Miami','115.9','KMIA, USA','High-altitude VOR-DME'],
                        ['CRC','Caracas','—','SVMI, Venezuela',''],
                      ].map(([id,name,freq,loc,notes]) => (
                        <tr key={id} className="hover:bg-white/3">
                          <td className="py-1.5 pr-3 font-mono font-bold text-purple-300">{id}</td>
                          <td className="py-1.5 pr-3 text-white/70">{name}</td>
                          <td className="py-1.5 pr-3 text-white/40 font-mono">{freq}</td>
                          <td className="py-1.5 pr-3 text-white/40 text-[10px]">{loc}</td>
                          <td className="py-1.5 text-white/25 text-[10px]">{notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Waypoints */}
              <Section id="waypoints" title="Reporting Fixes — Grantley Adams TMA" color="text-teal-300"
                isOpen={acc.isOpen('waypoints')} onToggle={() => acc.toggle('waypoints')}>
                <div className="bg-teal-900/15 border border-teal-500/20 rounded-xl p-3 mb-3 text-xs text-white/60">
                  Compulsory reporting fixes on the ATS routes radiating from <span className="font-mono text-teal-300">Adams VOR (BGI 112.7)</span>, per Barbados AIP Area Chart <span className="font-mono">AD 2-20</span>. Radial = outbound BGI radial (°M); DME = distance from BGI. All routes lie within the Adams TMA at 3000′.
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead><tr className="text-white/30 uppercase tracking-widest border-b border-white/10">
                      <th className="text-left py-1.5 pr-3 font-normal">Fix</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Coordinates</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Route</th>
                      <th className="text-left py-1.5 pr-3 font-normal">Radial / DME</th>
                      <th className="text-left py-1.5 font-normal">Leads to</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        ['BIRNO','14°21\'06"N 060°12\'38"W','A632','346° / 88','NW to Martinique (FOF) / Antigua (ANU VOR)'],
                        ['BORUS','14°02\'46"N 060°27\'59"W','A555','330° / 82','NW to Martinique — Fort de France (FOF)'],
                        ['TEDDY','13°44\'02"N 060°32\'56"W','G642','317° / 74','W to St Lucia — Hewanorra (BNE VOR)'],
                        ['TIBOT','13°33\'45"N 060°35\'11"W','R750','309° / 71','W to St Lucia / St Vincent'],
                        ['DAMOV','13°28\'58"N 060°38\'04"W','—','—','Reporting fix near the Piarco FIR boundary'],
                        ['GOTER','13°07\'42"N 060°52\'40"W','A511 / A312','287° / 82','W to St Vincent — Argyle (SV VOR)'],
                        ['AMULA','12°49\'49"N 060°41\'28"W','R893','273° / 72','SW to Canouan (CAI)'],
                        ['RAKAN','12°35\'12"N 060°32\'20"W','A561','260° / 68','SW to Grenada — Maurice Bishop (GND VOR)'],
                        ['LOGAN','12°08\'18"N 060°08\'34"W','R515','230° / 68','SW onward to TABEX / DALGA'],
                        ['ERROL','11°57\'21"N 059°16\'18"W','A632','184° / 68','S to Trinidad (Piarco) — onward EGEMA'],
                        ['KELSO','12°13\'02"N 058°43\'18"W','A555','154° / 68','SE to CYR VOR (oceanic)'],
                      ].map(([name,coord,route,trk,leads]) => (
                        <tr key={name} className="hover:bg-white/3">
                          <td className="py-1.5 pr-3 font-mono font-bold text-teal-300">{name}</td>
                          <td className="py-1.5 pr-3 text-white/40 font-mono text-[10px]">{coord}</td>
                          <td className="py-1.5 pr-3 font-mono font-bold text-orange-300 text-[11px]">{route}</td>
                          <td className="py-1.5 pr-3 text-white/50 font-mono text-[10px]">{trk}</td>
                          <td className="py-1.5 text-white/50 text-[10px]">{leads}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-white/25 text-[10px] mt-2">Source: Barbados AIP Area Chart AD 2-20 (Grantley Adams Int'l TMA). For training use only — verify against current AIP before operational use.</p>
              </Section>

              {/* Airways */}
              <Section id="airways" title="ATS Routes — Grantley Adams TMA" color="text-orange-300"
                isOpen={acc.isOpen('airways')} onToggle={() => acc.toggle('airways')}>
                <div className="space-y-2">
                  <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 mb-3 text-xs text-white/60">
                    <strong className="text-blue-300">Adams TMA route structure (AIP AD 2-20):</strong> All routes below radiate from <span className="font-mono text-orange-300">Adams VOR (BGI 112.7)</span> at <span className="font-mono">3000′</span> within the TMA. TMA vertical limits: 3000′–FL85 (Class D), FL85–FL245 (Class A). Per Module 5, upper airways (FL245+) carry the <span className="font-mono text-orange-300">U</span> prefix; VFR is not permitted above FL085 in Barbados airspace.
                  </div>
                  {[
                    { id:'A632', level:'3000′ (TMA)', dir:'BIRNO ↔ BGI ↔ ERROL', desc:'BIRNO (346°/88 DME) NW toward Martinique/Antigua, and ERROL (184°/68 DME) S toward Trinidad (Piarco) onward EGEMA.' },
                    { id:'A555', level:'3000′ (TMA)', dir:'BORUS ↔ BGI ↔ KELSO', desc:'BORUS (330°/82 DME) NW to Fort de France (FOF), and KELSO (154°/68 DME) SE to CYR VOR (oceanic).' },
                    { id:'G642', level:'3000′ (TMA)', dir:'TEDDY → BGI', desc:'TEDDY (317°/74 DME) — W to St Lucia, Hewanorra (BNE VOR).' },
                    { id:'R750', level:'3000′ (TMA)', dir:'TIBOT → BGI', desc:'TIBOT (309°/71 DME) — W toward St Lucia / St Vincent.' },
                    { id:'A511', level:'3000′ (TMA)', dir:'GOTER → BGI', desc:'GOTER (287°/82 DME) — W to St Vincent, Argyle (SV VOR).' },
                    { id:'A312', level:'FL30 (≈3000′)', dir:'GOTER → BGI', desc:'Route paralleling A511 via GOTER (85 DME) toward St Vincent.' },
                    { id:'R893', level:'3000′ (TMA)', dir:'AMULA → BGI', desc:'AMULA (273°/72 DME) — SW toward Canouan (CAI).' },
                    { id:'A561', level:'3000′ (TMA)', dir:'RAKAN → BGI', desc:'RAKAN (260°/68 DME) — SW to Grenada, Maurice Bishop (GND VOR).' },
                    { id:'R515', level:'3000′ (TMA)', dir:'LOGAN → BGI', desc:'LOGAN (230°/68 DME) — SW onward to TABEX / DALGA.' },
                  ].map(r => (
                    <div key={r.id} className="border border-white/10 rounded-xl px-4 py-3 flex gap-3">
                      <div className="shrink-0">
                        <span className="font-mono font-bold text-orange-300 text-sm">{r.id}</span>
                        <div className="text-[10px] text-white/25 mt-0.5">{r.level} · {r.dir}</div>
                      </div>
                      <p className="text-white/50 text-xs leading-relaxed">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Restricted Areas */}
              <Section id="restricted" title="Restricted, Danger & Prohibited Areas — Caribbean" color="text-red-300"
                isOpen={acc.isOpen('restricted')} onToggle={() => acc.toggle('restricted')}>
                <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-3 mb-3 text-xs text-white/50">
                  Airspace with conditions on entry. Classes: Prohibited (no entry), Restricted (entry requires permission), Danger (hazardous activity possible).
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead><tr className="text-white/30 uppercase tracking-widest border-b border-white/10">
                      <th className="text-left py-1.5 pr-2 font-normal">Desig.</th>
                      <th className="text-left py-1.5 pr-2 font-normal">Type</th>
                      <th className="text-left py-1.5 pr-2 font-normal">Vertical</th>
                      <th className="text-left py-1.5 pr-2 font-normal">Centre / Location</th>
                      <th className="text-left py-1.5 font-normal">Activity</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        ['EBB 1','R','SFC–4000ft','East coast Barbados (~13°07N 059°27W)','Military / firearms range'],
                        ['EBB 2','D','2500–5500ft','North-east Barbados shelf','Gunnery exercises'],
                        ['EBB 3','R','SFC–500ft','South Barbados coastline','Naval vessel operations'],
                        ['ETR 1','R','SFC–8000ft','Trinidad NW peninsula','Military restricted — T&T Defence Force'],
                        ['ETR 2','D','1000–12000ft','Trinidad east coast','Aerial gunnery/bombing range'],
                        ['PRD 40','P','SFC–UNL','La Carlota, Venezuela','Presidential palace Caracas'],
                        ['PR 30','R','SFC–3000ft','San Juan metro area','Temporary presidential operations (as notified)'],
                        ['MYMM 1','D','SFC–5000ft','Nassau Bahamas east','Small arms range'],
                        ['P-73','P','SFC–FL180','Washington DC airspace','SFRA — US prohibited zone'],
                        ['R-2915','R','SFC–FL550','Cape Canaveral Florida','Space launch hazard area — temporary by NOTAM'],
                        ['JTFA','R','Varies','Jamaica Training Area','Live firing — activated by NOTAM'],
                        ['VENZUE','R','FL290–FL600','North Venezuela FIR boundary','RVSM/military coordination zone'],
                      ].map(([desig,type,vl,loc,act]) => (
                        <tr key={desig} className="hover:bg-white/3">
                          <td className="py-1.5 pr-2 font-mono font-bold text-red-300">{desig}</td>
                          <td className="py-1.5 pr-2">
                            <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                              type === 'P' ? 'bg-red-900/50 text-red-300' :
                              type === 'R' ? 'bg-amber-900/50 text-amber-300' :
                              'bg-orange-900/50 text-orange-300'
                            }`}>{type === 'P' ? 'PROHIB' : type === 'R' ? 'RESTR' : 'DANGER'}</span>
                          </td>
                          <td className="py-1.5 pr-2 text-white/30 font-mono text-[10px]">{vl}</td>
                          <td className="py-1.5 pr-2 text-white/40 text-[10px]">{loc}</td>
                          <td className="py-1.5 text-white/30 text-[10px]">{act}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-white/20 text-[10px] mt-2">* Designators and coordinates illustrative. Always check current AIP ENR 5.1/5.2/5.3 and active NOTAMs for operational status.</p>
              </Section>
            </div>
          )}

          {/* ── AIP Contents & specs ── */}
          {tab === 'aip' && <AipTab />}

          {/* ── Route Planner & Mapper ── */}
          {tab === 'route' && <RouteTab />}

          {/* ── Aircraft & Airlines ── */}
          {tab === 'aircraft' && <AircraftTab />}

          {/* ── Caribbean Map ── */}
          {tab === 'map' && <MapTab />}

          {/* ── Location Indicators / AFTN ── */}
          {tab === 'locind' && <LocIndTab />}

          </>
          )}
        </div>
      </div>
    </div>
  );
};

