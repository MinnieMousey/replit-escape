import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';
import { NOTAMCorrect } from '@/lib/taskGenerator';

const SUBJECT_CODES: [string, string][] = [
  ['RW','Runway'],['TW','Taxiway'],['MN','Apron/Ramp'],['MD','Declared distances'],
  ['MT','Threshold'],['MU','Turning area'],['MW','Runway strip'],
  ['NI','ILS (complete system)'],['NH','Localizer (ILS)'],['NG','Glide path (ILS)'],
  ['NK','DME associated with ILS'],['NV','VOR/VORTAC'],['NB','NDB'],
  ['ND','DVOR/DME'],['NL','Localizer/DME'],['NN','TACAN'],['NX','VOR/DME'],
  ['LA','Approach lighting system'],['LB','Aerodrome beacon'],
  ['LC','Runway centreline lights'],['LE','Runway edge lights'],
  ['LH','High-intensity runway lights'],['LT','Threshold lights'],
  ['LZ','Touchdown zone lights'],['LP','PAPI'],['LV','VASI'],
  ['LI','REIL'],['LY','Taxiway edge lights'],['LX','Taxiway centreline lights'],
  ['OB','Obstacle (general)'],['OL','Obstacle lights'],
  ['GZ','Prohibited area'],['GR','Restricted area'],['GW','Warning area'],
  ['GD','Danger area'],['GA','General aviation restriction'],
  ['WP','Parachute activity'],['AC','Airspace classification'],
  ['AE','Control area (CTA)'],['AT','TMA'],['AF','FIR'],
  ['PA','Instrument approach procedure'],['PD','SID'],['PE','STAR'],
  ['PH','Holding procedure'],['PP','RNP approach'],
];

const CONDITION_CODES: [string, string][] = [
  ['XX','Unserviceable'],['LC','Closed'],['LH','Limited operating hours'],
  ['LR','Limited / restricted'],['LV','Limited to VFR only'],
  ['CA','Activated'],['CC','Commissioned / operational'],
  ['CD','Downgraded to lower category'],['CE','Erected (new structure)'],
  ['CF','Operating on reduced power'],['CH','Changed / modified'],
  ['CI','Out of service indefinitely'],['CM','Commissioned'],
  ['CO','Operational'],['CT','On test — do not use for navigation'],
  ['PX','Procedure changed'],['RA','Resumed normal operations'],
  ['RM','Removed'],['RO','Returned to service'],
];

const TRAFFIC_OPTS: [string, string][] = [
  ['I','IFR only'],['V','VFR only'],['IV','IFR and VFR'],['K','Checklist'],
];
const PURPOSE_OPTS: [string, string][] = [
  ['N','Nav safety'],['B','Pre-flight essential'],['O','Operationally significant'],
  ['M','Miscellaneous'],['NBO','Nav + Pre-flight + Ops'],['BO','Pre-flight + Ops'],['K','Checklist'],
];
const SCOPE_OPTS: [string, string][] = [
  ['A','Aerodrome'],['E','En-route'],['W','Warning'],
  ['AE','Aerodrome + en-route'],['AW','Aerodrome + warning'],
  ['EW','En-route + warning'],['AEW','All'],
];

const SCORED_NOTAM: (keyof NOTAMCorrect)[] = [
  'notamType','subjectCode','conditionCode','traffic','purpose','scope',
  'lower','upper','locationA','effectiveFrom','effectiveTo','notamText',
];

const initNotamForm = (p: NOTAMCorrect): NOTAMCorrect => ({
  notamType:     p.notamType     ?? 'N',
  firIndicator:  p.firIndicator  ?? '',
  subjectCode:   p.subjectCode   ?? '',
  conditionCode: p.conditionCode ?? '',
  traffic:       p.traffic       ?? '',
  purpose:       p.purpose       ?? '',
  scope:         p.scope         ?? '',
  lower:         p.lower         ?? '000',
  upper:         p.upper         ?? '999',
  coordRadius:   p.coordRadius   ?? '',
  locationA:     p.locationA     ?? '',
  effectiveFrom: p.effectiveFrom ?? '',
  effectiveTo:   p.effectiveTo   ?? '',
  schedule:      p.schedule      ?? '',
  notamText:     p.notamText     ?? '',
  lowerLimit:    p.lowerLimit    ?? '',
  upperLimit:    p.upperLimit    ?? '',
});

function CodeLookup({ codes, onPick, disabled }: {
  codes: [string,string][];
  onPick: (c: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        style={{ touchAction: 'manipulation' }}
        onClick={() => setOpen(o => !o)}
        className="text-xs text-sky-400/70 underline underline-offset-2 hover:text-sky-400"
      >
        {open ? 'Hide code list' : 'Pick from list ▾'}
      </button>
      {open && (
        <div className="mt-1 bg-black/40 border border-white/10 rounded-lg p-2 grid grid-cols-2 gap-0.5 max-h-40 overflow-y-auto">
          {codes.map(([c, d]) => (
            <button
              key={c}
              type="button"
              style={{ touchAction: 'manipulation' }}
              disabled={disabled}
              onClick={() => { onPick(c); setOpen(false); }}
              className="text-left text-xs px-2 py-1 rounded hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              <span className="font-mono font-bold text-amber-300">{c}</span>
              <span className="text-white/50 ml-1.5">{d}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BtnGroup({ value, opts, onChange, disabled, isCorrect }: {
  value: string;
  opts: [string, string][];
  onChange: (v: string) => void;
  disabled: boolean;
  isCorrect?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {opts.map(([c, d]) => {
        const sel = value === c;
        return (
          <button
            key={c}
            type="button"
            style={{ touchAction: 'manipulation' }}
            disabled={disabled}
            onClick={() => onChange(c)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono font-bold transition-colors ${
              sel && isCorrect === true  ? 'border-green-500 bg-green-900/40 text-green-300'
              : sel && isCorrect === false ? 'border-red-500 bg-red-900/40 text-red-300'
              : sel ? 'border-sky-400 bg-sky-900/40 text-white'
              : 'border-white/15 bg-black/20 text-white/60 hover:border-white/40 hover:text-white'
            }`}
            title={d}
          >
            {c}
            <span className="font-normal text-white/40 ml-1 hidden sm:inline">{d.length < 20 ? d : ''}</span>
          </button>
        );
      })}
    </div>
  );
}

export const NotamGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [form, setForm] = useState<NOTAMCorrect>(() =>
    task ? initNotamForm(task.scenario.provided) : initNotamForm({} as NOTAMCorrect)
  );
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults]     = useState<Record<string, boolean>>({});
  const [earned, setEarned]       = useState(0);

  useEffect(() => {
    if (task) {
      setForm(initNotamForm(task.scenario.provided));
      setSubmitted(false);
      setResults({});
      setEarned(0);
    }
  }, [task?.id]);

  if (!task || task.type !== 'NOTAM') return null;

  const upd = (field: keyof NOTAMCorrect, val: string) => {
    if (!submitted) setForm(prev => ({ ...prev, [field]: val }));
  };

  const qLine = `Q) ${form.firIndicator || '????'}/Q${form.subjectCode || '??'}${form.conditionCode || '??'}/${form.traffic || '??'}/${form.purpose || '??'}/${form.scope || '??'}/${form.lower || '???'}/${form.upper || '???'}/${form.coordRadius || '??????????'}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    const ca: NOTAMCorrect = task.correctAnswer;
    const res: Record<string, boolean> = {};
    let correct = 0;

    SCORED_NOTAM.forEach(f => {
      let ok: boolean;
      if (f === 'notamText') {
        const userWords = (form[f] ?? '').toUpperCase().split(/\s+/).filter(w => w.length > 3);
        const correctWords = (ca[f] ?? '').toUpperCase().split(/\s+/).filter(w => w.length > 3);
        const matched = correctWords.filter(w => userWords.includes(w));
        ok = matched.length >= Math.ceil(correctWords.length * 0.5) && (form[f] ?? '').length >= 10;
      } else {
        ok = (form[f] ?? '').trim().toUpperCase() === (ca[f] ?? '').trim().toUpperCase();
      }
      res[f] = ok;
      if (ok) correct++;
    });

    const score = Math.round((correct / SCORED_NOTAM.length) * task.maxScore);
    setResults(res);
    setEarned(score);
    setSubmitted(true);
    submitTask(task.id, score, task.maxScore, `${correct}/${SCORED_NOTAM.length} NOTAM fields correct`);
  };

  const fi = (f: string) => (submitted ? results[f] : undefined);
  const inputCls = (f: string) =>
    `bg-black/30 border rounded px-2 py-1 text-white text-xs font-mono w-full transition-colors outline-none ${
      fi(f) === true  ? 'border-green-400 bg-green-900/20' :
      fi(f) === false ? 'border-red-400 bg-red-900/20' :
      'border-white/20 focus:border-sky-400'
    }`;

  const Lbl = ({ label, f }: { label: string; f?: string }) => (
    <label className="text-xs text-white/50 uppercase tracking-wide block mb-0.5">
      {label}
      {f && submitted && results[f] !== undefined && (
        <span className={`ml-1 font-bold ${results[f] ? 'text-green-400' : 'text-red-400'}`}>
          {results[f] ? '✓' : `✗ → ${(task.correctAnswer as NOTAMCorrect)[f as keyof NOTAMCorrect]}`}
        </span>
      )}
    </label>
  );

  const renderSI = ({ f, ph = '' }: { f: keyof NOTAMCorrect; ph?: string }) => (
    <input type="text" className={inputCls(f)} value={form[f] ?? ''} readOnly={submitted}
      onChange={e => upd(f, e.target.value.toUpperCase())} placeholder={ph} />
  );

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">
      <div className="shrink-0 bg-amber-900/20 border border-amber-400/20 rounded-xl p-3 text-sm text-amber-100 leading-relaxed">
        <span className="text-amber-400 font-bold text-xs uppercase tracking-widest block mb-1">Situation</span>
        {task.scenario.situation}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1">
        <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-4">

          <div className="text-center text-white/60 text-xs uppercase tracking-widest pb-2 border-b border-white/10">
            NOTAM — ICAO Annex 15 Format
          </div>

          {/* NOTAM Type */}
          <div>
            <Lbl label="NOTAM Type" f="notamType" />
            <div className="flex gap-2">
              {(['N','R','C'] as const).map(v => (
                <button key={v} type="button"
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => upd('notamType', v)}
                  disabled={submitted}
                  className={`flex-1 py-2 rounded border text-xs font-bold transition-colors ${
                    form.notamType === v
                      ? 'bg-sky-500 border-sky-400 text-white'
                      : 'bg-black/30 border-white/20 text-white/60 hover:border-white/40'
                  } ${fi('notamType') === true ? '!border-green-400' : fi('notamType') === false ? '!border-red-400' : ''}`}>
                  {v === 'N' ? 'N — New' : v === 'R' ? 'R — Replace' : 'C — Cancel'}
                </button>
              ))}
            </div>
          </div>

          {/* Q Line Builder */}
          <div className="bg-black/30 border border-sky-400/20 rounded-xl p-3 space-y-3">
            <div className="text-sky-400 text-xs font-bold uppercase tracking-widest">Q) Line Builder</div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Lbl label="FIR Indicator" />
                {renderSI({ f: "firIndicator", ph: "e.g. TBAD" })}
              </div>
              <div>
                <Lbl label="Coords + Radius" />
                {renderSI({ f: "coordRadius", ph: "e.g. 1304N05930W005" })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Lbl label="Subject Code" f="subjectCode" />
                <input type="text" className={inputCls('subjectCode')}
                  value={form.subjectCode ?? ''} readOnly={submitted}
                  onChange={e => upd('subjectCode', e.target.value.toUpperCase())}
                  placeholder="e.g. NI, RW, LP" />
                <CodeLookup codes={SUBJECT_CODES} disabled={submitted}
                  onPick={c => upd('subjectCode', c)} />
              </div>
              <div>
                <Lbl label="Condition Code" f="conditionCode" />
                <input type="text" className={inputCls('conditionCode')}
                  value={form.conditionCode ?? ''} readOnly={submitted}
                  onChange={e => upd('conditionCode', e.target.value.toUpperCase())}
                  placeholder="e.g. XX, LC, CA" />
                <CodeLookup codes={CONDITION_CODES} disabled={submitted}
                  onPick={c => upd('conditionCode', c)} />
              </div>
            </div>

            <div>
              <Lbl label="Traffic" f="traffic" />
              <BtnGroup value={form.traffic ?? ''} opts={TRAFFIC_OPTS}
                onChange={v => upd('traffic', v)} disabled={submitted} isCorrect={fi('traffic')} />
            </div>

            <div>
              <Lbl label="Purpose" f="purpose" />
              <BtnGroup value={form.purpose ?? ''} opts={PURPOSE_OPTS}
                onChange={v => upd('purpose', v)} disabled={submitted} isCorrect={fi('purpose')} />
            </div>

            <div>
              <Lbl label="Scope" f="scope" />
              <BtnGroup value={form.scope ?? ''} opts={SCOPE_OPTS}
                onChange={v => upd('scope', v)} disabled={submitted} isCorrect={fi('scope')} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Lbl label="Lower Limit (3 digits)" f="lower" />
                {renderSI({ f: "lower", ph: "000" })}
              </div>
              <div>
                <Lbl label="Upper Limit (3 digits)" f="upper" />
                {renderSI({ f: "upper", ph: "999" })}
              </div>
            </div>

            <div className="bg-black/40 border border-sky-400/30 rounded-lg p-2 mt-1">
              <div className="text-white/40 text-xs uppercase mb-1">Live Preview</div>
              <div className="font-mono text-sky-300 text-xs break-all">{qLine}</div>
            </div>
          </div>

          {/* A-G Items */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Lbl label="A) Location" f="locationA" />
              {renderSI({ f: "locationA", ph: "e.g. TBPB" })}
            </div>
            <div />
            <div>
              <Lbl label="B) From (YYMMDDHHMM)" f="effectiveFrom" />
              {renderSI({ f: "effectiveFrom", ph: "2606030600" })}
            </div>
            <div>
              <Lbl label="C) To (YYMMDDHHMM/PERM)" f="effectiveTo" />
              {renderSI({ f: "effectiveTo", ph: "2606031800" })}
            </div>
          </div>

          <div>
            <Lbl label="D) Schedule (optional)" />
            {renderSI({ f: "schedule", ph: "Leave blank if 24/7" })}
          </div>

          <div>
            <Lbl label="E) NOTAM Text" f="notamText" />
            <textarea
              className={`${inputCls('notamText')} resize-none`}
              rows={3}
              value={form.notamText ?? ''}
              onChange={e => upd('notamText', e.target.value.toUpperCase())}
              placeholder="e.g. RWY 09 ILS CAT III UNSERVICEABLE."
              readOnly={submitted}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Lbl label="F) Lower (if applicable)" f="lowerLimit" />
              {renderSI({ f: "lowerLimit", ph: "SFC or 2500FT" })}
            </div>
            <div>
              <Lbl label="G) Upper (if applicable)" f="upperLimit" />
              {renderSI({ f: "upperLimit", ph: "FL120 or UNL" })}
            </div>
          </div>
        </div>

        {submitted ? (
          <div className={`mt-3 p-4 rounded-xl border ${earned >= task.maxScore * 0.7 ? 'border-green-400/50 bg-green-900/20' : earned >= task.maxScore * 0.4 ? 'border-amber-400/50 bg-amber-900/20' : 'border-red-400/50 bg-red-900/20'}`}>
            <div className="text-white font-bold text-base">Score: {earned} / {task.maxScore}</div>
            <div className="text-white/60 text-xs mt-1 mb-2">
              {Object.values(results).filter(Boolean).length} / {SCORED_NOTAM.length} fields correct
            </div>
            <details>
              <summary className="text-sky-400 text-xs cursor-pointer" style={{ touchAction: 'manipulation' }}>Show correct answers</summary>
              <div className="mt-2 space-y-0.5 font-mono text-xs">
                {SCORED_NOTAM.map(f => (
                  <div key={f} className={`flex gap-2 ${results[f] ? 'text-green-400' : 'text-red-400'}`}>
                    <span className="shrink-0">{results[f] ? '✓' : '✗'}</span>
                    <span className="text-white/50 shrink-0 w-24">{f}:</span>
                    <span className="break-all">{(task.correctAnswer as NOTAMCorrect)[f] || '(empty)'}</span>
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
            className="mt-3 w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors text-xs tracking-widest uppercase"
          >
            Publish NOTAM
          </button>
        )}
      </form>
    </div>
  );
};
