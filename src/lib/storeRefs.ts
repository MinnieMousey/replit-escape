// Shared, dependency-free constants for the shift file store. Kept in their own
// module so both the file store (fileStore.ts) and the scenario generator
// (taskGenerator.ts) can import them without creating a circular dependency.

/** The date of flight used across the simulator scenarios (June 19, 2026). */
export const SHIFT_DOF = '260619';

// ── Retrieval references ──────────────────────────────────────────────────────
// These describe the specific messages the call-request retrieval scenarios ask
// about. They are the single source of truth shared by BOTH the seeded store
// entries and the InfoRequest retrieval scenarios, so a caller who asks "do you
// have the inbound FPL for GA345?" can always be answered from the store. Keep
// both sides driven off these refs so the answer keys and seed stay in sync.
export const RETRIEVAL_REFS = {
  inboundFpl: {
    callsign: 'GA345', dep: 'TGPY', depName: 'Point Salines',
    dest: 'TBPB', eobt: '0930', folderId: 'TBPB', addressee: 'TBPBSELX',
  },
  cnl: {
    callsign: 'LIA341', dep: 'TBPB', dest: 'TTPP', destName: 'Piarco',
    eobt: '1130', folderId: 'TTPP', addressee: 'TTPPZQZX',
  },
  notam: {
    series: 'A0234/26', folderId: 'TBPB', addressee: 'TBPBSELX',
    subject: 'RWY 09/27 work area, Grantley Adams',
  },
  // Foreign-originated FPL inbound to Barbados, filed by another country's ARO and
  // addressed to Barbados. Lives in BOTH our TBPB folder and the originating
  // country's folder, and must be forwarded to the local ATC unit on arrival.
  foreignInbound: {
    callsign: 'AAL1290', dep: 'TJSJ', depName: 'San Juan Luis Muñoz Marín',
    dest: 'TBPB', destName: 'Grantley Adams', eobt: '1330',
    folderId: 'TBPB', addressee: 'TBPBSELX',
    originFolderId: 'TJZS', originAddressee: 'TJZSZQZX', originName: 'San Juan',
    atcUnit: 'Grantley Adams TWR/APP',
  },
  // Foreign-originated FPL overflying the Piarco FIR (does not land at Barbados),
  // copied to Barbados AIS. Lives in BOTH our TBPB folder and the originating
  // country's folder, and must be forwarded to Piarco ACC.
  overflight: {
    callsign: 'BWA77', dep: 'TFFF', depName: 'Fort-de-France',
    dest: 'SYCJ', destName: 'Cheddi Jagan', eobt: '1210',
    folderId: 'TBPB', addressee: 'TBPBYFYX',
    originFolderId: 'TFFF', originAddressee: 'TFFFZQZX', originName: 'Martinique',
    atcUnit: 'Piarco ACC',
  },
} as const;
