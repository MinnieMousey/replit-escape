import React, { useMemo, useState } from 'react';
import { AIRLINE_CALLSIGNS, CARIBBEAN_AIRPORTS } from '@/lib/reference/caribbean';

// ── Caribbean Reference Data ────────────────────────────────────────────────
// Two filterable tables sourced from the user's handwritten reference sheet:
// airline ICAO callsigns and Caribbean airport ICAO/IATA pairs.

export const CaribbeanRefTab: React.FC = () => {
  const [q, setQ] = useState('');

  const ql = q.trim().toLowerCase();
  const airlines = useMemo(
    () => AIRLINE_CALLSIGNS.filter(a =>
      !ql || a.airline.toLowerCase().includes(ql) || a.icao.toLowerCase().includes(ql)),
    [ql],
  );
  const airports = useMemo(
    () => CARIBBEAN_AIRPORTS.filter(a =>
      !ql || a.icao.toLowerCase().includes(ql) || a.iata.toLowerCase().includes(ql) ||
      (a.name?.toLowerCase().includes(ql) ?? false)),
    [ql],
  );

  return (
    <div className="space-y-4">
      <div className="border border-sky-500/20 bg-sky-900/10 rounded-xl p-3">
        <h3 className="text-sky-300 font-bold text-sm">Caribbean Reference Data</h3>
        <p className="text-white/50 text-xs mt-1 leading-relaxed">
          Quick-reference tables for the AIS desk: ICAO airline operator codes (the
          three-letter callsign prefix that goes on the flight strip) and
          Caribbean airport ICAO ↔ IATA pairs from the area reference sheet.
        </p>
      </div>

      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Filter by airline, ICAO, or IATA…"
        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-400 outline-none placeholder-white/30"
      />

      <div className="border border-white/10 rounded-xl overflow-hidden">
        <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Airline Callsigns</span>
          <span className="text-white/30 text-[10px]">{airlines.length} / {AIRLINE_CALLSIGNS.length}</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/30 uppercase tracking-widest text-[10px]">
              <th className="text-left py-1.5 px-3 font-normal">Airline</th>
              <th className="text-left py-1.5 px-3 font-normal w-24">ICAO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {airlines.map(a => (
              <tr key={a.icao + a.airline} className="hover:bg-white/3">
                <td className="py-1.5 px-3 text-white/80">{a.airline}</td>
                <td className="py-1.5 px-3 font-mono font-bold text-sky-300">{a.icao}</td>
              </tr>
            ))}
            {!airlines.length && (
              <tr><td colSpan={2} className="text-white/30 text-xs py-3 px-3">No matches.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border border-white/10 rounded-xl overflow-hidden">
        <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Caribbean Airport Reference</span>
          <span className="text-white/30 text-[10px]">{airports.length} / {CARIBBEAN_AIRPORTS.length}</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/30 uppercase tracking-widest text-[10px]">
              <th className="text-left py-1.5 px-3 font-normal w-20">ICAO</th>
              <th className="text-left py-1.5 px-3 font-normal w-16">IATA</th>
              <th className="text-left py-1.5 px-3 font-normal">Aerodrome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {airports.map(a => (
              <tr key={a.icao} className="hover:bg-white/3">
                <td className="py-1.5 px-3 font-mono font-bold text-amber-300">{a.icao}</td>
                <td className="py-1.5 px-3 font-mono font-bold text-emerald-300">{a.iata}</td>
                <td className="py-1.5 px-3 text-white/70">{a.name ?? ''}</td>
              </tr>
            ))}
            {!airports.length && (
              <tr><td colSpan={3} className="text-white/30 text-xs py-3 px-3">No matches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
