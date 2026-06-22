import React, { useState } from 'react';
import doc7910Map from '@assets/IMG_0076_1780673279978.png';
import firChart from '@assets/caribbean_central_america_firs.jpg';
import { FIRS, BOUNDARY_POINTS, BOUNDARY_LINES } from './navdb';
import { ChartPopout, PopoutImage } from './ChartPopout';

// ── First-letter table ────────────────────────────────────────────────────────
const FIRST_LETTERS: [string, string][] = [
  ['A', 'Western South Pacific (Papua New Guinea, Solomons, Nauru…)'],
  ['B', 'Greenland, Iceland, Kosovo'],
  ['C', 'Canada'],
  ['D', 'North-west Africa (Algeria, Tunisia, Nigeria, Ghana…)'],
  ['E', 'Northern Europe'],
  ['F', 'Southern Africa'],
  ['G', 'West Africa (Morocco, Canary Is., Senegal, Mali…)'],
  ['H', 'East / North-east Africa (Egypt, Ethiopia, Kenya…)'],
  ['K', 'Contiguous United States'],
  ['L', 'Southern Europe & the Mediterranean'],
  ['M', 'Mexico, Central America, NW Caribbean (incl. Cuba, Jamaica, Hispaniola, Bahamas)'],
  ['N', 'South Pacific (New Zealand, Fiji, French Polynesia…)'],
  ['O', 'Middle East / South-west Asia'],
  ['P', 'Eastern North Pacific (Alaska, Hawaii, Guam…)'],
  ['R', 'Western North Pacific / East Asia (Japan, Korea, Taiwan, Philippines)'],
  ['S', 'South America (all, incl. the southern cone)'],
  ['T', 'Eastern Caribbean — Lesser Antilles, Puerto Rico, US/Brit. Virgin Islands'],
  ['U', 'Russia & former Soviet States'],
  ['V', 'South & parts of South-east Asia (India, Thailand, Vietnam…)'],
  ['W', 'Maritime South-east Asia (Indonesia, Malaysia, Singapore)'],
  ['Y', 'Australia'],
  ['Z', 'China, Mongolia, DPR Korea'],
];

// ── Caribbean & neighbour second letters (1st + 2nd letter = State/territory) ──
const PREFIXES: { region: string; color: string; items: [string, string][] }[] = [
  { region: 'T — Eastern Caribbean', color: 'text-amber-300', items: [
    ['TA', 'Antigua & Barbuda'], ['TB', 'Barbados'], ['TD', 'Dominica'],
    ['TF', 'French Antilles (Guadeloupe, Martinique)'], ['TG', 'Grenada'],
    ['TI', 'US Virgin Islands'], ['TJ', 'Puerto Rico'], ['TK', 'St Kitts & Nevis'],
    ['TL', 'St Lucia'], ['TN', 'Aruba / Curaçao / Bonaire / Sint Maarten'],
    ['TQ', 'Anguilla'], ['TR', 'Montserrat'], ['TT', 'Trinidad & Tobago'],
    ['TU', 'British Virgin Islands'], ['TV', 'St Vincent & the Grenadines'], ['TX', 'Bermuda'],
  ]},
  { region: 'M — Mexico, C. America & NW Caribbean', color: 'text-violet-300', items: [
    ['MB', 'Turks & Caicos'], ['MD', 'Dominican Republic'], ['MK', 'Jamaica'],
    ['MM', 'Mexico'], ['MP', 'Panama'], ['MR', 'Costa Rica'], ['MT', 'Haiti'],
    ['MU', 'Cuba'], ['MW', 'Cayman Islands'], ['MY', 'Bahamas'], ['MZ', 'Belize'],
  ]},
  { region: 'S — South America', color: 'text-red-300', items: [
    ['SV', 'Venezuela'], ['SK', 'Colombia'], ['SY', 'Guyana'], ['SM', 'Suriname'],
    ['SO', 'French Guiana'], ['SB/SD/SW', 'Brazil'],
  ]},
  { region: 'Single-letter States (1st letter only)', color: 'text-emerald-300', items: [
    ['K', 'Contiguous United States — last 3 letters are the location, e.g. KMIA, KJFK, KZNY (New York ARTCC).'],
    ['C', 'Canada — e.g. CYYZ Toronto, CZUL Montréal ACC.'],
    ['Y', 'Australia — e.g. YSSY Sydney, YBBB Brisbane FIR.'],
  ]},
  { region: 'P — Eastern North Pacific', color: 'text-sky-300', items: [
    ['PA', 'Alaska'], ['PH', 'Hawaii'], ['PG', 'Guam / Marianas'], ['PT', 'Micronesia / Palau'],
  ]},
];

// ── Wider first-letter examples (codes a Barbados ARO routinely handles) ─────────
const WIDER_EXAMPLES: { region: string; color: string; items: [string, string][] }[] = [
  { region: 'Oceanic / North Atlantic control', color: 'text-cyan-300', items: [
    ['KZWY', 'New York Oceanic OACC (controls the N. Atlantic west of 40°W adjoining Piarco).'],
    ['KZMA', 'Miami OACC / ARTCC — SE US & Gulf oceanic.'],
    ['TJZS', 'San Juan CERAP — Puerto Rico & US/Brit. Virgin Islands airspace.'],
  ]},
  { region: 'Central America / NW Caribbean', color: 'text-violet-300', items: [
    ['MMFR', 'Mexico City FIR (Mexico).'], ['MUFH', 'Habana FIR (Cuba).'],
    ['MKJK', 'Kingston FIR (Jamaica & Caymans).'], ['MDCS', 'Santo Domingo FIR (Hispaniola).'],
    ['MHTG', 'Central American FIR — COCESNA (Belize→Costa Rica).'], ['MPZL', 'Panamá FIR.'],
  ]},
  { region: 'South America (S)', color: 'text-red-300', items: [
    ['SVZM', 'Maiquetía FIR (Venezuela).'], ['SKED', 'Barranquilla FIR (Colombia).'],
    ['SOOO', 'Cayenne FIR (French Guiana).'], ['SBAO', 'Atlântico FIR (Brazil oceanic).'],
  ]},
];

// ── AFTN flight-plan addressees for States served by AIS Barbados ───────────────
// 8-letter ARO addressees (Doc 7910 location indicator + ZQZX). Codes for the
// Piarco-FIR neighbours mirror the FPL-routing exercise; Barbados is the home
// office (addressed TBPBSELX, never to itself) and Piarco ACC is copied on every
// flight crossing the FIR.
const AFTN_ADDRESSEES: { region: string; color: string; items: [string, string][] }[] = [
  { region: 'Piarco FIR — Eastern Caribbean (T)', color: 'text-amber-300', items: [
    ['TBPBSELX', 'Barbados — Grantley Adams (home ARO)'],
    ['TTPPZQZX', 'Trinidad & Tobago — Piarco'],
    ['TLPCZQZX', 'St Lucia — Hewanorra'],
    ['TVSVZQZX', 'St Vincent & the Grenadines — Argyle'],
    ['TGPYZQZX', 'Grenada — Maurice Bishop (Point Salines)'],
    ['TDPDZQZX', 'Dominica — Douglas-Charles'],
    ['TAPAZQZX', 'Antigua & Barbuda — V.C. Bird'],
    ['TKPKZQZX', 'St Kitts & Nevis — R.L. Bradshaw'],
    ['TQPFZQZX', 'Anguilla — Clayton J. Lloyd'],
    ['TRPGZQZX', 'Montserrat — John A. Osborne'],
    ['TFFRZQZX', 'Guadeloupe — Pointe-à-Pitre'],
    ['TFFFZQZX', 'Martinique — Aimé Césaire'],
    ['TNCMZQZX', 'Sint Maarten — Princess Juliana'],
    ['TUPJZQZX', 'British Virgin Islands — T.B. Lettsome'],
    ['TISTZQZX', 'US Virgin Islands — Cyril E. King'],
    ['TJSJZQZX', 'Puerto Rico — Luis Muñoz Marín'],
    ['TXKFZQZX', 'Bermuda — L.F. Wade'],
  ]},
  { region: 'Curaçao FIR — ABC Islands (T)', color: 'text-cyan-300', items: [
    ['TNCAZQZX', 'Aruba — Queen Beatrix'],
    ['TNCCZQZX', 'Curaçao — Hato'],
    ['TNCBZQZX', 'Bonaire — Flamingo'],
  ]},
  { region: 'South American neighbours (S)', color: 'text-red-300', items: [
    ['SYCJZQZX', 'Guyana — Cheddi Jagan'],
    ['SMJPZQZX', 'Suriname — Johan A. Pengel'],
    ['SVMIZQZX', 'Venezuela — Maiquetía (Caracas)'],
    ['SOCAZQZX', 'French Guiana — Cayenne Félix Éboué'],
  ]},
  { region: 'Area control — always copied', color: 'text-sky-300', items: [
    ['TTZPZQZX', 'Piarco Area Control Centre — controls the FIR over Barbados'],
  ]},
];

export const LocIndTab: React.FC = () => {
  const [popout, setPopout] = useState<null | 'doc7910' | 'fir'>(null);
  const [doc7910Collapsed, setDoc7910Collapsed] = useState(false);
  const [firCollapsed, setFirCollapsed] = useState(false);
  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="border border-sky-500/20 bg-sky-900/10 rounded-xl p-3">
        <h3 className="text-sky-300 font-bold text-sm">Location Indicators &amp; AFTN Addressing</h3>
        <p className="text-white/50 text-xs mt-1 leading-relaxed">
          Every aerodrome/ATS unit has a 4-letter <span className="text-sky-300 font-semibold">ICAO location indicator</span> (ICAO Doc 7910).
          The 1st letter sets the world routing area — the chart below is the official Doc 7910 index of those letters.
          AFTN addresses (where flight plans, NOTAM &amp; MET messages are sent) are built from these indicators.
        </p>
      </div>

      {/* Location-indicator letters — chart pinned to the top while its reference tables scroll below */}
      <div className="relative space-y-4">
        {/* Routing-area map — official ICAO Doc 7910 index chart */}
        <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-1.5 bg-slate-900">
          <div className="border border-white/10 rounded-xl overflow-hidden bg-white shadow-lg shadow-black/40">
            <div className="px-3 py-2 bg-slate-900 border-b border-white/10 flex items-center gap-2 flex-wrap">
              <button
                style={{ touchAction: 'manipulation' }}
                onClick={() => setDoc7910Collapsed(c => !c)}
                aria-expanded={!doc7910Collapsed}
                title={doc7910Collapsed ? 'Show the chart' : 'Hide the chart to free up space'}
                className="flex items-center gap-1.5 text-white/60 hover:text-white font-bold text-xs transition-colors"
              >
                <span className="text-[9px] text-white/40">{doc7910Collapsed ? '▸' : '▾'}</span>
                Doc 7910 routing-area map
              </button>
              <button
                style={{ touchAction: 'manipulation' }}
                onClick={() => setPopout('doc7910')}
                title="Open the chart full-screen"
                className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/15 bg-black/30 text-white/60 hover:text-white text-[10px] font-bold transition-colors"
              ><span aria-hidden="true">⛶</span> Full screen</button>
              <span className="text-amber-300/80 text-[10px] font-mono hidden sm:block">
                {doc7910Collapsed ? 'Chart hidden — tap to show' : 'Barbados (TBPB) → area “T”, Eastern Caribbean.'}
              </span>
            </div>
            {!doc7910Collapsed && (
              <>
                <img
                  src={doc7910Map}
                  alt="ICAO Doc 7910 — Index to identifying letters assigned to aeronautical fixed service routing areas of States"
                  className="w-full block"
                  style={{ maxHeight: 'min(42vh, 460px)', objectFit: 'contain' }}
                />
                <div className="px-3 py-2 bg-slate-900 text-xs text-white/50">
                  ICAO Doc 7910 — index to 1st-letter routing areas of States.
                </div>
              </>
            )}
          </div>
        </div>

      {/* First-letter reference */}
      <div className="border border-white/10 rounded-xl p-3">
        <h4 className="text-white/70 font-bold text-xs uppercase tracking-widest mb-2">1st letter — world routing area</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {FIRST_LETTERS.map(([l, d]) => (
            <div key={l} className="flex gap-3 py-1 border-b border-white/5">
              <span className="shrink-0 w-6 font-mono font-bold text-sm text-sky-400">{l}</span>
              <span className="text-white/60 text-xs leading-relaxed">{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Second-letter (State) reference */}
      <div className="border border-white/10 rounded-xl p-3">
        <h4 className="text-white/70 font-bold text-xs uppercase tracking-widest mb-2">1st + 2nd letter — State / territory</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PREFIXES.map(grp => (
            <div key={grp.region}>
              <div className={`text-xs font-bold mb-1 ${grp.color}`}>{grp.region}</div>
              <div className="space-y-0.5">
                {grp.items.map(([c, d]) => (
                  <div key={c} className="flex gap-2 text-xs">
                    <span className="shrink-0 w-16 font-mono font-bold text-white/80">{c}</span>
                    <span className="text-white/55 leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wider examples a Barbados ARO handles */}
      <div className="border border-white/10 rounded-xl p-3">
        <h4 className="text-white/70 font-bold text-xs uppercase tracking-widest mb-1">Wider routing — codes handled across the corridor</h4>
        <p className="text-white/40 text-[11px] mb-3 leading-relaxed">
          Flights routing west out of the Eastern Caribbean to Central America and the North Atlantic pass through
          neighbouring control areas. Their location/FIR indicators follow the same Doc 7910 scheme.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WIDER_EXAMPLES.map(grp => (
            <div key={grp.region}>
              <div className={`text-xs font-bold mb-1 ${grp.color}`}>{grp.region}</div>
              <div className="space-y-0.5">
                {grp.items.map(([c, d]) => (
                  <div key={c} className="flex gap-2 text-xs">
                    <span className="shrink-0 w-16 font-mono font-bold text-white/80">{c}</span>
                    <span className="text-white/55 leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* FIR boundaries — chart pinned to the top while its reference tables scroll below */}
      <div className="relative space-y-4">
        {/* Reference FIR chart */}
        <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-1.5 bg-slate-900">
          <div className="border border-white/10 rounded-xl overflow-hidden shadow-lg shadow-black/40">
            <div className="px-3 py-2 bg-slate-900 border-b border-white/10 flex items-center gap-2 flex-wrap">
              <button
                style={{ touchAction: 'manipulation' }}
                onClick={() => setFirCollapsed(c => !c)}
                aria-expanded={!firCollapsed}
                title={firCollapsed ? 'Show the chart' : 'Hide the chart to free up space'}
                className="flex items-center gap-1.5 text-white/60 hover:text-white font-bold text-xs transition-colors"
              >
                <span className="text-[9px] text-white/40">{firCollapsed ? '▸' : '▾'}</span>
                FIR boundary chart
              </button>
              <button
                style={{ touchAction: 'manipulation' }}
                onClick={() => setPopout('fir')}
                title="Open the chart full-screen"
                className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/15 bg-black/30 text-white/60 hover:text-white text-[10px] font-bold transition-colors shrink-0"
              ><span aria-hidden="true">⛶</span> Full screen</button>
              {firCollapsed && <span className="text-white/30 text-[10px] hidden sm:block">Chart hidden — tap to show</span>}
            </div>
            {!firCollapsed && (
              <>
                <img
                  src={firChart}
                  alt="Caribbean & Central America Flight Information Regions (FIR) boundary chart"
                  className="w-full block bg-slate-950"
                  style={{ maxHeight: 'min(42vh, 460px)', objectFit: 'contain' }}
                />
                <div className="px-3 py-2 bg-slate-900 text-xs text-white/50 leading-relaxed">
                  Reference: Caribbean / Central America FIR boundary chart (Ops Group). Shows the lateral limits of Piarco (TTZP)
                  and adjoining regions — use it for the full boundary geometry; this app plots only the exact AIP boundary points below.
                </div>
              </>
            )}
          </div>
        </div>

      {/* FIR / boundary identifiers */}
      <div className="border border-red-500/20 bg-red-900/5 rounded-xl p-3">
        <h4 className="text-red-300 font-bold text-xs uppercase tracking-widest mb-1">FIR boundary identifiers — Piarco (TTZP) &amp; neighbours</h4>
        <p className="text-white/40 text-[11px] mb-3 leading-relaxed">
          A <span className="text-red-300 font-semibold">Flight Information Region</span> uses a 4-letter indicator built on
          the same Doc 7910 prefix (the home FIR is <span className="font-mono text-amber-300">TTZP</span>, Piarco). Below is the
          home FIR and every adjoining region, with the controlling authority. Exact lateral limits are not redrawn here —
          consult the reference chart and the sourced AIP boundary points listed underneath.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          {FIRS.map(f => (
            <div key={f.ident} className="flex gap-2 py-1 border-b border-white/5 text-xs">
              <span className={`shrink-0 w-14 font-mono font-bold ${f.ident === 'TTZP' ? 'text-amber-300' : 'text-red-300/90'}`}>{f.ident}</span>
              <span className="text-white/60 leading-relaxed">
                <b className="text-white/80">{f.name}</b> — {f.authority}.
                {f.role && <span className="text-white/40"> {f.role}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sourced AIP boundary points */}
      <div className="border border-white/10 rounded-xl p-3">
        <h4 className="text-white/70 font-bold text-xs uppercase tracking-widest mb-1">Sourced Piarco-FIR boundary reporting points</h4>
        <p className="text-white/40 text-[11px] mb-3 leading-relaxed">
          Compulsory RNAV reporting points published on Piarco's common boundaries (Trinidad &amp; Tobago CAA AIP
          supplements). These exact coordinates are the only boundary geometry plotted on the Route map.
        </p>
        <div className="space-y-0.5">
          {BOUNDARY_POINTS.map(p => (
            <div key={p.ident} className="flex gap-2 text-xs py-0.5 border-b border-white/5">
              <span className="shrink-0 w-16 font-mono font-bold text-red-300">{p.ident}</span>
              <span className="shrink-0 w-24 font-mono text-white/45">{p.between ? (p.between[0] === p.between[1] ? p.between[0] : `${p.between[0]}/${p.between[1]}`) : '—'}</span>
              <span className="text-white/50 leading-relaxed">{p.note}</span>
            </div>
          ))}
        </div>
        {BOUNDARY_LINES.length > 0 && (
          <p className="text-white/35 text-[10px] mt-2 leading-relaxed">
            {BOUNDARY_LINES.map(b => `${b.firs[0]}/${b.firs[1]}: ${b.points.join(' → ')}`).join(' · ')} — drawn as a published common-boundary line on the map.
          </p>
        )}
      </div>
      </div>

      {/* 4-letter anatomy */}
      <div className="border border-amber-500/20 bg-amber-900/5 rounded-xl p-3">
        <h4 className="text-amber-300 font-bold text-xs uppercase tracking-widest mb-2">Anatomy of a 4-letter location indicator</h4>
        <div className="flex items-center gap-1.5 mb-3 font-mono">
          {[['T', 'East. Caribbean', '#f59e0b'], ['B', 'Barbados', '#38bdf8'], ['P', '', '#a3a3a3'], ['B', 'Grantley Adams', '#a3a3a3']].map(([ltr, lbl, col], i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="w-9 h-10 flex items-center justify-center border-2 rounded text-xl font-bold text-white"
                style={{ borderColor: col as string }}>{ltr}</span>
              {lbl && <span className="text-[9px] text-white/40 mt-1 text-center w-16 leading-tight">{lbl}</span>}
            </div>
          ))}
          <span className="text-white/40 text-sm ml-2">= TBPB</span>
        </div>
        <ul className="text-white/55 text-xs space-y-1 leading-relaxed list-disc pl-4">
          <li><b className="text-white/80">1st letter</b> — world routing area (T = Eastern Caribbean).</li>
          <li><b className="text-white/80">2nd letter</b> — State / territory (B = Barbados).</li>
          <li><b className="text-white/80">3rd &amp; 4th letters</b> — specific aerodrome / location (PB = Grantley Adams Int'l).</li>
          <li>Large States (K = USA, C = Canada) use only the 1st letter for the country — the last 3 letters identify the location, e.g. <span className="font-mono text-white/80">KMIA</span>, <span className="font-mono text-white/80">KJFK</span>.</li>
        </ul>
      </div>

      {/* AFTN address anatomy */}
      <div className="border border-sky-500/20 bg-sky-900/5 rounded-xl p-3">
        <h4 className="text-sky-300 font-bold text-xs uppercase tracking-widest mb-2">Anatomy of an 8-letter AFTN address</h4>
        <div className="flex items-center gap-1.5 mb-3 font-mono flex-wrap">
          {[['TBPB', 'Location indicator (where)', '#38bdf8'], ['ZQZ', 'Service / org (who)', '#f59e0b'], ['X', 'Filler', '#a3a3a3']].map(([grp, lbl, col], i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="px-2 h-10 flex items-center justify-center border-2 rounded text-lg font-bold text-white"
                style={{ borderColor: col as string }}>{grp}</span>
              <span className="text-[9px] text-white/40 mt-1 text-center w-24 leading-tight">{lbl}</span>
            </div>
          ))}
          <span className="text-white/40 text-sm ml-2">= TBPBZQZX</span>
        </div>
        <ul className="text-white/55 text-xs space-y-1 leading-relaxed list-disc pl-4">
          <li><b className="text-white/80">Letters 1–4</b> — the ICAO location indicator of the addressed station.</li>
          <li><b className="text-white/80">Letters 5–7</b> — a 3-letter designator (ICAO Doc 8585) for the service or organisation: e.g. <span className="font-mono text-white/80">ZQZ</span> = ATS Reporting Office (ARO), the addressee for filed flight plans. <span className="text-white/35">Z…</span> groups denote ATS units; <span className="text-white/35">Y…</span> groups denote State aeronautical authorities/services.</li>
          <li><b className="text-white/80">Letter 8</b> — a filler, normally <span className="font-mono text-white/80">X</span>, to complete the 8-letter group.</li>
          <li>Example flight-plan addressee at Grantley Adams: <span className="font-mono text-amber-300">TBPBZQZX</span>.</li>
        </ul>
      </div>

      {/* AFTN addressee directory */}
      <div className="border border-white/10 rounded-xl p-3">
        <h4 className="text-white/70 font-bold text-xs uppercase tracking-widest mb-1">AFTN FPL addressees — States served by AIS Barbados</h4>
        <p className="text-white/40 text-[11px] mb-3 leading-relaxed">
          8-letter addressees for filing flight plans to the ATS Reporting Office (ARO) of each neighbouring State.
          Barbados (<span className="font-mono text-amber-300/80">TBPBSELX</span>) is the home office and is never addressed to itself;
          the <span className="font-mono text-sky-300/80">TTZPZQZX</span> Piarco ACC is copied on every flight crossing the FIR.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AFTN_ADDRESSEES.map(grp => (
            <div key={grp.region}>
              <div className={`text-xs font-bold mb-1 ${grp.color}`}>{grp.region}</div>
              <div className="space-y-0.5">
                {grp.items.map(([c, d]) => (
                  <div key={c} className="flex gap-2 text-xs">
                    <span className="shrink-0 w-24 font-mono font-bold text-white/80">{c}</span>
                    <span className="text-white/55 leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {popout === 'doc7910' && (
        <ChartPopout title="ICAO Doc 7910 — routing-area index" onClose={() => setPopout(null)}>
          <PopoutImage
            src={doc7910Map}
            alt="ICAO Doc 7910 — Index to identifying letters assigned to aeronautical fixed service routing areas of States"
            caption="ICAO Doc 7910 — 1st-letter routing areas"
          />
        </ChartPopout>
      )}
      {popout === 'fir' && (
        <ChartPopout title="Caribbean / Central America FIR boundary chart" onClose={() => setPopout(null)}>
          <PopoutImage
            src={firChart}
            alt="Caribbean & Central America Flight Information Regions (FIR) boundary chart"
            caption="Caribbean / Central America FIR boundaries (Ops Group)"
          />
        </ChartPopout>
      )}
    </div>
  );
};
