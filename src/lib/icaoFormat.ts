import type { StoreMessage } from './fileStore';

// ── ICAO bracketed free-text formatter ───────────────────────────────────────
// Turns a stored message into its ICAO Doc 4444 bracketed free-text form, with
// hyphen-separated fields, e.g. (FPL-CALLSIGN-IS-…). Stored messages only carry
// a subset of the full FPL data, so missing fields fall back to representative
// values (ZZZZ for unknown aerodromes, sensible cruising speed/level, DCT route)
// while always honouring whatever structured data the message does carry.

const UNKNOWN_AD = 'ZZZZ';

/** Strip a trailing Z from a Zulu time string, leaving HHMM. */
function hhmm(z?: string): string {
  if (!z) return '';
  return z.replace(/Z$/i, '').trim();
}

/** Departure time used in field 13 (EOBT for an FPL). */
function eobtOf(m: StoreMessage): string {
  return m.eobt ?? hhmm(m.timeSent);
}

function fplText(m: StoreMessage): string {
  const rules = m.flightRules ?? 'I';
  const flightType = m.flightType ?? 'S';
  const acType = m.acType ?? UNKNOWN_AD;
  const wake = m.wake ?? 'M';
  const equip = m.equipment ?? 'SDFGRWY/SB1';
  const dep = m.dep ?? UNKNOWN_AD;
  const speedLevel = m.speedLevel ?? 'N0250F250';
  const route = m.route ?? 'DCT';
  const dest = m.dest ?? UNKNOWN_AD;
  const eet = m.eet ?? '0100';
  const altn = m.altn ? ` ${m.altn}` : '';
  const other = `DOF/${m.flightDate}`;
  return [
    `(FPL-${m.callsign}-${rules}${flightType}`,
    `-${acType}/${wake}-${equip}`,
    `-${dep}${eobtOf(m)}`,
    `-${speedLevel} ${route}`,
    `-${dest}${eet}${altn}`,
    `-${other})`,
  ].join('\n');
}

function cnlText(m: StoreMessage): string {
  const dep = m.dep ?? UNKNOWN_AD;
  const dest = m.dest ?? UNKNOWN_AD;
  return [
    `(CNL-${m.callsign}-${dep}-${dest}`,
    `-DOF/${m.flightDate})`,
  ].join('\n');
}

function depText(m: StoreMessage): string {
  const dep = m.dep ?? UNKNOWN_AD;
  const dest = m.dest ?? UNKNOWN_AD;
  const off = m.offTime ?? hhmm(m.timeSent);
  return `(DEP-${m.callsign}-${dep}${off}-${dest})`;
}

function arrText(m: StoreMessage): string {
  const dep = m.dep ?? UNKNOWN_AD;
  const dest = m.dest ?? UNKNOWN_AD;
  const arr = m.arrTime ?? hhmm(m.timeSent);
  return `(ARR-${m.callsign}-${dep}-${dest}${arr})`;
}

function chgText(m: StoreMessage): string {
  const dep = m.dep ?? UNKNOWN_AD;
  const dest = m.dest ?? UNKNOWN_AD;
  const change = m.chgField ?? '18/RMK CHANGE';
  return `(CHG-${m.callsign}-${dep}-${dest}-${change})`;
}

function notamText(m: StoreMessage): string {
  // For NOTAMs the callsign field holds the series/number (e.g. A0234/26).
  const q = m.notamQ ?? 'TTZP/QMRLC/IV/NBO/A/000/999/1304N05937W005';
  const a = m.dep ?? 'TBPB';
  const b = m.notamB ?? `${m.flightDate}0000`;
  const c = m.notamC ?? 'PERM';
  const e = m.notamE ?? m.detail;
  return [
    `(${m.callsign} NOTAMN`,
    `Q) ${q}`,
    `A) ${a} B) ${b} C) ${c}`,
    `E) ${e})`,
  ].join('\n');
}

/** Render a stored message as ICAO bracketed free-text, for any message kind. */
export function toIcaoFreeText(m: StoreMessage): string {
  switch (m.kind) {
    case 'FPL':   return fplText(m);
    case 'CNL':   return cnlText(m);
    case 'DEP':   return depText(m);
    case 'ARR':   return arrText(m);
    case 'CHG':   return chgText(m);
    case 'NOTAM': return notamText(m);
    default:      return `(${m.kind}-${m.callsign})`;
  }
}
