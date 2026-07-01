// ── SkyVector-style token search & route parsing ────────────────────────────
// Resolves free-text route input ("TBPB UA301 ANU DCT TJSJ") into typed
// RouteElements. Tokens are classified as airway / DCT / fix; unknown tokens
// keep an error message so the UI can flag them.

import { fixByIdent, airwayById, ALL_FIXES, AIRWAYS } from './db';
import type { RouteElement, Fix } from './types';

// ── Levenshtein ≤1 suggestion helper ───────────────────────────────────────
function editDistLE1(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la === lb) { i++; j++; }
    else if (la > lb) i++;
    else j++;
  }
  if (i < la || j < lb) edits++;
  return edits <= 1;
}

const AIRWAY_IDS = AIRWAYS.map(a => a.id);

/** Best guess replacement for an unknown token, or null. */
export function suggestToken(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  const looksLikeAirway = /^[A-Z]{1,3}\d{1,3}[A-Z]?$/.test(t);
  const pool = looksLikeAirway ? AIRWAY_IDS : ALL_FIXES.map(f => f.ident);
  for (const cand of pool) {
    if (cand.length === 0) continue;
    if (Math.abs(cand.length - t.length) > 1) continue;
    if (editDistLE1(t, cand)) return cand;
  }
  return null;
}

const AIRWAY_RE = /^[A-Z]{1,3}\d{1,3}[A-Z]?$/;

export function classifyToken(raw: string): RouteElement {
  const t = raw.trim().toUpperCase();
  if (!t) return { kind: 'fix', raw, error: 'Empty token' };
  if (t === 'DCT' || t === 'DIRECT') return { kind: 'dct', raw: t };
  if (AIRWAY_RE.test(t)) {
    const awy = airwayById(t);
    return awy
      ? { kind: 'airway', raw: t, airwayId: awy.id }
      : { kind: 'airway', raw: t, error: `Unknown airway "${t}"` };
  }
  const fix = fixByIdent(t);
  return fix
    ? { kind: 'fix', raw: t, fix }
    : { kind: 'fix', raw: t, error: `Unknown fix/navaid/airport "${t}"` };
}

export function parseRouteString(input: string): RouteElement[] {
  return input.trim().toUpperCase().split(/\s+/).filter(Boolean).map(classifyToken);
}

export interface SearchHit { fix: Fix; score: number; }

/**
 * Prefix-priority search over the unified fix index. Idents that start with
 * the query rank above contains matches; airports/navaids above waypoints.
 */
export function searchFixes(query: string, limit = 20): SearchHit[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const fix of ALL_FIXES) {
    let score = 0;
    if (fix.ident === q) score = 1000;
    else if (fix.ident.startsWith(q)) score = 500 - (fix.ident.length - q.length);
    else if (fix.ident.includes(q)) score = 100;
    else if (fix.label?.toUpperCase().includes(q)) score = 50;
    if (!score) continue;
    if (fix.kind === 'airport') score += 30;
    else if (fix.kind === 'navaid') score += 15;
    hits.push({ fix, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
