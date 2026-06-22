import React from 'react';
import { FlightStatus, FlightCategory } from '@/lib/flightStatus';
import { MESSAGE_KIND_META } from '@/lib/fileStore';
import { wrapMinutes, zulu } from '@/lib/shifts';

const CATEGORY_META: Record<FlightCategory, { label: string; cls: string }> = {
  inbound:    { label: 'INBOUND',    cls: 'text-cyan-200 border-cyan-400/50 bg-cyan-900/30' },
  overflight: { label: 'OVERFLIGHT', cls: 'text-fuchsia-200 border-fuchsia-400/50 bg-fuchsia-900/30' },
  departing:  { label: 'DEPARTING',  cls: 'text-emerald-200 border-emerald-400/50 bg-emerald-900/30' },
};

/** Format a UTC minutes-from-midnight value as a Zulu HHMMZ label. */
function utcZulu(utcMin: number): string {
  const u = wrapMinutes(utcMin);
  return `${String(Math.floor(u / 60)).padStart(2, '0')}${String(u % 60).padStart(2, '0')}Z`;
}

function mins(n: number): string {
  const v = Math.max(0, Math.round(n));
  return v >= 60 ? `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}` : `${v} min`;
}

const FlightRow: React.FC<{ flight: FlightStatus }> = ({ flight }) => {
  const meta = MESSAGE_KIND_META[flight.kind];
  const cat = CATEGORY_META[flight.category];

  // For overflights the "arrival" is the FIR exit; for inbound/departing it's the
  // destination ETA. Phrasing adapts so the board reads naturally either way.
  const arrLabel = flight.category === 'overflight' ? 'Clear FIR' : 'ETA';

  return (
    <div
      data-testid={`flight-row-${flight.id}`}
      className="rounded-lg border border-white/10 bg-black/20 p-2.5"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`shrink-0 font-mono text-[10px] font-bold rounded px-1.5 py-0.5 border ${meta.color}`}>
          {meta.label}
        </span>
        <span className="font-mono text-sm font-bold text-white truncate">{flight.callsign}</span>
        <span className={`shrink-0 font-mono text-[9px] font-bold rounded px-1.5 py-0.5 border ${cat.cls}`}>
          {cat.label}
        </span>
        {flight.airborneReported && flight.phase === 'active' && (
          <span className="shrink-0 font-mono text-[9px] font-bold rounded px-1.5 py-0.5 border text-green-200 border-green-400/50 bg-green-900/30">
            AIRBORNE
          </span>
        )}
        {flight.msg.foreign && !flight.msg.forwarded && (
          <span className="shrink-0 font-mono text-[9px] font-bold rounded px-1.5 py-0.5 border text-amber-200 border-amber-400/40 bg-amber-900/20">
            FWD?
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-white/50 font-mono">
        <span>{flight.dep ?? '—'} → {flight.dest ?? '—'}</span>
        {flight.msg.route && <span className="text-white/40">{flight.msg.route}</span>}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] font-mono">
        {flight.phase === 'upcoming' ? (
          <>
            <span className="text-sky-300/80">Off {utcZulu(flight.depMin)}</span>
            <span className="text-amber-300/80">in {mins(flight.minsToDep)}</span>
          </>
        ) : (
          <>
            <span className="text-white/50">Off {utcZulu(flight.depMin)}</span>
            <span className="text-sky-300/80">{arrLabel} {utcZulu(flight.arrMin)}</span>
            <span className="text-emerald-300/80">in {mins(flight.minsToArr)}</span>
          </>
        )}
      </div>
    </div>
  );
};

export const FlightBoard: React.FC<{
  flights: FlightStatus[];
  emptyLabel: string;
  nowLocalMinutes: number;
}> = ({ flights, emptyLabel, nowLocalMinutes }) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 px-3 py-1.5 border-b border-white/10 text-[10px] uppercase tracking-widest text-white/30 font-mono">
        {flights.length} flight{flights.length === 1 ? '' : 's'} · now {zulu(nowLocalMinutes)}
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {flights.length === 0 ? (
          <p className="text-white/30 text-xs italic p-3">{emptyLabel}</p>
        ) : (
          flights.map(f => <FlightRow key={f.id} flight={f} />)
        )}
      </div>
    </div>
  );
};
