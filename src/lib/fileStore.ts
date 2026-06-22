import { ROUTING_FOLDERS } from './taskGenerator';
import { UTC_OFFSET_MINUTES, wrapMinutes, zulu } from './shifts';
import { RETRIEVAL_REFS, SHIFT_DOF } from './storeRefs';

export { RETRIEVAL_REFS, SHIFT_DOF } from './storeRefs';

// ── Shift file store ─────────────────────────────────────────────────────────
// A running per-shift message/file store, organised by AFTN addressee folder
// (the same addressee directory the FPL routing game uses, ROUTING_FOLDERS).
// Each message records its kind, callsign, the folder it lives in, the time it
// was sent (Zulu), the flight date (DOF) and its acknowledged / processed state.
// The store is seeded at the start of every shift and grows as the officer files
// and processes work during the shift.

export type MessageKind = 'FPL' | 'CNL' | 'DEP' | 'ARR' | 'CHG' | 'NOTAM';

/** How a foreign-originated message relates to Barbados / the Piarco FIR. */
export type TrafficKind = 'inbound' | 'overflight';

export interface StoreMessage {
  id: string;
  kind: MessageKind;
  /** Aircraft callsign / registration, or for NOTAMs the NOTAM series number. */
  callsign: string;
  /**
   * Primary addressee folder id this message is filed under. Kept for backward
   * compatibility and as the "home"/originating-office reference; the full set of
   * folders the message appears in is `folderIds` (which always includes this).
   */
  folderId: string;
  /**
   * All addressee folders this message is filed under. A single message can
   * belong to more than one folder (e.g. our TBPB folder AND the originating
   * country's folder). Falls back to `[folderId]` when omitted.
   */
  folderIds?: string[];
  /** 8-letter AFTN addressee the message was sent to. */
  addressee: string;
  /** Time the message was sent / received, as a Zulu (UTC) HHMMZ string. */
  timeSent: string;
  /** UTC minutes-from-midnight for the time sent (used for sorting). */
  timeSentMin: number;
  /** Date of flight (DOF), YYMMDD. */
  flightDate: string;
  dep?: string;
  dest?: string;
  /** One-line human summary of the message. */
  detail: string;
  /** Acknowledged by the officer (un-acked shows bold). */
  acked: boolean;
  /** Already processed (vs still needing processing). */
  processed: boolean;

  // ── Foreign inbound / overflight handling ──────────────────────────────────
  /** Set on foreign-originated messages: inbound arrival vs Piarco FIR overflight. */
  traffic?: TrafficKind;
  /** True when the message was originated by another country's AIS/ATS office. */
  foreign?: boolean;
  /** ATC unit this message should be forwarded/relayed to (when foreign). */
  atcUnit?: string;
  /** Whether the officer has forwarded/relayed it on to the ATC unit. */
  forwarded?: boolean;

  // ── Optional structured fields for ICAO bracketed free-text rendering ───────
  flightRules?: string;   // field 8 rules: I / V / Y / Z
  flightType?: string;    // field 8 type of flight: S / N / G / M / X
  acType?: string;        // field 9 aircraft type, e.g. B738
  wake?: string;          // field 9 wake category: L / M / H / J
  equipment?: string;     // field 10 equipment/surveillance
  eobt?: string;          // field 13 EOBT, HHMM
  speedLevel?: string;    // field 15a cruising speed + level, e.g. N0250F250
  route?: string;         // field 15c route, e.g. DCT or airway string
  eet?: string;           // field 16 total EET, HHMM
  altn?: string;          // field 16 alternate aerodrome
  offTime?: string;       // DEP airborne time, HHMM
  arrTime?: string;       // ARR landing time, HHMM
  chgField?: string;      // CHG field 22 amendment text, e.g. 16/TLPC
  notamQ?: string;        // NOTAM Q) line
  notamB?: string;        // NOTAM B) start
  notamC?: string;        // NOTAM C) end
  notamE?: string;        // NOTAM E) text
}

export const MESSAGE_KIND_META: Record<MessageKind, { label: string; color: string }> = {
  FPL:   { label: 'FPL',   color: 'text-sky-300 border-sky-400/50 bg-sky-900/30' },
  CNL:   { label: 'CNL',   color: 'text-orange-300 border-orange-400/50 bg-orange-900/30' },
  DEP:   { label: 'DEP',   color: 'text-emerald-300 border-emerald-400/50 bg-emerald-900/30' },
  ARR:   { label: 'ARR',   color: 'text-green-300 border-green-400/50 bg-green-900/30' },
  CHG:   { label: 'CHG',   color: 'text-amber-300 border-amber-400/50 bg-amber-900/30' },
  NOTAM: { label: 'NOTAM', color: 'text-red-300 border-red-400/50 bg-red-900/30' },
};

/** Map an 8-letter AFTN addressee to the ROUTING_FOLDERS id it belongs to. */
export function folderForAddressee(addressee: string): string {
  const exact = ROUTING_FOLDERS.find(f => f.aftn === addressee);
  if (exact) return exact.id;
  const prefix = addressee.slice(0, 4);
  const byPrefix = ROUTING_FOLDERS.find(f => f.id === prefix);
  return byPrefix ? byPrefix.id : prefix;
}

export interface FolderMeta { id: string; country: string; unit: string; aftn: string; }

// Originating-office folders for FOREIGN-originated inbound / overflight traffic.
// These are kept separate from ROUTING_FOLDERS (the FPL routing game's address
// book) so adding them never changes that game — they only widen the file store's
// folder directory so a foreign message can also be filed under its origin folder.
export const FOREIGN_ORIGIN_FOLDERS: FolderMeta[] = [
  { id: 'TJZS', country: 'Puerto Rico (San Juan)', unit: 'San Juan CERAP / ACC', aftn: 'TJZSZQZX' },
  { id: 'TFFF', country: 'Martinique', unit: 'Fort-de-France ARO', aftn: 'TFFFZQZX' },
  { id: 'TNCC', country: 'Curaçao', unit: 'Hato ARO', aftn: 'TNCCZQZX' },
];

/** Full, ordered folder directory for the file store: routing folders + foreign origins. */
export const STORE_FOLDERS: FolderMeta[] = [...ROUTING_FOLDERS, ...FOREIGN_ORIGIN_FOLDERS];

/** Look up folder metadata by id, falling back to a generic entry for unknown ids. */
export function folderMeta(id: string): FolderMeta {
  return STORE_FOLDERS.find(f => f.id === id) ?? { id, country: id, unit: '', aftn: id };
}

/** All folders a message is filed under (honours `folderIds`, falls back to `folderId`). */
export function messageFolders(m: StoreMessage): string[] {
  return m.folderIds && m.folderIds.length > 0 ? m.folderIds : [m.folderId];
}

let seedCounter = 0;
function seedId(): string {
  seedCounter += 1;
  return `seed-${seedCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Convert a Zulu HHMM number string to UTC minutes-from-midnight. */
function zMinutes(hhmm: string): number {
  const h = parseInt(hhmm.slice(0, 2), 10);
  const m = parseInt(hhmm.slice(2, 4), 10);
  return wrapMinutes(h * 60 + m);
}

type SeedSpec = Omit<StoreMessage, 'id' | 'timeSent' | 'timeSentMin' | 'flightDate' | 'acked' | 'processed'> & {
  /** Zulu HHMM (no Z). */
  z: string;
  flightDate?: string;
  acked?: boolean;
  processed?: boolean;
};

function build(spec: SeedSpec): StoreMessage {
  const { z, flightDate, acked, processed, ...rest } = spec;
  const min = zMinutes(z);
  return {
    ...rest,
    id: seedId(),
    timeSent: `${z}Z`,
    timeSentMin: min,
    flightDate: flightDate ?? SHIFT_DOF,
    acked: acked ?? false,
    processed: processed ?? false,
  };
}

// Standing entries seeded into EVERY shift. The retrieval scenarios depend on the
// first three being present, so they must always be seeded.
function commonSeed(): SeedSpec[] {
  const r = RETRIEVAL_REFS;
  const fi = r.foreignInbound;
  const ov = r.overflight;
  return [
    {
      kind: 'FPL', callsign: r.inboundFpl.callsign, folderId: r.inboundFpl.folderId,
      addressee: r.inboundFpl.addressee, z: '0820', dep: r.inboundFpl.dep, dest: r.inboundFpl.dest,
      detail: `Inbound from ${r.inboundFpl.depName} (${r.inboundFpl.dep}), EOBT ${r.inboundFpl.eobt}`,
      acked: false, processed: false,
      acType: 'C208', wake: 'L', flightRules: 'I', eobt: r.inboundFpl.eobt,
      speedLevel: 'N0180F100', route: 'DCT', eet: '0035',
    },
    {
      kind: 'CNL', callsign: r.cnl.callsign, folderId: r.cnl.folderId, addressee: r.cnl.addressee,
      z: '1015', dep: r.cnl.dep, dest: r.cnl.dest,
      detail: `Cancellation of Grantley Adams → ${r.cnl.destName} (${r.cnl.dest}), EOBT ${r.cnl.eobt}`,
      acked: false, processed: true, eobt: r.cnl.eobt,
    },
    {
      kind: 'NOTAM', callsign: r.notam.series, folderId: r.notam.folderId, addressee: r.notam.addressee,
      z: '0705', detail: r.notam.subject, acked: false, processed: false,
      dep: 'TBPB', notamQ: 'TTZP/QMRXX/IV/NBO/A/000/999/1304N05937W005',
      notamB: `${SHIFT_DOF}0700`, notamC: `${SHIFT_DOF}1800`,
      notamE: 'RWY 09/27 WORK IN PROGRESS. WORK AREA ESTABLISHED ON RWY 09/27 GRANTLEY ADAMS.',
    },
    // ── Foreign-originated inbound to Barbados — filed in BOTH TBPB and origin ──
    {
      kind: 'FPL', callsign: fi.callsign, folderId: fi.folderId,
      folderIds: [fi.folderId, fi.originFolderId], addressee: fi.addressee,
      z: '1145', dep: fi.dep, dest: fi.dest,
      detail: `Inbound from ${fi.depName} (${fi.dep}), EOBT ${fi.eobt} — filed by ${fi.originName}`,
      acked: false, processed: false,
      foreign: true, traffic: 'inbound', atcUnit: fi.atcUnit,
      acType: 'A321', wake: 'M', flightRules: 'I', eobt: fi.eobt,
      speedLevel: 'N0450F360', route: 'L455 DCT', eet: '0210', altn: 'TGPY',
    },
    // ── Foreign-originated overflight of the Piarco FIR — BOTH TBPB and origin ──
    {
      kind: 'FPL', callsign: ov.callsign, folderId: ov.folderId,
      folderIds: [ov.folderId, ov.originFolderId], addressee: ov.addressee,
      z: '1120', dep: ov.dep, dest: ov.dest,
      detail: `Overflight ${ov.depName} (${ov.dep}) → ${ov.destName} (${ov.dest}) via Piarco FIR, EOBT ${ov.eobt}`,
      acked: false, processed: false,
      foreign: true, traffic: 'overflight', atcUnit: ov.atcUnit,
      acType: 'B738', wake: 'M', flightRules: 'I', eobt: ov.eobt,
      speedLevel: 'N0460F380', route: 'UA315 DCT', eet: '0125', altn: 'TBPB',
    },
    {
      kind: 'ARR', callsign: 'BWA415', folderId: 'TBPB', addressee: 'TBPBSELX', z: '1105',
      dep: 'TTPP', dest: 'TBPB', detail: 'Landed Grantley Adams 1102Z', acked: true, processed: true,
      arrTime: '1102',
    },
    {
      kind: 'FPL', callsign: 'BWA2152', folderId: 'TBPB', addressee: 'TBPBSELX', z: '0955',
      dep: 'TTPP', dest: 'TBPB', detail: 'Inbound from Piarco (TTPP), EOBT 1100', acked: false, processed: false,
      acType: 'AT76', wake: 'M', flightRules: 'I', eobt: '1100', speedLevel: 'N0250F250', route: 'DCT', eet: '0040',
    },
    {
      kind: 'DEP', callsign: 'BWA512', folderId: 'TTPP', addressee: 'TTPPZQZX', z: '1135',
      dep: 'TBPB', dest: 'TTPP', detail: 'Airborne Grantley Adams 1132Z', acked: true, processed: true,
      offTime: '1132',
    },
    {
      kind: 'CHG', callsign: 'AAL2196', folderId: 'TBPB', addressee: 'TBPBSELX', z: '1320',
      dep: 'TJSJ', dest: 'TBPB', detail: 'Item 16 alternate changed to TLPC', acked: false, processed: true,
      chgField: '16/TLPC',
    },
    {
      kind: 'FPL', callsign: 'LIA221', folderId: 'TVSV', addressee: 'TVSVZQZX', z: '1250',
      dep: 'TBPB', dest: 'TVSV', detail: 'Outbound to Argyle (TVSV), EOBT 1400', acked: false, processed: false,
      acType: 'AT72', wake: 'M', flightRules: 'I', eobt: '1400', speedLevel: 'N0250F230', route: 'DCT', eet: '0035',
    },
  ];
}

// Per-shift extra entries, to give each shift a slightly different starting file.
function perShiftSeed(shiftId: string): SeedSpec[] {
  switch (shiftId) {
    case 'A':
      return [
        { kind: 'FPL', callsign: 'BWA600', folderId: 'TBPB', addressee: 'TBPBSELX', z: '0815',
          dep: 'SYCJ', dest: 'TBPB', detail: 'Inbound from Cheddi Jagan (SYCJ), EOBT 0930', acked: false, processed: false },
      ];
    case 'B':
      return [
        { kind: 'DEP', callsign: 'LIA118', folderId: 'TLPC', addressee: 'TLPCZQZX', z: '1240',
          dep: 'TBPB', dest: 'TLPC', detail: 'Airborne Grantley Adams 1238Z', acked: true, processed: true,
          offTime: '1238' },
        // Foreign overflight filed by Curaçao, copied to Barbados — both folders.
        { kind: 'FPL', callsign: 'KLM73', folderId: 'TBPB', folderIds: ['TBPB', 'TNCC'], addressee: 'TBPBYFYX',
          z: '1255', dep: 'TNCC', dest: 'SOCA', detail: 'Overflight Curaçao (TNCC) → Cayenne (SOCA) via Piarco FIR, EOBT 1330',
          acked: false, processed: false, foreign: true, traffic: 'overflight', atcUnit: 'Piarco ACC',
          acType: 'B772', wake: 'H', flightRules: 'I', eobt: '1330', speedLevel: 'N0480F390', route: 'UA301 DCT', eet: '0205', altn: 'TBPB' },
      ];
    case 'C':
      return [
        { kind: 'CNL', callsign: 'SLM442', folderId: 'SMJP', addressee: 'SMJPZQZX', z: '1830',
          dep: 'TBPB', dest: 'SMJP', detail: 'Cancellation of Grantley Adams → Johan A. Pengel (SMJP)', acked: false, processed: true },
      ];
    case 'D':
      return [
        { kind: 'FPL', callsign: 'BWA417', folderId: 'TBPB', addressee: 'TBPBSELX', z: '0210',
          dep: 'TTPP', dest: 'TBPB', detail: 'Inbound from Piarco (TTPP), EOBT 0330', acked: false, processed: false },
      ];
    default:
      return [];
  }
}

/** Build the seeded message store for a given shift. */
export function seedFileStore(shiftId: string): StoreMessage[] {
  return [...commonSeed(), ...perShiftSeed(shiftId)].map(build);
}

/**
 * Build a new store message stamped at a given shift local time. Used when the
 * officer files/processes work during the shift (e.g. an approved FPL).
 */
export function makeStoreMessage(
  partial: Omit<StoreMessage, 'id' | 'timeSent' | 'timeSentMin' | 'acked' | 'processed'> &
    Partial<Pick<StoreMessage, 'acked' | 'processed'>>,
  localMinutes: number,
): StoreMessage {
  const utcMin = wrapMinutes(localMinutes + UTC_OFFSET_MINUTES);
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timeSent: zulu(localMinutes),
    timeSentMin: utcMin,
    acked: partial.acked ?? true,
    processed: partial.processed ?? true,
    ...partial,
  };
}

export type SortKey = 'sent' | 'flightDate' | 'callsign';

/** Sort a list of messages by the chosen key. */
export function sortMessages(list: StoreMessage[], key: SortKey, asc: boolean): StoreMessage[] {
  const dir = asc ? 1 : -1;
  const sorted = [...list].sort((a, b) => {
    switch (key) {
      case 'sent':
        return (a.timeSentMin - b.timeSentMin) * dir;
      case 'flightDate':
        if (a.flightDate !== b.flightDate) return a.flightDate.localeCompare(b.flightDate) * dir;
        return (a.timeSentMin - b.timeSentMin) * dir;
      case 'callsign':
        return a.callsign.localeCompare(b.callsign) * dir;
      default:
        return 0;
    }
  });
  return sorted;
}
