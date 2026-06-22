import React, { useState } from 'react';
import adamsAreaChart from '@assets/AD_2-20_caribbean-1.png';
import { ChartPopout, PopoutImage } from './ChartPopout';

// ── Types & Data ──────────────────────────────────────────────────────────────
interface AD {
  icao: string; name: string; city: string; country: string;
  lat: number; lon: number; elev: number; rwy: string;
  ils: boolean; type: 'international' | 'domestic' | 'minor';
  fir: string; notes?: string;
}

const AERODROMES: AD[] = [
  // ── Eastern Caribbean ──
  { icao:'TBPB', name:"Grantley Adams Int'l",   city:'Bridgetown',    country:'Barbados',      lat:13.07, lon:-59.49, elev:169,  rwy:'09/27', ils:true,  type:'international', fir:'TTZP', notes:'Adams CTR/TMA/ATZ. Adams VOR BGI 13°04\'30"N 059°29\'02"W. Within Piarco FIR per Module 5.' },
  { icao:'TTPP', name:"Piarco Int'l",            city:'Port of Spain', country:'Trinidad',      lat:10.59, lon:-61.34, elev:58,   rwy:'10/28', ils:true,  type:'international', fir:'TTZP' },
  { icao:'TTCP', name:"Crown Point",             city:'Scarborough',   country:'Tobago',        lat:11.15, lon:-60.83, elev:38,   rwy:'10/28', ils:false, type:'domestic',      fir:'TTZP' },
  { icao:'TGPY', name:"Maurice Bishop Int'l",    city:"St George's",   country:'Grenada',       lat:12.00, lon:-61.79, elev:41,   rwy:'10/28', ils:true,  type:'international', fir:'TTZP' },
  { icao:'TLPL', name:"Hewanorra Int'l",         city:'Vieux Fort',    country:'St Lucia',      lat:13.73, lon:-60.95, elev:14,   rwy:'10/28', ils:true,  type:'international', fir:'TTZP', notes:'BNE VOR 13°44\'00"N 060°58\'37"W near here — centre of Adams TMA western 25NM arc.' },
  { icao:'TLPC', name:"George F.L. Charles",     city:'Castries',      country:'St Lucia',      lat:14.01, lon:-61.00, elev:22,   rwy:'10/28', ils:false, type:'domestic',      fir:'TTZP' },
  { icao:'TVSA', name:"Argyle Int'l",            city:'Kingstown',     country:'St Vincent',    lat:13.14, lon:-61.21, elev:74,   rwy:'09/27', ils:true,  type:'international', fir:'TTZP' },
  { icao:'TVSM', name:"J.F. Mitchell (Mustique)",city:'Mustique',      country:'St Vincent',    lat:12.88, lon:-61.18, elev:11,   rwy:'08/26', ils:false, type:'minor',         fir:'TTZP' },
  { icao:'TVSC', name:"Canouan",                 city:'Canouan',       country:'St Vincent',    lat:12.70, lon:-61.34, elev:11,   rwy:'16/34', ils:false, type:'minor',         fir:'TTZP' },
  { icao:'TAPA', name:"V.C. Bird Int'l",         city:"St John's",     country:'Antigua & Barbuda', lat:17.14, lon:-61.79, elev:62, rwy:'07/25', ils:true, type:'international', fir:'TTZP' },
  { icao:'TKPK', name:"Robert L. Bradshaw Int'l",city:'Basseterre',    country:'St Kitts',      lat:17.31, lon:-62.72, elev:170,  rwy:'07/25', ils:true,  type:'international', fir:'TTZP' },
  { icao:'TNCM', name:"Princess Juliana Int'l",  city:'Philipsburg',   country:'Sint Maarten',  lat:18.04, lon:-63.11, elev:13,   rwy:'09/27', ils:true,  type:'international', fir:'TTZP' },
  { icao:'TQPF', name:"Clayton J. Lloyd Int'l",  city:'The Valley',    country:'Anguilla',      lat:18.20, lon:-63.05, elev:127,  rwy:'10/28', ils:false, type:'domestic',      fir:'TTZP' },
  { icao:'TUPJ', name:"Terrance B Lettsome",     city:'Road Town',     country:'British VI',    lat:18.44, lon:-64.54, elev:15,   rwy:'07/25', ils:false, type:'domestic',      fir:'TJZS' },
  { icao:'TNCC', name:"Hato Int'l",              city:'Willemstad',    country:'Curaçao',       lat:12.19, lon:-68.96, elev:29,   rwy:'11/29', ils:true,  type:'international', fir:'TNCF' },
  { icao:'TNCO', name:"Flamingo",                city:'Kralendijk',    country:'Bonaire',       lat:12.21, lon:-68.27, elev:20,   rwy:'10/28', ils:false, type:'domestic',      fir:'TNCF' },
  // ── Wider Caribbean ──
  { icao:'TJSJ', name:"Luis Muñoz Marín Int'l",  city:'San Juan',      country:'Puerto Rico',   lat:18.44, lon:-65.99, elev:9,    rwy:'08/26', ils:true,  type:'international', fir:'TJZS' },
  { icao:'MDSD', name:"Las Americas Int'l",      city:'Santo Domingo', country:'Dominican Rep.', lat:18.43, lon:-69.67, elev:59, rwy:'17/35', ils:true,  type:'international', fir:'MDCS' },
  { icao:'MKJP', name:"Norman Manley Int'l",     city:'Kingston',      country:'Jamaica',       lat:17.94, lon:-76.79, elev:10,   rwy:'12/30', ils:true,  type:'international', fir:'MKZS' },
  { icao:'MYNN', name:"Lynden Pindling Int'l",   city:'Nassau',        country:'Bahamas',       lat:25.04, lon:-77.47, elev:16,   rwy:'15/33', ils:true,  type:'international', fir:'MYNA' },
  { icao:'KMIA', name:"Miami Int'l",             city:'Miami FL',      country:'USA',           lat:25.79, lon:-80.29, elev:8,    rwy:'08L/26R',ils:true, type:'international', fir:'KZMA', notes:'Nearest major US hub to TBPB.' },
  { icao:'SVMI', name:"Simón Bolívar Int'l",     city:'Caracas',       country:'Venezuela',     lat:10.60, lon:-66.99, elev:234,  rwy:'10/28', ils:true,  type:'international', fir:'SVZM' },
];

// Reporting fixes & ATS routes radiating from Adams VOR (BGI) — Barbados AIP AD 2-20.
// Each route is at 3000' within the Adams TMA; `dist` is DME from BGI; `bearing` is the outbound BGI radial (°M).
interface Waypoint {
  name: string; lat: number; lon: number;
  route: string; bearing: string; dist: number; leads: string;
}
const WAYPOINTS: Waypoint[] = [
  { name:'BIRNO', lat:14.365, lon:-60.211, route:'A632', bearing:'346°', dist:88, leads:'NW to Martinique (FOF) / Antigua (ANU VOR)' },
  { name:'BORUS', lat:14.046, lon:-60.466, route:'A555', bearing:'330°', dist:82, leads:'NW to Martinique — Fort de France (FOF)' },
  { name:'TEDDY', lat:13.734, lon:-60.549, route:'G642', bearing:'317°', dist:74, leads:'W to St Lucia — Hewanorra (BNE VOR)' },
  { name:'TIBOT', lat:13.563, lon:-60.586, route:'R750', bearing:'309°', dist:71, leads:'W to St Lucia / St Vincent' },
  { name:'DAMOV', lat:13.483, lon:-60.634, route:'—',    bearing:'—',    dist:0,  leads:'Reporting fix near the Piarco FIR boundary' },
  { name:'GOTER', lat:13.128, lon:-60.878, route:'A511 / A312', bearing:'287°', dist:82, leads:'W to St Vincent — Argyle (SV VOR)' },
  { name:'AMULA', lat:12.830, lon:-60.691, route:'R893', bearing:'273°', dist:72, leads:'SW to Canouan (CAI)' },
  { name:'RAKAN', lat:12.587, lon:-60.539, route:'A561', bearing:'260°', dist:68, leads:'SW to Grenada — Maurice Bishop (GND VOR)' },
  { name:'LOGAN', lat:12.138, lon:-60.143, route:'R515', bearing:'230°', dist:68, leads:'SW onward to TABEX / DALGA' },
  { name:'ERROL', lat:11.956, lon:-59.272, route:'A632', bearing:'184°', dist:68, leads:'S to Trinidad (Piarco) — onward EGEMA' },
  { name:'KELSO', lat:12.217, lon:-58.722, route:'A555', bearing:'154°', dist:68, leads:'SE to CYR VOR (oceanic)' },
];

const typeColor = (t: AD['type']) => t === 'international' ? '#60a5fa' : t === 'domestic' ? '#94a3b8' : '#475569';

// ── Component ─────────────────────────────────────────────────────────────────
export const MapTab: React.FC = () => {
  const [selected, setSelected] = useState<AD | null>(null);
  const [filter, setFilter]     = useState<'all' | 'int'>('all');
  const [search, setSearch]     = useState('');
  const [chartCollapsed, setChartCollapsed] = useState(false);
  const [chartPopout, setChartPopout] = useState(false);

  const visible = AERODROMES.filter(a =>
    (filter === 'all' || a.type === 'international') &&
    (!search || a.icao.includes(search.toUpperCase()) || a.name.toLowerCase().includes(search.toLowerCase()) || a.country.toLowerCase().includes(search.toLowerCase()))
  );

  const btnCls = (active: boolean) =>
    `px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
      active ? 'border-sky-400 bg-sky-900/40 text-sky-300' : 'border-white/10 bg-black/20 text-white/40 hover:text-white/70'
    }`;

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="border border-sky-500/20 bg-sky-900/10 rounded-xl p-3">
        <h3 className="text-sky-300 font-bold text-sm">Grantley Adams Int'l TMA — Area Chart</h3>
        <p className="text-white/50 text-xs mt-1 leading-relaxed">
          Official Barbados AIP <span className="text-sky-300 font-semibold">Area Chart AD 2-20</span> (ICAO) for the Grantley Adams Int'l TMA.
          Shows the Adams VOR (BGI 112.7), reporting fixes, ATS routes, neighbouring VOR/NDB/DME and the TMA / CTR boundaries.
        </p>
      </div>

      {/* Official AIP area chart — pinned to the top so it stays visible while searching the directory below */}
      <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-1.5 bg-slate-900">
        <div className="border border-white/10 rounded-xl overflow-hidden bg-white shadow-lg shadow-black/40">
          <div className="px-3 py-2 bg-slate-900 border-b border-white/10 flex items-center gap-2">
            <button
              style={{ touchAction: 'manipulation' }}
              onClick={() => setChartCollapsed(c => !c)}
              aria-expanded={!chartCollapsed}
              title={chartCollapsed ? 'Show the chart' : 'Hide the chart to free up space'}
              className="flex items-center gap-1.5 text-white/60 hover:text-white font-bold text-xs transition-colors"
            >
              <span className="text-[9px] text-white/40">{chartCollapsed ? '▸' : '▾'}</span>
              Area chart AD 2-20
            </button>
            <button
              style={{ touchAction: 'manipulation' }}
              onClick={() => setChartPopout(true)}
              title="Open the chart full-screen"
              className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/15 bg-black/30 text-white/60 hover:text-white text-[10px] font-bold transition-colors"
            >
              <span aria-hidden="true">⛶</span> Full screen
            </button>
            <span className="text-white/30 text-[10px] hidden sm:block">
              {chartCollapsed ? 'Chart hidden — tap to show' : 'TMA: 3000′–FL85 (Class D), FL85–FL245 (Class A).'}
            </span>
          </div>
          {!chartCollapsed && (
            <>
              <img
                src={adamsAreaChart}
                alt="Barbados AIP Area Chart AD 2-20 — Grantley Adams Int'l TMA (ICAO)"
                className="w-full block"
                style={{ maxHeight: 'min(38vh, 440px)', objectFit: 'contain' }}
              />
              <div className="px-3 py-1.5 bg-slate-900 text-[10px] text-white/40">
                Barbados AIP — Area Chart AD 2-20, Grantley Adams Int'l TMA.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Aerodrome directory */}
      <div className="border border-white/10 rounded-xl p-3">
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <h4 className="text-white/70 font-bold text-xs uppercase tracking-widest mr-1">Aerodrome directory</h4>
          <input
            className="bg-black/30 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs focus:border-sky-400 outline-none placeholder-white/30 w-36"
            placeholder="Search ICAO / name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button style={{touchAction:'manipulation'}} onClick={() => setFilter('all')} className={btnCls(filter==='all')}>All</button>
          <button style={{touchAction:'manipulation'}} onClick={() => setFilter('int')} className={btnCls(filter==='int')}>Intl only</button>
          <span className="text-white/25 text-xs ml-auto">Tap an aerodrome for details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {visible.map(ad => {
            const sel = selected?.icao === ad.icao;
            return (
              <button
                key={ad.icao}
                style={{touchAction:'manipulation'}}
                onClick={() => setSelected(sel ? null : ad)}
                className={`flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg border transition-colors ${
                  sel ? 'border-sky-400 bg-sky-900/30' : 'border-white/10 bg-black/20 hover:bg-white/5'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0 border" style={{ background: typeColor(ad.type), borderColor: ad.ils ? '#fff8' : 'transparent' }} />
                <span className="font-mono font-bold text-sm text-white/90 w-12 shrink-0">{ad.icao}</span>
                <span className="text-white/55 text-xs truncate">{ad.city}, {ad.country}</span>
              </button>
            );
          })}
          {visible.length === 0 && <div className="text-white/30 text-xs py-2">No aerodromes match “{search}”.</div>}
        </div>
      </div>

      {/* Info panel */}
      {selected && (
        <div className="border border-sky-500/30 bg-sky-900/10 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xl text-sky-300">{selected.icao}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                  selected.type === 'international' ? 'bg-blue-500/20 text-blue-300' :
                  selected.type === 'domestic' ? 'bg-slate-500/20 text-slate-300' :
                  'bg-slate-700/30 text-slate-400'
                }`}>{selected.type}</span>
                {selected.ils && <span className="text-xs bg-green-900/30 text-green-400 border border-green-500/30 px-2 py-0.5 rounded">ILS</span>}
              </div>
              <div className="text-white text-sm font-semibold mt-0.5">{selected.name}</div>
              <div className="text-white/50 text-xs">{selected.city}, {selected.country}</div>
            </div>
            <button style={{touchAction:'manipulation'}} onClick={() => setSelected(null)} className="text-white/30 hover:text-white text-lg shrink-0">×</button>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mt-3">
            <div><span className="text-white/30">FIR: </span><span className="text-white/70 font-mono">{selected.fir}</span></div>
            <div><span className="text-white/30">Elev: </span><span className="text-white/70">{selected.elev} ft</span></div>
            <div><span className="text-white/30">RWY: </span><span className="text-white/70 font-mono">{selected.rwy}</span></div>
            <div><span className="text-white/30">Coord: </span><span className="text-white/70 font-mono">{Math.abs(selected.lat).toFixed(2)}{selected.lat>=0?'N':'S'} {Math.abs(selected.lon).toFixed(2)}{selected.lon<0?'W':'E'}</span></div>
          </div>
          {selected.notes && <p className="text-white/40 text-xs mt-2 border-t border-white/10 pt-2">{selected.notes}</p>}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-white/40 border-t border-white/10 pt-2">
        <span className="font-semibold text-white/30 uppercase tracking-widest text-[10px]">Directory legend</span>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block shrink-0" />International</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block shrink-0" />Domestic</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-600 inline-block shrink-0" />Minor / GA</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-500 border border-white/50 inline-block shrink-0" />White ring = ILS</div>
      </div>

      {/* Adams TMA route reference (AD 2-20) */}
      <div className="border border-orange-500/20 bg-orange-900/5 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-orange-300 font-bold text-sm">Grantley Adams TMA — ATS Routes</span>
          <span className="text-white/30 text-[10px]">Barbados AIP AD 2-20 · all radials from Adams VOR (BGI 112.7) · 3000′</span>
        </div>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead><tr className="text-white/30 uppercase tracking-widest border-b border-white/10">
              <th className="text-left py-1.5 pr-3 font-normal">Route</th>
              <th className="text-left py-1.5 pr-3 font-normal">Fix</th>
              <th className="text-left py-1.5 pr-3 font-normal">Coordinates</th>
              <th className="text-left py-1.5 pr-3 font-normal">Radial / DME</th>
              <th className="text-left py-1.5 font-normal">Leads to</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {WAYPOINTS.map(w => (
                <tr key={w.name} className="hover:bg-white/3">
                  <td className="py-1.5 pr-3 font-mono font-bold text-orange-300">{w.route}</td>
                  <td className="py-1.5 pr-3 font-mono font-bold text-amber-300">{w.name}</td>
                  <td className="py-1.5 pr-3 text-white/40 font-mono text-[10px]">
                    {Math.abs(w.lat).toFixed(3)}°N {Math.abs(w.lon).toFixed(3)}°W
                  </td>
                  <td className="py-1.5 pr-3 text-white/50 font-mono text-[10px]">{w.bearing}{w.dist ? ` / ${w.dist}` : ''}</td>
                  <td className="py-1.5 text-white/50 text-[10px]">{w.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-white/25 text-[10px] mt-2">Source: Barbados AIP Area Chart AD 2-20 (Grantley Adams Int'l TMA). TMA: 3000′–FL85 (Class D), FL85–FL245 (Class A). For training use only.</p>
      </div>

      {chartPopout && (
        <ChartPopout title="Area chart AD 2-20 — Grantley Adams Int'l TMA" onClose={() => setChartPopout(false)}>
          <PopoutImage
            src={adamsAreaChart}
            alt="Barbados AIP Area Chart AD 2-20 — Grantley Adams Int'l TMA (ICAO)"
            caption="Barbados AIP — Area Chart AD 2-20"
          />
        </ChartPopout>
      )}
    </div>
  );
};
