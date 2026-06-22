import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';
const cadLogo = '/assets/cad_logo_barbados.png';

interface CoverPageForm {
  productType: string;
  productTitle: string;
  icaoLocation: string;
  effectiveDate: string;
  issueNumber: string;
  authority: string;
  preparedBy: string;
  distribution: string;
}

const SCORED_FIELDS: (keyof CoverPageForm)[] = [
  'productType', 'productTitle', 'icaoLocation',
  'effectiveDate', 'issueNumber', 'authority',
  'preparedBy', 'distribution',
];

const PRODUCT_TYPES = [
  'AIRAC Amendment',
  'AIP Supplement',
  'AIP Amendment',
  'AIC',
];

const DISTRIBUTION_OPTIONS = [
  'ALL NOTAM OFFICES / DISTRIBUTED LISTS',
  'INTERNAL ONLY',
  'AERODROME OPERATORS ONLY',
  'AIRLINES AND OPERATORS',
];

// ICAO content requirements per static product type (Annex 15 / Doc 8126).
// Drives the live document preview's reference cell + body.
const PRODUCT_SPECS: Record<string, { label: string; ref: string; icao: string }> = {
  'AIRAC Amendment': {
    label: 'AIP AMENDMENT — AIRAC',
    ref: 'AIRAC AMDT',
    icao: 'Permanent change tied to the 28-day AIRAC cycle. Issued with replacement pages and charts; effective only on the AIRAC date so operators can update navigation databases in step.',
  },
  'AIP Amendment': {
    label: 'AIP AMENDMENT — NON-AIRAC',
    ref: 'AIP AMDT',
    icao: 'Permanent change to the AIP published outside the AIRAC cycle when immediate amendment is required. Replacement pages only — no charting lead time.',
  },
  'AIP Supplement': {
    label: 'AIP SUPPLEMENT',
    ref: 'AIP SUP',
    icao: 'Temporary change of long duration (typically 3 months or more), or short-duration change with extensive text/graphics. Carries a defined validity period and appears on the AIP SUP checklist.',
  },
  'AIC': {
    label: 'AERONAUTICAL INFORMATION CIRCULAR',
    ref: 'AIC',
    icao: 'Advisory or explanatory information that does not qualify for the AIP or a NOTAM. Identified by Series (A, B, …) and number/year. No direct effect on AIP data or operational procedures.',
  },
};

export const CoverPageGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [form, setForm] = useState<CoverPageForm>({
    productType: '', productTitle: '', icaoLocation: 'TBPB',
    effectiveDate: '', issueNumber: '', authority: 'Barbados Civil Aviation Department',
    preparedBy: '', distribution: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    if (task) {
      setForm({
        productType: '', productTitle: '', icaoLocation: 'TBPB',
        effectiveDate: '', issueNumber: '',
        authority: 'Barbados Civil Aviation Department',
        preparedBy: '', distribution: '',
      });
      setSubmitted(false);
      setResults({});
      setEarned(0);
    }
  }, [task?.id]);

  if (!task || task.type !== 'COVER_PAGE') return null;

  const ca: CoverPageForm = task.correctAnswer;
  const spec = PRODUCT_SPECS[form.productType];

  const upd = (f: keyof CoverPageForm, v: string) => {
    if (!submitted) setForm(prev => ({ ...prev, [f]: v }));
  };

  // Open-ended answers are accepted in flexible formats. Dates and issue numbers
  // ignore separators/case; the title is accepted if it contains the required
  // keywords (product ref + issue number + subject), not one exact string.
  const norm = (s: string) => (s ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  const alnum = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const titleKeywords: string[] | undefined = (task.correctAnswer as any).titleKeywords;

  const fieldCorrect = (f: keyof CoverPageForm): boolean => {
    const u = form[f] ?? '';
    const c = ca[f] ?? '';
    if (f === 'effectiveDate' || f === 'issueNumber') return alnum(u) === alnum(c);
    if (f === 'productTitle') {
      const kws = titleKeywords && titleKeywords.length ? titleKeywords : [c];
      return kws.every(k => alnum(u).includes(alnum(k)));
    }
    return norm(u) === norm(c);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    const res: Record<string, boolean> = {};
    let correct = 0;
    SCORED_FIELDS.forEach(f => {
      const ok = fieldCorrect(f);
      res[f] = ok;
      if (ok) correct++;
    });
    const score = Math.round((correct / SCORED_FIELDS.length) * task.maxScore);
    const feedback = `${correct}/${SCORED_FIELDS.length} fields correct — ${score} pts`;
    setResults(res);
    setEarned(score);
    setSubmitted(true);
    submitTask(task.id, score, task.maxScore, feedback);
  };

  const renderField = ({
    label, field, el = 'input', options, hint,
  }: {
    label: string; field: keyof CoverPageForm;
    el?: 'input' | 'select'; options?: string[]; hint?: string;
  }) => {
    const ok = results[field];
    const base = 'w-full bg-black/30 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none ';
    const borderCls = submitted
      ? ok ? 'border-green-500' : 'border-red-500'
      : 'border-white/20 focus:border-sky-400';

    return (
      <div>
        <label className="block text-xs text-white/50 uppercase tracking-widest mb-1">
          {label}
          {submitted && !ok && (
            <span className="ml-2 text-red-400 normal-case font-normal">
              ✗ correct: <span className="text-green-400">{ca[field]}</span>
            </span>
          )}
          {submitted && ok && <span className="ml-2 text-green-400">✓</span>}
        </label>
        {hint && !submitted && <p className="text-white/30 text-xs mb-1">{hint}</p>}
        {el === 'select' ? (
          <select
            className={base + borderCls + ' bg-slate-800'}
            value={form[field]}
            onChange={e => upd(field, e.target.value)}
            disabled={submitted}
          >
            <option value="">— select —</option>
            {options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            className={base + borderCls}
            value={form[field]}
            onChange={e => upd(field, e.target.value)}
            disabled={submitted}
            spellCheck={false}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 bg-black/20 border border-white/10 rounded-xl p-4 mb-3 text-sm text-white/70 leading-relaxed">
        <span className="text-sky-400 font-bold uppercase text-xs tracking-widest">Scenario: </span>
        {task.scenario.situation}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* ── Live static-product document on the official AIS Barbados letterhead ── */}
        <div className="bg-white text-black rounded-lg overflow-hidden border-2 border-black shadow-lg">
          <div className="bg-black text-white text-center font-bold tracking-wide py-1.5 px-2 text-sm md:text-base">
            AERONAUTICAL INFORMATION SERVICES - BARBADOS
          </div>
          <div className="grid grid-cols-[1.3fr_1fr_1.1fr] border-t-2 border-black text-[10px] md:text-xs">
            <div className="p-2 border-r-2 border-black leading-snug">
              <div>Air Traffic Services Building</div>
              <div>Grantley Adams International Airport</div>
              <div>Christ Church</div>
              <div>Barbados</div>
              <div className="h-2" />
              <div>Phone: (246) 536-3611</div>
              <div>Fax:&nbsp;&nbsp;&nbsp;&nbsp;(246) 535-0015</div>
              <div>AFS:&nbsp;&nbsp;&nbsp;&nbsp;TBPBZPZX</div>
              <div>Email: cad.bgiais@barbados.gov.bb</div>
            </div>
            <div className="border-r-2 border-black flex items-center justify-center p-1">
              <img src={cadLogo} alt="Barbados Civil Aviation Department" className="max-h-20 object-contain" />
            </div>
            <div className="p-2 leading-snug">
              <div className="font-bold text-xs md:text-sm">
                {spec ? spec.ref : 'PRODUCT'} {form.issueNumber || '—'}
              </div>
              <div className="mt-1.5 text-[9px] md:text-[10px] uppercase tracking-wide text-black/50">Location</div>
              <div>{form.icaoLocation || '—'}</div>
              <div className="mt-1 text-[9px] md:text-[10px] uppercase tracking-wide text-black/50">Effective</div>
              <div>{form.effectiveDate || '—'}</div>
            </div>
          </div>
          <div className="border-t-2 border-black p-3 min-h-[120px]">
            {/* Body heading: only the title (GEN/ENR/AD or content heading); AIRAC also shows the effective date */}
            <div className="text-center font-bold underline text-xs md:text-sm">
              {form.productTitle || '— content heading (e.g. ENR 3.1, AD 2 TBPB, GEN 1.2) —'}
            </div>
            {form.productType === 'AIRAC Amendment' && (
              <div className="text-center font-semibold mt-1 text-[11px] md:text-xs">
                AIRAC effective date: {form.effectiveDate || '—'}
              </div>
            )}
            <div className="mt-3 text-[11px] leading-relaxed text-black/80">
              <span className="font-bold">ICAO content: </span>
              {spec ? spec.icao : 'Select a publication type below to see the ICAO content requirements for this static product.'}
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] border-t border-black/10 pt-2">
              <div><span className="text-black/50">Issuing authority: </span>{form.authority || '—'}</div>
              <div><span className="text-black/50">Distribution: </span>{form.distribution || '—'}</div>
              <div><span className="text-black/50">Prepared by: </span>{form.preparedBy || '—'}</div>
            </div>
          </div>
        </div>

        {/* ── Input form (scored) ── */}
        <div className="bg-black/20 border border-amber-400/20 rounded-xl p-5">
          <div className="text-white/40 text-xs uppercase tracking-widest mb-3">Complete the static product</div>
          <div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {renderField({
                  label: 'Publication Type',
                  field: 'productType',
                  el: 'select',
                  options: PRODUCT_TYPES,
                })}
                {renderField({
                  label: 'ICAO Location / FIR',
                  field: 'icaoLocation',
                  hint: 'e.g. TBPB or TBAD',
                })}
              </div>
              {renderField({
                label: 'Publication Title',
                field: 'productTitle',
                hint: 'Full title as it appears on the document (e.g. AIP BARBADOS AMENDMENT 02/2026)',
              })}
              <div className="grid grid-cols-2 gap-3">
                {renderField({
                  label: 'Effective Date (YYMMDD)',
                  field: 'effectiveDate',
                  hint: 'e.g. 260703',
                })}
                {renderField({
                  label: 'Issue / Amendment Number',
                  field: 'issueNumber',
                  hint: 'e.g. 03/2026',
                })}
              </div>
              {renderField({
                label: 'Issuing Authority',
                field: 'authority',
              })}
              {renderField({
                label: 'Prepared By (Name / Position)',
                field: 'preparedBy',
                hint: 'AIS Officer name and rank/position',
              })}
              {renderField({
                label: 'Distribution',
                field: 'distribution',
                el: 'select',
                options: DISTRIBUTION_OPTIONS,
              })}

              {!submitted && (
                <button
                  type="submit"
                  style={{ touchAction: 'manipulation' }}
                  className="w-full mt-2 bg-sky-500 hover:bg-sky-400 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Submit Cover Page
                </button>
              )}

              {submitted && (
                <div className={`text-center py-3 rounded-lg font-bold text-lg ${earned >= task.maxScore * 0.6 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {earned} / {task.maxScore} pts — {results ? Object.values(results).filter(Boolean).length : 0}/{SCORED_FIELDS.length} fields correct
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
