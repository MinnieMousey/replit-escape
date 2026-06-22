import React from 'react';

// ── Wake Turbulence Categories (ICAO Doc 8643 / PANS-ATM Doc 4444) ─────────────
export const WTC_CATS: { code: string; label: string; rule: string; note: string; color: string }[] = [
  { code: 'J', label: 'SUPER', rule: 'Specifically the Airbus A380-800 (and the Antonov An-225).',
    note: 'Generates the most powerful wake. Largest separation behind it.', color: 'text-fuchsia-300' },
  { code: 'H', label: 'HEAVY', rule: 'MTOW of 136 000 kg (300 000 lb) or more.',
    note: 'Wide-bodies — B777, B787, A330, A350, B767, MD-11F.', color: 'text-red-300' },
  { code: 'M', label: 'MEDIUM', rule: 'MTOW more than 7 000 kg but less than 136 000 kg.',
    note: 'Narrow-bodies & regionals — A320 family, B737, A220, ATR, Dash-8, E-Jets.', color: 'text-amber-300' },
  { code: 'L', label: 'LIGHT', rule: 'MTOW of 7 000 kg (15 500 lb) or less.',
    note: 'Light twins & singles — Twin Otter, Caravan, King Air, GA aircraft.', color: 'text-emerald-300' },
];

// Wake-turbulence radar separation minima (leader → follower), PANS-ATM Doc 4444.
export const WTC_SEP: { lead: string; follow: string; sep: string }[] = [
  { lead: 'SUPER (A380)', follow: 'Heavy', sep: '6 NM' },
  { lead: 'SUPER (A380)', follow: 'Medium', sep: '7 NM' },
  { lead: 'SUPER (A380)', follow: 'Light', sep: '8 NM' },
  { lead: 'Heavy', follow: 'Heavy', sep: '4 NM' },
  { lead: 'Heavy', follow: 'Medium', sep: '5 NM' },
  { lead: 'Heavy', follow: 'Light', sep: '6 NM' },
  { lead: 'Medium', follow: 'Light', sep: '5 NM' },
];

// ── ICAO type designators (Doc 8643) for traffic regularly seen in the TBPB TMA ──
export interface AcftType { icao: string; name: string; wtc: 'J' | 'H' | 'M' | 'L'; mtow: string; role: string; }

export const ACFT_TYPES: { group: string; color: string; items: AcftType[] }[] = [
  { group: 'Wide-body — transatlantic & long-haul (HEAVY)', color: 'text-red-300', items: [
    { icao: 'B77W', name: 'Boeing 777-300ER', wtc: 'H', mtow: '351 t', role: 'BA from LGW/LHR' },
    { icao: 'B772', name: 'Boeing 777-200ER', wtc: 'H', mtow: '298 t', role: 'Long-haul' },
    { icao: 'B788', name: 'Boeing 787-8 Dreamliner', wtc: 'H', mtow: '228 t', role: 'BA, Air Canada, TUI' },
    { icao: 'B789', name: 'Boeing 787-9 Dreamliner', wtc: 'H', mtow: '254 t', role: 'BA, Virgin, WestJet' },
    { icao: 'A359', name: 'Airbus A350-900', wtc: 'H', mtow: '280 t', role: 'BA, Virgin Atlantic' },
    { icao: 'A332', name: 'Airbus A330-200', wtc: 'H', mtow: '242 t', role: 'Condor, leisure' },
    { icao: 'A333', name: 'Airbus A330-300', wtc: 'H', mtow: '242 t', role: 'Air Canada, Virgin' },
    { icao: 'A339', name: 'Airbus A330-900neo', wtc: 'H', mtow: '251 t', role: 'Condor' },
    { icao: 'B763', name: 'Boeing 767-300', wtc: 'H', mtow: '187 t', role: 'Leisure & cargo (F)' },
  ]},
  { group: 'Narrow-body — Americas & charters (MEDIUM)', color: 'text-amber-300', items: [
    { icao: 'B752', name: 'Boeing 757-200', wtc: 'M', mtow: '116 t', role: 'Strong wake — treat with care' },
    { icao: 'A321', name: 'Airbus A321 / A321neo (A21N)', wtc: 'M', mtow: '93 t', role: 'American, JetBlue, Air Canada' },
    { icao: 'A320', name: 'Airbus A320 / A320neo (A20N)', wtc: 'M', mtow: '78 t', role: 'American, JetBlue' },
    { icao: 'A319', name: 'Airbus A319', wtc: 'M', mtow: '75 t', role: 'American, Air Canada' },
    { icao: 'B738', name: 'Boeing 737-800', wtc: 'M', mtow: '79 t', role: 'Caribbean Airlines, TUI, charters' },
    { icao: 'B38M', name: 'Boeing 737 MAX 8', wtc: 'M', mtow: '82 t', role: 'WestJet, Caribbean Airlines' },
    { icao: 'BCS3', name: 'Airbus A220-300', wtc: 'M', mtow: '70 t', role: 'JetBlue, Air Canada' },
  ]},
  { group: 'Regional & inter-island (MEDIUM)', color: 'text-sky-300', items: [
    { icao: 'AT76', name: 'ATR 72-600', wtc: 'M', mtow: '23 t', role: 'Caribbean Airlines, interCaribbean' },
    { icao: 'AT72', name: 'ATR 72', wtc: 'M', mtow: '22 t', role: 'Regional turboprop' },
    { icao: 'AT46', name: 'ATR 42-600', wtc: 'M', mtow: '18 t', role: 'interCaribbean' },
    { icao: 'DH8D', name: 'De Havilland Dash 8 Q400', wtc: 'M', mtow: '30 t', role: 'Regional turboprop' },
    { icao: 'E145', name: 'Embraer ERJ-145', wtc: 'M', mtow: '22 t', role: 'interCaribbean jet' },
    { icao: 'E190', name: 'Embraer E190', wtc: 'M', mtow: '52 t', role: 'Regional jet' },
  ]},
  { group: 'Light — air taxi, GA & utility (LIGHT)', color: 'text-emerald-300', items: [
    { icao: 'DHC6', name: 'DHC-6 Twin Otter', wtc: 'L', mtow: '5.7 t', role: 'Inter-island commuter' },
    { icao: 'C208', name: 'Cessna 208 Caravan', wtc: 'L', mtow: '3.6 t', role: 'Air taxi / cargo' },
    { icao: 'BE20', name: 'Beechcraft King Air 200', wtc: 'L', mtow: '5.7 t', role: 'Charter / medevac' },
    { icao: 'BE9L', name: 'Beechcraft King Air C90', wtc: 'L', mtow: '4.6 t', role: 'Light twin turboprop' },
    { icao: 'C68A', name: 'Cessna Citation Latitude', wtc: 'M', mtow: '13.6 t', role: 'Business jet — Medium (>7 t MTOW)' },
  ]},
  { group: 'Super (J) — rare / diversion', color: 'text-fuchsia-300', items: [
    { icao: 'A388', name: 'Airbus A380-800', wtc: 'J', mtow: '575 t', role: 'Only Super in service; charter / diversion' },
  ]},
];

// ── Airlines regularly serving / overflying TBPB (Grantley Adams, Barbados) ─────
// Liveries described in words only (colours & markings) — no logo artwork reproduced.
export interface Airline {
  name: string; icao: string; callsign: string; base: string;
  livery: string; fleet: string; pattern: string;
  /** Flag state / country of the operator. */
  country: string;
  /** Key cities served to/from Barbados (TBPB). */
  destinations: string;
  /** Typical routing/corridor & wider regional network reached. */
  routes: string;
}

export const AIRLINES: { group: string; color: string; items: Airline[] }[] = [
  { group: 'Long-haul / transatlantic', color: 'text-red-300', items: [
    { name: 'British Airways', icao: 'BAW', callsign: 'SPEEDBIRD', base: 'London LHR / LGW',
      country: 'United Kingdom',
      destinations: 'London Gatwick (LGW) ↔ Bridgetown (TBPB); some services tag on to other Eastern-Caribbean islands.',
      routes: 'North Atlantic organised tracks, then southbound oceanic via the New York (KZWY) and San Juan oceanic airspace into the Piarco FIR from the north.',
      livery: 'White upper fuselage, dark "Oxford blue" lower fuselage; tailfin carries a red, white & blue ribbon-style flag (the "Speedmarque"). Navy "BRITISH AIRWAYS" titles.',
      fleet: 'B77W · B788/B789 · A350', pattern: 'Daily inbound from the UK' },
    { name: 'Virgin Atlantic', icao: 'VIR', callsign: 'VIRGIN', base: 'London LHR / Manchester',
      country: 'United Kingdom',
      destinations: 'London Heathrow & Manchester ↔ Bridgetown; seasonal Eastern-Caribbean leisure markets.',
      routes: 'Transatlantic via the NAT track system, descending through the San Juan / New York oceanic sectors toward the TBPB TMA.',
      livery: 'Glossy red tailfin and engines, white fuselage with a red cheatline; silver "virgin atlantic" script. Bold red/silver identity.',
      fleet: 'A330 · A350 · B789', pattern: 'Daily / seasonal from the UK' },
    { name: 'Condor', icao: 'CFG', callsign: 'CONDOR', base: 'Frankfurt',
      country: 'Germany',
      destinations: 'Frankfurt (FRA) ↔ Bridgetown, seasonal winter leisure.',
      routes: 'Long mid-Atlantic crossing from Europe; enters the region from the north-east via oceanic airways into Piarco-FIR airspace.',
      livery: 'Distinctive multi-colour candy "stripes" scheme — broad vertical bands (sand, blue, green, yellow, red variants) running the full height of the aircraft.',
      fleet: 'A330-900 (A339) · A332', pattern: 'Seasonal leisure from Germany' },
    { name: 'TUI Airways', icao: 'TOM', callsign: 'TOMJET', base: 'UK regional bases',
      country: 'United Kingdom',
      destinations: 'UK regional airports (Gatwick, Manchester, Birmingham) ↔ Bridgetown; multi-island Caribbean leisure programme.',
      routes: 'Seasonal transatlantic charters routing via the NAT system and the oceanic approaches from the north.',
      livery: 'White fuselage with a red wave/"smile" swoosh along the lower side; deep-blue tailfin with red "TUI" wordmark.',
      fleet: 'B788 · B738', pattern: 'Seasonal leisure charters' },
  ]},
  { group: 'North America', color: 'text-sky-300', items: [
    { name: 'American Airlines', icao: 'AAL', callsign: 'AMERICAN', base: 'Miami / Charlotte',
      country: 'United States',
      destinations: 'Miami (MIA) & Charlotte (CLT) ↔ Bridgetown; connects the wider US domestic network.',
      routes: 'Southbound from the US east coast through the San Juan FIR and Eastern-Caribbean upper airways into the TBPB TMA.',
      livery: 'Bare polished "mica" silver fuselage; tailfin split red/white/blue (the "flight symbol"). Grey "American" titles.',
      fleet: 'A319 · A320 · A321 · B738', pattern: 'Daily from US hubs' },
    { name: 'JetBlue', icao: 'JBU', callsign: 'JETBLUE', base: 'New York JFK / Boston',
      country: 'United States',
      destinations: 'New York JFK & Boston (BOS) ↔ Bridgetown.',
      routes: 'US north-east down the western Atlantic via the New York and San Juan oceanic sectors, then the Eastern-Caribbean airway chain.',
      livery: 'White fuselage, navy "jetBlue" titles; tailfins each wear a different blue geometric pattern (stripes, dots, mosaic).',
      fleet: 'A320 · A321 · A220 (BCS3)', pattern: 'Daily from the US north-east' },
    { name: 'Air Canada', icao: 'ACA', callsign: 'AIR CANADA', base: 'Toronto / Montreal',
      country: 'Canada',
      destinations: 'Toronto (YYZ) & Montreal (YUL) ↔ Bridgetown.',
      routes: 'Long western-Atlantic descent from eastern Canada via the New York / San Juan oceanic airspace into Piarco-FIR.',
      livery: 'White fuselage, black "Air Canada" titles; tailfin is black with a red circle "rondelle" enclosing a white maple leaf.',
      fleet: 'B789 · A333 · A321', pattern: 'Daily / seasonal from Canada' },
    { name: 'WestJet', icao: 'WJA', callsign: 'WESTJET', base: 'Toronto / Calgary',
      country: 'Canada',
      destinations: 'Toronto (YYZ) ↔ Bridgetown, seasonal winter sun.',
      routes: 'Seasonal from central/eastern Canada down the western Atlantic corridor into the Eastern-Caribbean network.',
      livery: 'White fuselage with a dark teal/navy belly sweeping up at the rear; teal tailfin with a white maple-leaf motif.',
      fleet: 'B738 · B38M · B789', pattern: 'Seasonal from Canada' },
  ]},
  { group: 'Caribbean & inter-island', color: 'text-amber-300', items: [
    { name: 'Caribbean Airlines', icao: 'BWA', callsign: 'CARIBBEAN', base: 'Trinidad (Piarco)',
      country: 'Trinidad & Tobago',
      destinations: 'Port of Spain (TTPP) & Tobago ↔ Bridgetown; onward feed to Georgetown, Kingston, Miami, New York & Toronto.',
      routes: 'Short Piarco-hub legs over the southern Eastern-Caribbean airways (e.g. via the BGI / Piarco low-level network) plus longer regional/US trunk routes.',
      livery: 'White fuselage; tailfin features a stylised hummingbird in green, with red/yellow/black accents. "Caribbean" titles.',
      fleet: 'B738 · B38M · AT76', pattern: 'Multiple daily — regional hub feed' },
    { name: 'interCaribbean Airways', icao: 'IWY', callsign: 'ISLANDWAYS', base: 'Turks & Caicos',
      country: 'Turks & Caicos Islands',
      destinations: 'Eastern-Caribbean islands — St Lucia, St Vincent, Grenada, Dominica, Antigua, Tortola ↔ Bridgetown.',
      routes: 'Dense inter-island turboprop/regional-jet network at lower levels across the Piarco and adjacent FIRs.',
      livery: 'White fuselage with turquoise/teal and warm-orange accents; teal tailfin.',
      fleet: 'AT76 · AT46 · E145', pattern: 'Inter-island regional network' },
    { name: 'LIAT (2020) / regional', icao: 'LIA', callsign: 'LIAT', base: 'Antigua',
      country: 'Antigua & Barbuda',
      destinations: 'Antigua, St Lucia, St Vincent, Grenada, Dominica & other Leeward/Windward islands ↔ Bridgetown.',
      routes: 'Classic Eastern-Caribbean island-hopping over the low-level airway network between the Lesser-Antilles aerodromes.',
      livery: 'White fuselage with dark-blue and pale-blue cheatlines; blue tailfin (regional Eastern-Caribbean carrier).',
      fleet: 'AT42 · AT72 · DH8', pattern: 'Eastern-Caribbean island hops' },
  ]},
  { group: 'Cargo & overflights', color: 'text-violet-300', items: [
    { name: 'Amerijet International', icao: 'AJT', callsign: 'AMERIJET', base: 'Miami',
      country: 'United States',
      destinations: 'Miami (MIA) ↔ Bridgetown freight, with onward Eastern-Caribbean & South-American cargo feed.',
      routes: 'Scheduled cargo down the San Juan / Eastern-Caribbean corridor into TBPB.',
      livery: 'White fuselage with red/blue cheatlines; freighter (B763F).',
      fleet: 'B763F', pattern: 'Scheduled cargo' },
    { name: 'En-route overflights', icao: '—', callsign: '—', base: 'N. America ⇄ S. America / Brazil',
      country: 'Various flag states',
      destinations: 'No TBPB landing — North-America/Europe ⇄ South-America (e.g. Brazil, the Guianas, Suriname).',
      routes: 'Cruise through the Piarco FIR and its oceanic boundaries on the long north–south oceanic airways without descending into the TMA.',
      livery: 'Many carriers transit the TBPB/Piarco area at cruise without landing — e.g. US, Brazilian and European flag carriers routing via oceanic airways.',
      fleet: 'Mixed wide-body', pattern: 'Overflying — no TBPB landing' },
  ]},
];

const WtcBadge: React.FC<{ w: string }> = ({ w }) => {
  const map: Record<string, string> = {
    J: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30',
    H: 'bg-red-500/20 text-red-300 border-red-400/30',
    M: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    L: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  };
  return (
    <span className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md border text-[11px] font-mono font-bold ${map[w] || 'bg-white/10 text-white/50 border-white/20'}`}>
      {w}
    </span>
  );
};

export const AircraftTab: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="border border-sky-500/20 bg-sky-900/10 rounded-xl p-3">
        <h3 className="text-sky-300 font-bold text-sm">Aircraft Types, Weight &amp; Wake Turbulence</h3>
        <p className="text-white/50 text-xs mt-1 leading-relaxed">
          ICAO Doc 8643 type designators, maximum take-off weight (MTOW) and Wake Turbulence Category (WTC)
          for traffic regularly arriving at, departing from, or overflying the Barbados (TBPB) TMA, plus the
          airlines that operate them. Liveries are described for visual recognition only.
        </p>
      </div>

      {/* WTC categories */}
      <div className="border border-white/10 rounded-xl p-3">
        <h4 className="text-white font-bold text-sm mb-2">Wake Turbulence Categories (WTC)</h4>
        <div className="space-y-2">
          {WTC_CATS.map(c => (
            <div key={c.code} className="flex gap-3 items-start">
              <WtcBadge w={c.code} />
              <div className="min-w-0">
                <span className={`font-mono font-bold text-sm ${c.color}`}>{c.label}</span>
                <span className="text-white/70 text-sm"> — {c.rule}</span>
                <span className="block text-white/40 text-xs mt-0.5">{c.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Separation minima */}
      <div className="border border-white/10 rounded-xl p-3">
        <h4 className="text-white font-bold text-sm mb-2">Radar wake-separation minima (PANS-ATM)</h4>
        <p className="text-white/40 text-xs mb-2 leading-relaxed">
          Minimum distance the <span className="text-white/70">following</span> aircraft must stay behind the
          <span className="text-white/70"> leading</span> aircraft on the same track.
        </p>
        <table className="w-full text-left">
          <thead>
            <tr className="text-white/30 text-[10px] uppercase tracking-wider">
              <th className="py-1 pr-2">Leader</th>
              <th className="py-1 pr-2">Follower</th>
              <th className="py-1">Min sep</th>
            </tr>
          </thead>
          <tbody>
            {WTC_SEP.map((s, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="py-1.5 pr-2 text-white/70 text-xs">{s.lead}</td>
                <td className="py-1.5 pr-2 text-white/70 text-xs">{s.follow}</td>
                <td className="py-1.5 text-sky-300 font-mono font-bold text-xs">{s.sep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Aircraft types */}
      {ACFT_TYPES.map(grp => (
        <div key={grp.group} className="border border-white/10 rounded-xl p-3">
          <h4 className={`font-bold text-sm mb-2 ${grp.color}`}>{grp.group}</h4>
          <div className="space-y-1">
            {grp.items.map(t => (
              <div key={t.icao} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0 items-start">
                <span className="shrink-0 w-14 font-mono font-bold text-sm text-white">{t.icao}</span>
                <WtcBadge w={t.wtc} />
                <span className="flex-1 min-w-0">
                  <span className="text-white/80 text-sm">{t.name}</span>
                  <span className="block text-white/40 text-xs mt-0.5">
                    MTOW ≈ {t.mtow} · {t.role}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Airlines */}
      <div className="border border-amber-500/20 bg-amber-900/5 rounded-xl p-3">
        <h3 className="text-amber-300 font-bold text-sm">Airlines &amp; Liveries serving TBPB</h3>
        <p className="text-white/40 text-xs mt-1">Telephony callsign · operator (ICAO code) · typical fleet · visual recognition.</p>
      </div>
      {AIRLINES.map(grp => (
        <div key={grp.group} className="border border-white/10 rounded-xl p-3">
          <h4 className={`font-bold text-sm mb-2 ${grp.color}`}>{grp.group}</h4>
          <div className="space-y-3">
            {grp.items.map(a => (
              <div key={a.name} className="border-b border-white/5 last:border-0 pb-3 last:pb-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm">{a.name}</span>
                  <span className="font-mono text-xs text-sky-300">{a.icao}</span>
                  <span className="font-mono text-[11px] text-white/40">“{a.callsign}”</span>
                </div>
                <p className="text-white/60 text-xs mt-1 leading-relaxed">{a.livery}</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    <span className="text-white/30 uppercase tracking-wider">Destinations</span> {a.destinations}
                  </p>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    <span className="text-white/30 uppercase tracking-wider">Routes</span> {a.routes}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                  <span className="text-[11px] text-white/40">
                    <span className="text-white/30 uppercase tracking-wider">Country</span> {a.country}
                  </span>
                  <span className="text-[11px] text-white/40">
                    <span className="text-white/30 uppercase tracking-wider">Fleet</span>{' '}
                    <span className="font-mono text-emerald-300">{a.fleet}</span>
                  </span>
                  <span className="text-[11px] text-white/40">
                    <span className="text-white/30 uppercase tracking-wider">Base</span> {a.base}
                  </span>
                  <span className="text-[11px] text-white/40">
                    <span className="text-white/30 uppercase tracking-wider">Pattern</span> {a.pattern}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-white/20 text-[10px]">
        * Designators, weights and schedules illustrative for training. Carriers, fleets and routes change —
        verify current operators, the live AIP and active NOTAMs for operational use.
      </p>
    </div>
  );
};
