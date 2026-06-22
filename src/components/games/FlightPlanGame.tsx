import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';
import { FPLCorrect } from '@/lib/taskGenerator';

// ── Collapsible narrative ────────────────────────────────────────────────────
const CollapsibleNarrative: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="shrink-0 rounded-xl border border-sky-400/20 overflow-hidden">
      <button
        style={{ touchAction: 'manipulation' }}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-sky-900/20 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Scenario</span>
        <span className="text-white/40 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>
      {open && (
        <div className="px-4 py-3 bg-sky-900/10 text-sm text-sky-100 leading-relaxed border-t border-sky-400/10 max-h-[30vh] overflow-y-auto">
          {text}
        </div>
      )}
    </div>
  );
};

// NOTE: equipment (Item 10) and SSR code are deliberately NOT scored. They are
// ICAO-codified letter strings that a natural spoken briefing does not dictate
// verbatim, so they cannot be fairly derived by the player. The inputs remain in
// the form for practice, but every SCORED field below is stated in the briefing.
const SCORED: (keyof FPLCorrect)[] = [
  'flightRules', 'typeOfFlight', 'aircraftType', 'wakeCategory',
  'depAerodrome', 'eobt',
  'cruisingSpeed', 'cruisingLevel', 'route', 'destAerodrome',
  'totalEet', 'altAerodrome1', 'endurance', 'pob',
];

const initForm = (provided: FPLCorrect): FPLCorrect => ({
  aircraftId:    provided.aircraftId    ?? '',
  flightRules:   provided.flightRules   ?? '',
  typeOfFlight:  provided.typeOfFlight  ?? '',
  aircraftType:  provided.aircraftType  ?? '',
  wakeCategory:  provided.wakeCategory  ?? '',
  equipment:     provided.equipment     ?? '',
  ssr:           provided.ssr           ?? '',
  depAerodrome:  provided.depAerodrome  ?? '',
  eobt:          provided.eobt          ?? '',
  cruisingSpeed: provided.cruisingSpeed ?? '',
  cruisingLevel: provided.cruisingLevel ?? '',
  route:         provided.route         ?? '',
  destAerodrome: provided.destAerodrome ?? '',
  totalEet:      provided.totalEet      ?? '',
  altAerodrome1: provided.altAerodrome1 ?? '',
  altAerodrome2: provided.altAerodrome2 ?? '',
  otherInfo:     provided.otherInfo     ?? '0',
  endurance:     provided.endurance     ?? '',
  pob:           provided.pob           ?? '',
  emergencyRadio:provided.emergencyRadio?? '',
  survivalEquip: provided.survivalEquip ?? '',
  jackets:       provided.jackets       ?? '',
  dinghies:      provided.dinghies      ?? '',
  acColour:      provided.acColour      ?? '',
  remarks19:     provided.remarks19     ?? '',
  pilot:         provided.pilot         ?? '',
});

// ── Boxed multi-choice (paper style) ─────────────────────────────────────────
function BtnGroup({ value, opts, onChange, disabled, isCorrect, correctVal }: {
  value: string;
  opts: [string, string][];
  onChange: (v: string) => void;
  disabled: boolean;
  isCorrect?: boolean;
  correctVal?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {opts.map(([c, d]) => {
        const sel = value === c;
        const showCorrect = disabled && correctVal === c;
        const showWrong   = disabled && sel && !isCorrect;
        return (
          <button
            key={c}
            type="button"
            style={{ touchAction: 'manipulation' }}
            disabled={disabled}
            onClick={() => onChange(c)}
            title={d}
            className={`text-[12px] px-2 py-1 border font-mono font-bold transition-colors ${
              showCorrect ? 'border-green-600 bg-green-100 text-green-800'
              : showWrong ? 'border-red-500 bg-red-100 text-red-700'
              : sel       ? 'border-sky-600 bg-sky-100 text-slate-900'
              : 'border-slate-400 bg-white text-slate-600 hover:border-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="inline-block min-w-[1.1em] text-center">{c}</span>
            <span className="font-normal text-slate-500 ml-1.5">{d.split('(')[0].trim()}</span>
          </button>
        );
      })}
    </div>
  );
}

export const FlightPlanGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [form, setForm] = useState<FPLCorrect>(() =>
    task ? initForm(task.scenario.provided) : initForm({} as FPLCorrect)
  );
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults]     = useState<Record<string, boolean>>({});
  const [earned, setEarned]       = useState(0);

  useEffect(() => {
    if (task) {
      setForm(initForm(task.scenario.provided));
      setSubmitted(false);
      setResults({});
      setEarned(0);
    }
  }, [task?.id]);

  if (!task || task.type !== 'FLIGHT_PLAN') return null;

  const upd = (field: keyof FPLCorrect, val: string) => {
    if (!submitted) setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    const ca: FPLCorrect = task.correctAnswer;
    const res: Record<string, boolean> = {};
    let correct = 0;
    // Numeric / time fields are matched leniently (ignore leading zeros, ':' and spaces)
    // because the player now types every field from scratch.
    const NUMERICISH: (keyof FPLCorrect)[] = ['eobt', 'totalEet', 'endurance', 'pob'];
    const digits = (s: string) => s.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    const text = (s: string) => s.trim().toUpperCase().replace(/\s+/g, ' ');
    SCORED.forEach(f => {
      const u = form[f] ?? '';
      const c = ca[f] ?? '';
      const ok = NUMERICISH.includes(f) ? digits(u) === digits(c) : text(u) === text(c);
      res[f] = ok;
      if (ok) correct++;
    });
    const score = Math.round((correct / SCORED.length) * task.maxScore);
    setResults(res);
    setEarned(score);
    setSubmitted(true);
    submitTask(task.id, score, task.maxScore, `${correct}/${SCORED.length} fields correct`);
  };

  const fi = (f: string) => (submitted ? results[f] : undefined);
  const ca: FPLCorrect = task.correctAnswer;

  // ── Paper field helpers ────────────────────────────────────────────────────
  const boxCls = (f?: keyof FPLCorrect) =>
    `border px-1.5 py-1 font-mono text-[13px] leading-tight text-slate-900 w-full outline-none transition-colors ${
      f && fi(f) === true  ? 'border-green-600 bg-green-50' :
      f && fi(f) === false ? 'border-red-500 bg-red-50'     :
      'border-slate-400 bg-white focus:border-sky-600'
    }`;

  const renderInp = ({ f, placeholder = '', upper = true }: { f: keyof FPLCorrect; placeholder?: string; upper?: boolean }) => (
    <input
      type="text"
      className={boxCls(f)}
      value={form[f] ?? ''}
      onChange={e => upd(f, upper ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
      readOnly={submitted}
    />
  );

  // Item number badge + caption above a field
  const Cap = ({ num, children, f }: { num?: string; children: React.ReactNode; f?: keyof FPLCorrect }) => (
    <div className="flex items-baseline gap-1 mb-0.5">
      {num && <span className="text-[10px] font-bold text-slate-800">{num}</span>}
      <span className="text-[10px] uppercase tracking-wide text-slate-600 font-semibold">{children}</span>
      {f && submitted && results[f] !== undefined && (
        <span className={`text-[10px] font-bold ${results[f] ? 'text-green-700' : 'text-red-600'}`}>
          {results[f] ? '✓' : `✗ ${ca[f]}`}
        </span>
      )}
    </div>
  );

  // teleprinter end-of-line marker
  const End = () => <span className="font-mono font-bold text-slate-800 text-sm select-none shrink-0">&lt;=</span>;

  // Composable letter toggle boxes (matches the form's check boxes)
  const Toggle = ({ f, letters }: { f: keyof FPLCorrect; letters: [string, string][] }) => {
    const cur = (form[f] ?? '').toUpperCase();
    const order = letters.map(l => l[0]);
    const flip = (ltr: string) => {
      const has = cur.includes(ltr);
      const next = order.filter(l => (l === ltr ? !has : cur.includes(l))).join('');
      upd(f, next);
    };
    return (
      <div className="flex flex-wrap gap-2">
        {letters.map(([ltr, label]) => {
          const on = cur.includes(ltr);
          return (
            <button
              key={ltr}
              type="button"
              style={{ touchAction: 'manipulation' }}
              disabled={submitted}
              onClick={() => flip(ltr)}
              className="flex flex-col items-center"
              title={label}
            >
              <span className="text-[9px] uppercase text-slate-500 leading-none mb-0.5">{label}</span>
              <span className={`w-7 h-6 border flex items-center justify-center font-mono font-bold text-[13px] ${
                on ? 'border-sky-600 bg-sky-100 text-slate-900' : 'border-slate-400 bg-white text-slate-400'
              }`}>{ltr}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // decorative AFTN header box (auto-completed by AIS — not part of the game)
  const HdrBox = ({ w = 'w-full', value = '' }: { w?: string; value?: string }) => (
    <div className={`${w} h-6 border border-slate-300 bg-slate-50 flex items-center px-1.5 font-mono text-[12px] text-slate-400`}>{value}</div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">
      <CollapsibleNarrative text={task.scenario.narrative} />

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1">
        {/* ── Paper form ── */}
        <div className="bg-[#f6f4ee] text-slate-900 rounded-xl border border-slate-300 shadow-inner overflow-hidden">

          {/* Title bar */}
          <div className="border-b-2 border-slate-800 px-4 py-2 flex items-center gap-3">
            <div className="text-[9px] leading-tight text-slate-600 shrink-0">
              <div>U S Department of Transportation</div>
              <div className="font-semibold">Federal Aviation Administration</div>
            </div>
            <h2 className="flex-1 text-center text-lg font-bold tracking-wide text-slate-900">International Flight Plan</h2>
            <div className="w-24 shrink-0" />
          </div>

          <div className="p-4 space-y-3">
            {/* ── AFTN telegram header (auto, not scored) ── */}
            <div className="border border-slate-300 rounded p-3 bg-white/40">
              <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-start">
                <div>
                  <Cap>Priority</Cap>
                  <div className="flex items-center gap-1">
                    <End />
                    <div className="w-10 h-6 border border-slate-400 bg-white flex items-center justify-center font-mono font-bold text-slate-900">FF</div>
                  </div>
                </div>
                <div>
                  <Cap>Addressee(s)</Cap>
                  <div className="space-y-1"><HdrBox value="TBPBZQZX" /><HdrBox /></div>
                </div>
                <div className="self-end pb-1"><End /></div>
              </div>
              <div className="grid grid-cols-[120px_1fr_auto] gap-2 items-end mt-2">
                <div><Cap>Filing Time</Cap><HdrBox /></div>
                <div><Cap>Originator</Cap><HdrBox value="TBPBYXYX" /></div>
                <div className="pb-1"><End /></div>
              </div>
              <div className="text-[9px] text-slate-400 mt-1.5 italic">AFTN header is completed automatically by the AIS — fill in the flight-plan items below.</div>
            </div>

            {/* ── Items 3 / 7 / 8 ── */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-end">
              <div>
                <Cap num="3">Message Type</Cap>
                <div className="flex items-center gap-1">
                  <End />
                  <div className="px-2 h-7 border border-slate-400 bg-white flex items-center font-mono font-bold text-slate-900">(FPL</div>
                </div>
              </div>
              <div>
                <Cap num="7" f="aircraftId">Aircraft Identification</Cap>
                {renderInp({ f: "aircraftId", placeholder: "LIA402" })}
              </div>
              <div className="w-28">
                <Cap num="8" f="flightRules">Flight Rules</Cap>
                <BtnGroup value={form.flightRules ?? ''} disabled={submitted} isCorrect={fi('flightRules')} correctVal={submitted ? ca.flightRules : undefined}
                  opts={[['I','IFR'],['V','VFR'],['Y','Y'],['Z','Z']]} onChange={v => upd('flightRules', v)} />
              </div>
              <div className="w-44">
                <Cap f="typeOfFlight">Type of Flight</Cap>
                <BtnGroup value={form.typeOfFlight ?? ''} disabled={submitted} isCorrect={fi('typeOfFlight')} correctVal={submitted ? ca.typeOfFlight : undefined}
                  opts={[['S','Sched'],['N','Non'],['G','GA'],['M','Mil'],['X','Other']]} onChange={v => upd('typeOfFlight', v)} />
              </div>
              <div className="self-center"><End /></div>
            </div>

            {/* ── Item 9 / 10 ── */}
            <div className="grid grid-cols-[auto_1fr_auto_1.4fr_auto] gap-2 items-end">
              <div className="w-12">
                <Cap num="9">Number</Cap>
                <div className="border border-slate-400 bg-white h-7 flex items-center justify-center font-mono text-slate-500">—</div>
              </div>
              <div>
                <Cap f="aircraftType">Type of Aircraft</Cap>
                {renderInp({ f: "aircraftType", placeholder: "GLF6" })}
              </div>
              <div className="w-32">
                <Cap f="wakeCategory">Wake Turb. Cat.</Cap>
                <BtnGroup value={form.wakeCategory ?? ''} disabled={submitted} isCorrect={fi('wakeCategory')} correctVal={submitted ? ca.wakeCategory : undefined}
                  opts={[['L','L'],['M','M'],['H','H'],['J','J']]} onChange={v => upd('wakeCategory', v)} />
              </div>
              <div>
                <Cap num="10" f="equipment">Equipment&nbsp;&amp;&nbsp;SSR</Cap>
                <div className="flex items-center gap-1">
                  {renderInp({ f: "equipment", placeholder: "SDFGHIRWY" })}
                  <span className="font-mono font-bold text-slate-700">/</span>
                  <div className="w-40">{renderInp({ f: "ssr", placeholder: "S1" })}</div>
                </div>
              </div>
              <div className="self-center"><End /></div>
            </div>
            {submitted && results['ssr'] !== undefined && (
              <div className="-mt-1.5 text-[10px] font-bold text-right pr-7">
                <span className={results['ssr'] ? 'text-green-700' : 'text-red-600'}>SSR {results['ssr'] ? '✓' : `✗ ${ca.ssr}`}</span>
              </div>
            )}

            {/* ── Item 13 ── */}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div><Cap num="13" f="depAerodrome">Departure Aerodrome</Cap>{renderInp({ f: "depAerodrome", placeholder: "KMIA" })}</div>
              <div><Cap f="eobt">Time (EOBT)</Cap>{renderInp({ f: "eobt", placeholder: "0815" })}</div>
              <div className="self-center"><End /></div>
            </div>

            {/* ── Item 15 ── */}
            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <div><Cap num="15" f="cruisingSpeed">Cruising Speed</Cap>{renderInp({ f: "cruisingSpeed", placeholder: "M085 / N0450" })}</div>
              <div><Cap f="cruisingLevel">Level</Cap>{renderInp({ f: "cruisingLevel", placeholder: "F410 / A080" })}</div>
            </div>
            <div>
              <Cap f="route">Route</Cap>
              <div className="flex items-start gap-1">
                <textarea
                  className={`${boxCls('route')} resize-none`}
                  rows={2}
                  value={form.route ?? ''}
                  onChange={e => upd('route', e.target.value.toUpperCase())}
                  placeholder="DCT GEECE L466 MEEGL Y421 HARBG"
                  readOnly={submitted}
                />
                <div className="pt-1"><End /></div>
              </div>
            </div>

            {/* ── Item 16 ── */}
            <div className="grid grid-cols-[1.2fr_0.9fr_1fr_1fr_auto] gap-2 items-end">
              <div><Cap num="16" f="destAerodrome">Destination</Cap>{renderInp({ f: "destAerodrome", placeholder: "TBPB" })}</div>
              <div><Cap f="totalEet">Total EET (HRMIN)</Cap>{renderInp({ f: "totalEet", placeholder: "0320" })}</div>
              <div><Cap f="altAerodrome1">Altn Aerodrome</Cap>{renderInp({ f: "altAerodrome1", placeholder: "TTPP" })}</div>
              <div><Cap>2nd Altn</Cap>{renderInp({ f: "altAerodrome2", placeholder: "TGPY" })}</div>
              <div className="self-center"><End /></div>
            </div>

            {/* ── Item 18 ── */}
            <div>
              <Cap num="18">Other Information</Cap>
              <div className="flex items-start gap-1">
                <textarea
                  className={`${boxCls('otherInfo')} resize-none`}
                  rows={2}
                  value={form.otherInfo ?? ''}
                  onChange={e => upd('otherInfo', e.target.value.toUpperCase())}
                  placeholder="DOF/260615 PER/C  (or 0 if nil)"
                  readOnly={submitted}
                />
                <div className="pt-1"><End /></div>
              </div>
            </div>

            {/* ── Item 19 supplementary ── */}
            <div className="border border-slate-400 rounded bg-white/50 p-3 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-700 text-center border-b border-slate-300 pb-1">
                19 — Supplementary Information (not transmitted in FPL messages)
              </div>

              <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-3 items-end">
                <div>
                  <Cap f="endurance">E/ Endurance (HRMIN)</Cap>
                  {renderInp({ f: "endurance", placeholder: "0600" })}
                </div>
                <div>
                  <Cap f="pob">P/ Persons on Board</Cap>
                  {renderInp({ f: "pob", placeholder: "12 / TBN" })}
                </div>
                <div>
                  <Cap>R/ Emergency Radio</Cap>
                  <Toggle f="emergencyRadio" letters={[['U','UHF'],['V','VHF'],['E','ELT']]} />
                </div>
              </div>

              <div className="grid grid-cols-[1.3fr_1fr] gap-3 items-end">
                <div>
                  <Cap>S/ Survival Equipment</Cap>
                  <Toggle f="survivalEquip" letters={[['P','Polar'],['D','Desert'],['M','Marit'],['J','Jungle']]} />
                </div>
                <div>
                  <Cap>J/ Jackets</Cap>
                  <Toggle f="jackets" letters={[['L','Light'],['F','Fluor'],['U','UHF'],['V','VHF']]} />
                </div>
              </div>

              <div>
                <Cap>D/ Dinghies — number · capacity · cover · colour</Cap>
                {renderInp({ f: "dinghies", placeholder: "2 20 C ORANGE" })}
              </div>
              <div><Cap>A/ Aircraft Colour &amp; Markings</Cap>{renderInp({ f: "acColour", placeholder: "WHITE BLUE STRIPE" })}</div>
              <div><Cap>N/ Remarks</Cap>{renderInp({ f: "remarks19", placeholder: "NIL" })}</div>
              <div>
                <Cap>C/ Pilot-in-Command</Cap>
                <div className="flex items-center gap-1">
                  {renderInp({ f: "pilot", placeholder: "CAPT SURNAME" })}
                  <span className="font-mono font-bold text-slate-800">)</span>
                  <End />
                </div>
              </div>
            </div>
          </div>
        </div>

        {submitted ? (
          <div className={`mt-3 p-4 rounded-xl border ${earned >= task.maxScore * 0.7 ? 'border-green-400/50 bg-green-900/20' : earned >= task.maxScore * 0.4 ? 'border-amber-400/50 bg-amber-900/20' : 'border-red-400/50 bg-red-900/20'}`}>
            <div className="text-white font-bold text-base">Score: {earned} / {task.maxScore}</div>
            <div className="text-white/60 text-xs mt-1 mb-2">
              {Object.values(results).filter(Boolean).length} / {SCORED.length} scored fields correct
            </div>
            <details>
              <summary className="text-sky-400 text-xs cursor-pointer" style={{ touchAction: 'manipulation' }}>Show field-by-field result</summary>
              <div className="mt-2 space-y-0.5 font-mono text-xs">
                {SCORED.map(f => (
                  <div key={f} className={`flex gap-2 ${results[f] ? 'text-green-400' : 'text-red-400'}`}>
                    <span className="shrink-0">{results[f] ? '✓' : '✗'}</span>
                    <span className="text-white/50 shrink-0 w-28">{f}:</span>
                    <span>{task.correctAnswer[f] || '(empty)'}</span>
                    {!results[f] && <span className="text-white/30 ml-1">— you: {(form[f] as string) || '(empty)'}</span>}
                  </div>
                ))}
              </div>
            </details>
          </div>
        ) : (
          <button
            type="submit"
            style={{ touchAction: 'manipulation' }}
            className="mt-3 w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-bold py-3 rounded-xl transition-colors text-xs tracking-widest uppercase"
          >
            Submit Flight Plan
          </button>
        )}
      </form>
    </div>
  );
};
