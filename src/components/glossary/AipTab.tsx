import React, { useState } from 'react';

// ── AIP structure (ICAO Annex 15 / Doc 8126) ────────────────────────────────────
interface AipSection { code: string; title: string; subs?: [string, string][]; }
interface AipPart { id: string; abbr: string; name: string; color: string; intro: string; sections: AipSection[]; }

const AIP_PARTS: AipPart[] = [
  {
    id: 'gen', abbr: 'GEN', name: 'Part 1 — General (GEN)', color: 'text-sky-400',
    intro: 'Administrative and explanatory information about the State, its AIS, and how to use the AIP.',
    sections: [
      { code: 'GEN 0', title: 'Preface / Record of amendments & supplements / Checklist of pages / Table of contents to Part 1' },
      { code: 'GEN 1', title: 'National regulations and requirements', subs: [
        ['GEN 1.1', 'Designated authorities'],
        ['GEN 1.2', 'Entry, transit and departure of aircraft'],
        ['GEN 1.3', 'Entry, transit and departure of passengers and crew'],
        ['GEN 1.4', 'Entry, transit and departure of cargo'],
        ['GEN 1.5', 'Aircraft instruments, equipment and flight documents'],
        ['GEN 1.6', 'Summary of national regulations and international agreements/conventions'],
        ['GEN 1.7', 'Differences from ICAO Standards, Recommended Practices and Procedures'],
      ]},
      { code: 'GEN 2', title: 'Tables and codes', subs: [
        ['GEN 2.1', 'Measuring system, aircraft markings, holidays'],
        ['GEN 2.2', 'Abbreviations used in AIS publications'],
        ['GEN 2.3', 'Chart symbols'],
        ['GEN 2.4', 'Location indicators'],
        ['GEN 2.5', 'List of radio navigation aids'],
        ['GEN 2.6', 'Conversion of units of measurement'],
        ['GEN 2.7', 'Sunrise / sunset tables'],
      ]},
      { code: 'GEN 3', title: 'Services', subs: [
        ['GEN 3.1', 'Aeronautical information services'],
        ['GEN 3.2', 'Aeronautical charts'],
        ['GEN 3.3', 'Air traffic services'],
        ['GEN 3.4', 'Communication services'],
        ['GEN 3.5', 'Meteorological services'],
        ['GEN 3.6', 'Search and rescue'],
      ]},
      { code: 'GEN 4', title: 'Charges for aerodromes/heliports and air navigation services', subs: [
        ['GEN 4.1', 'Aerodrome / heliport charges'],
        ['GEN 4.2', 'Air navigation services charges'],
      ]},
    ],
  },
  {
    id: 'enr', abbr: 'ENR', name: 'Part 2 — En-route (ENR)', color: 'text-amber-400',
    intro: 'Information for the en-route phase of flight: rules, airspace, ATS routes, navaids and warnings.',
    sections: [
      { code: 'ENR 0', title: 'Preface / Record of amendments & supplements / Checklist / Table of contents to Part 2' },
      { code: 'ENR 1', title: 'General rules and procedures', subs: [
        ['ENR 1.1', 'General rules'],
        ['ENR 1.2', 'Visual flight rules (VFR)'],
        ['ENR 1.3', 'Instrument flight rules (IFR)'],
        ['ENR 1.4', 'ATS airspace classification'],
        ['ENR 1.5', 'Holding, approach and departure procedures'],
        ['ENR 1.6', 'ATS surveillance services and procedures'],
        ['ENR 1.7', 'Altimeter setting procedures'],
        ['ENR 1.8', 'Regional supplementary procedures'],
        ['ENR 1.9', 'Air traffic flow management (ATFM)'],
        ['ENR 1.10', 'Flight planning'],
        ['ENR 1.11', 'Addressing of flight plan messages'],
        ['ENR 1.12', 'Interception of civil aircraft'],
        ['ENR 1.13', 'Unlawful interference'],
        ['ENR 1.14', 'Air traffic incidents'],
      ]},
      { code: 'ENR 2', title: 'Air traffic services airspace', subs: [
        ['ENR 2.1', 'FIR, UIR, TMA and CTA'],
        ['ENR 2.2', 'Other regulated airspace'],
      ]},
      { code: 'ENR 3', title: 'ATS routes', subs: [
        ['ENR 3.1', 'Lower ATS routes'],
        ['ENR 3.2', 'Upper ATS routes'],
        ['ENR 3.3', 'Area navigation (RNAV) routes'],
        ['ENR 3.4', 'Helicopter routes'],
        ['ENR 3.5', 'Other routes'],
        ['ENR 3.6', 'En-route holding'],
      ]},
      { code: 'ENR 4', title: 'Radio navigation aids / systems', subs: [
        ['ENR 4.1', 'Radio navigation aids — en-route'],
        ['ENR 4.2', 'Special navigation systems'],
        ['ENR 4.3', 'Global navigation satellite system (GNSS)'],
        ['ENR 4.4', 'Name-code designators for significant points'],
        ['ENR 4.5', 'Aeronautical ground lights — en-route'],
      ]},
      { code: 'ENR 5', title: 'Navigation warnings', subs: [
        ['ENR 5.1', 'Prohibited, restricted and danger areas'],
        ['ENR 5.2', 'Military exercise and training areas'],
        ['ENR 5.3', 'Other activities of a dangerous nature'],
        ['ENR 5.4', 'Air navigation obstacles — en-route'],
        ['ENR 5.5', 'Aerial sporting and recreational activities'],
        ['ENR 5.6', 'Bird migration and areas with sensitive fauna'],
      ]},
      { code: 'ENR 6', title: 'En-route charts' },
    ],
  },
  {
    id: 'ad', abbr: 'AD', name: 'Part 3 — Aerodromes (AD)', color: 'text-green-400',
    intro: 'Information about aerodromes and heliports, including a detailed entry for each one.',
    sections: [
      { code: 'AD 0', title: 'Preface / Record of amendments & supplements / Checklist / Table of contents to Part 3' },
      { code: 'AD 1', title: 'Aerodromes / heliports — introduction', subs: [
        ['AD 1.1', 'Aerodrome / heliport availability and conditions of use'],
        ['AD 1.2', 'Rescue and fire fighting services and snow plan'],
        ['AD 1.3', 'Index to aerodromes and heliports'],
        ['AD 1.4', 'Grouping of aerodromes / heliports'],
        ['AD 1.5', 'Status of certification of aerodromes'],
      ]},
      { code: 'AD 2', title: 'Aerodromes — one entry per aerodrome (AD 2.1 – AD 2.24)', subs: [
        ['AD 2.1', 'Aerodrome location indicator and name'],
        ['AD 2.2', 'Aerodrome geographical and administrative data'],
        ['AD 2.3', 'Operational hours'],
        ['AD 2.4', 'Handling services and facilities'],
        ['AD 2.5', 'Passenger facilities'],
        ['AD 2.6', 'Rescue and fire fighting services'],
        ['AD 2.7', 'Seasonal availability — clearing'],
        ['AD 2.8', 'Aprons, taxiways and check locations / positions data'],
        ['AD 2.9', 'Surface movement guidance and control system and markings'],
        ['AD 2.10', 'Aerodrome obstacles'],
        ['AD 2.11', 'Meteorological information provided'],
        ['AD 2.12', 'Runway physical characteristics'],
        ['AD 2.13', 'Declared distances (TORA, TODA, ASDA, LDA)'],
        ['AD 2.14', 'Approach and runway lighting'],
        ['AD 2.15', 'Other lighting, secondary power supply'],
        ['AD 2.16', 'Helicopter landing area'],
        ['AD 2.17', 'ATS airspace'],
        ['AD 2.18', 'ATS communication facilities'],
        ['AD 2.19', 'Radio navigation and landing aids'],
        ['AD 2.20', 'Local aerodrome regulations'],
        ['AD 2.21', 'Noise abatement procedures'],
        ['AD 2.22', 'Flight procedures'],
        ['AD 2.23', 'Additional information'],
        ['AD 2.24', 'Charts related to the aerodrome'],
      ]},
      { code: 'AD 3', title: 'Heliports — one entry per heliport (AD 3.1 – AD 3.24, same structure as AD 2)' },
    ],
  },
];

// ── AIP format / paging specifications ───────────────────────────────────────────
interface Spec { title: string; body: string; }
const AIP_SPECS: Spec[] = [
  { title: 'Loose-leaf system',
    body: 'The AIP is produced as a loose-leaf publication (or its electronic equivalent) so that individual pages can be replaced when amended. This is why every page is self-identifying — it must make sense on its own when filed.' },
  { title: 'Three-part structure',
    body: 'Every AIP is divided into Part 1 GEN (General), Part 2 ENR (En-route) and Part 3 AD (Aerodromes). The order is always GEN → ENR → AD.' },
  { title: 'Page identification (numbering)',
    body: 'Each page is identified by its Part/section abbreviation followed by a page number — e.g. GEN 1.2-1, ENR 3.1-2, AD 2-TBPB-5. The identifier ties the page to its place in the table of contents.' },
  { title: 'Top outer corner',
    body: 'The page identifier is printed in the TOP OUTER corner of the page. On a right-hand (recto) page that outer corner is the TOP-RIGHT; on a left-hand (verso) page it is the TOP-LEFT. The outer corner is used so the identifier is visible when flipping through a bound/filed copy.' },
  { title: 'Left vs right pages (recto / verso)',
    body: 'Odd-numbered pages are right-hand (recto) pages; even-numbered pages are left-hand (verso) pages. A new subsection normally begins on a right-hand (odd) page, so blank verso pages may be inserted to keep the layout correct.' },
  { title: 'Authority & date on every page',
    body: 'Each page carries the name of the State / issuing authority and the publication date (day – month by name – year). The date lets users confirm they are holding the current page.' },
  { title: 'AIRAC pages',
    body: 'Pages issued under the AIRAC system are marked "AIRAC" and carry the AIRAC effective date (a 28-day cycle date). These are published well in advance so operators can update navigation databases in time.' },
  { title: 'AIP Amendments vs Supplements',
    body: 'Permanent changes are made by AIP Amendments (regular or AIRAC). Temporary changes of long duration, or short-duration changes with extensive text/graphics, are published as AIP Supplements (SUP) — traditionally printed on yellow paper and listed on the AIP SUP checklist.' },
  { title: 'Checklist of pages',
    body: 'A checklist of AIP pages (with page numbers and dates) is issued so users can verify their copy is complete and current. AIP Supplements have their own checklist.' },
  { title: 'Hand amendments',
    body: 'Hand (manuscript) amendments are permitted only in limited cases, made in ink and recorded in the "Record of AIP hand amendments". Anything more substantial is issued as a printed amendment page.' },
];

const Acc: React.FC<{ title: string; subtitle?: string; color?: string; open: boolean; onToggle: () => void; children: React.ReactNode; }> =
  ({ title, subtitle, color = 'text-white', open, onToggle, children }) => (
  <div className="border border-white/10 rounded-xl overflow-hidden mb-2">
    <button
      className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
      style={{ touchAction: 'manipulation' }}
      onClick={onToggle}
      aria-expanded={open}
    >
      <span>
        <span className={`font-bold text-sm ${color}`}>{title}</span>
        {subtitle && <span className="block text-white/40 text-xs mt-0.5 font-normal">{subtitle}</span>}
      </span>
      <span className="text-white/40 text-xs select-none ml-2 shrink-0">{open ? '▲' : '▼'}</span>
    </button>
    {open && <div className="px-4 py-3 bg-black/10">{children}</div>}
  </div>
);

export const AipTab: React.FC = () => {
  const [openPart, setOpenPart] = useState<string | null>('gen');
  const [specsOpen, setSpecsOpen] = useState(true);

  return (
    <div className="space-y-4">
      <div className="text-white/60 text-sm leading-relaxed">
        The <span className="text-white font-semibold">Aeronautical Information Publication (AIP)</span> is the State's
        official reference of permanent aeronautical information. Use this tab to see what lives under each Part and
        section, and how AIP pages are laid out and numbered.
      </div>

      {/* ── AIP specifications ── */}
      <Acc
        title="AIP format & paging specifications"
        subtitle="Loose-leaf · page numbering · top outer corner · left/right pages · AIRAC"
        color="text-amber-400"
        open={specsOpen}
        onToggle={() => setSpecsOpen(o => !o)}
      >
        <div className="space-y-3">
          {AIP_SPECS.map(s => (
            <div key={s.title} className="border-l-2 border-amber-400/40 pl-3">
              <div className="text-white font-semibold text-sm">{s.title}</div>
              <div className="text-white/60 text-xs leading-relaxed mt-0.5">{s.body}</div>
            </div>
          ))}
          {/* Quick page-layout diagram */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="border border-white/15 rounded-lg p-2 bg-black/20">
              <div className="flex justify-start">
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">ENR 3.1-2</span>
              </div>
              <div className="text-center text-white/30 text-[10px] mt-3 mb-3">page content</div>
              <div className="text-center text-white/40 text-[9px] border-t border-white/10 pt-1">Left-hand (verso) · even page</div>
            </div>
            <div className="border border-white/15 rounded-lg p-2 bg-black/20">
              <div className="flex justify-end">
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">ENR 3.1-3</span>
              </div>
              <div className="text-center text-white/30 text-[10px] mt-3 mb-3">page content</div>
              <div className="text-center text-white/40 text-[9px] border-t border-white/10 pt-1">Right-hand (recto) · odd page</div>
            </div>
          </div>
          <div className="text-white/40 text-[11px] text-center">
            Identifier sits in the <span className="text-amber-300">top outer corner</span> — top-left on verso, top-right on recto.
          </div>
        </div>
      </Acc>

      {/* ── Table of contents ── */}
      <div className="text-white/40 text-xs uppercase tracking-widest pt-1">Table of contents</div>
      {AIP_PARTS.map(part => (
        <Acc
          key={part.id}
          title={part.name}
          subtitle={part.intro}
          color={part.color}
          open={openPart === part.id}
          onToggle={() => setOpenPart(o => (o === part.id ? null : part.id))}
        >
          <div className="space-y-3">
            {part.sections.map(sec => (
              <div key={sec.code}>
                <div className="flex items-baseline gap-2">
                  <span className={`font-mono font-bold text-xs ${part.color} shrink-0`}>{sec.code}</span>
                  <span className="text-white/80 text-sm">{sec.title}</span>
                </div>
                {sec.subs && (
                  <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                    {sec.subs.map(([code, title]) => (
                      <div key={code} className="flex items-baseline gap-2">
                        <span className="font-mono text-white/40 text-[11px] shrink-0 w-16">{code}</span>
                        <span className="text-white/55 text-xs">{title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Acc>
      ))}
    </div>
  );
};
