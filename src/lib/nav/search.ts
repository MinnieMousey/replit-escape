// ── SkyVector-style token search & route parsing ────────────────────────────
// Resolves free-text route input ("TBPB UA301 ANU DCT TJSJ") into typed
// RouteElements. Tokens are classified as airway / DCT / fix; unknown tokens
// keep an error message so the UI can flag them.

import { fixByIdent, airwayById, ALL_FIXES } from './db';
import type { RouteElement, Fix } from './types';

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
