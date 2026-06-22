import React, { useState, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';
import { FplApprovalSubmitted, FPL_APPROVAL_CHECK_FIELDS } from '@/lib/taskGenerator';
import { folderForAddressee } from '@/lib/fileStore';

type CheckMark = 'ok' | 'err';
type Decision = 'approve' | 'reject';

// Derive officer initials from the signed-in Cromos username (local-only account).
function officerInitials(): string {
  try {
    const raw = localStorage.getItem('cromos-account');
    if (!raw) return '';
    const acc = JSON.parse(raw) as { username?: string };
    const u = (acc.username ?? '').trim();
    if (!u) return '';
    const parts = u.split(/[^A-Za-z0-9]+/).filter(Boolean);
    const letters = (parts.length > 1 ? parts.map(p => p[0]).join('') : u)
      .toUpperCase().replace(/[^A-Z0-9]/g, '');
    return letters.slice(0, 3);
  } catch {
    return '';
  }
}

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');

// ── Official ICAO FPL form (read-only, as submitted) ─────────────────────────
// Equipment (Item 10) and the SSR/Mode code are ICAO-codified strings that a
// natural briefing does not dictate and that the approval game does not score, so
// they are shown with a standard modern-airliner value purely to complete the
// recognisable boxed template.
const STD_EQUIP = 'SDFGHIRWY';
const STD_SSR = 'S';

const FormCaption: React.FC<{ num?: string; children: React.ReactNode }> = ({ num, children }) => (
  <div className="flex items-baseline gap-1 mb-0.5">
    {num && <span className="text-[10px] font-bold text-slate-800">{num}</span>}
    <span className="text-[10px] uppercase tracking-wide text-slate-600 font-semibold">{children}</span>
  </div>
);

const ValBox: React.FC<{ value?: string; className?: string }> = ({ value, className }) => (
  <div className={`border border-slate-400 bg-white px-2 min-h-[28px] flex items-center font-mono text-[13px] text-slate-900 ${className ?? ''}`}>
    {value && value.trim()
      ? value
      : <span className="text-slate-400 italic font-sans text-[11px]">— blank —</span>}
  </div>
);

// teleprinter end-of-line marker
const End: React.FC = () => (
  <span className="font-mono font-bold text-slate-800 text-sm select-none shrink-0">&lt;=</span>
);

const OfficialFplForm: React.FC<{
  sub: FplApprovalSubmitted;
  flightDate: string;
  originator: string;
  originatorType: string;
}> = ({ sub, flightDate, originator, originatorType }) => {
  const typeOfFlight = originatorType === 'Private Operator' ? 'N' : 'S';
  const fr = (sub.flightRules ?? '').toUpperCase();
  const flightRule = fr === 'IFR' ? 'I' : fr === 'VFR' ? 'V' : sub.flightRules;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Submitted by</div>
          <div className="text-sm text-white/90 font-bold truncate">{originator}</div>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-widest border border-amber-400/50 text-amber-300 font-bold px-2 py-0.5 rounded">
          {originatorType}
        </span>
      </div>

      <div className="bg-[#f6f4ee] text-slate-900 rounded-xl border border-slate-300 shadow-inner overflow-hidden">
        {/* Title bar */}
        <div className="border-b-2 border-slate-800 px-3 py-2 flex items-center gap-3">
          <div className="text-[9px] leading-tight text-slate-600 shrink-0">
            <div>International Civil Aviation Organization</div>
            <div className="font-semibold">Flight Plan — as submitted</div>
          </div>
          <h2 className="flex-1 text-center text-base font-bold tracking-wide text-slate-900">FLIGHT PLAN</h2>
          <div className="w-8 shrink-0" />
        </div>

        <div className="p-3 space-y-2.5">
          {/* AFTN telegram header (decorative — completed by the AIS) */}
          <div className="border border-slate-300 rounded p-2.5 bg-white/40">
            <div className="grid grid-cols-[70px_1fr] gap-2 items-end">
              <div>
                <FormCaption>Priority</FormCaption>
                <ValBox value="FF" className="font-bold justify-center" />
              </div>
              <div>
                <FormCaption>Originator</FormCaption>
                <ValBox value={originator} className="text-[12px]" />
              </div>
            </div>
            <div className="text-[9px] text-slate-400 mt-1.5 italic">AFTN header is completed automatically by the AIS.</div>
          </div>

          {/* Items 3 / 7 / 8 */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-end">
            <div>
              <FormCaption num="3">Type</FormCaption>
              <ValBox value="(FPL" className="font-bold" />
            </div>
            <div className="min-w-0">
              <FormCaption num="7">Aircraft Identification</FormCaption>
              <ValBox value={sub.callsign} className="font-bold" />
            </div>
            <div className="w-16">
              <FormCaption num="8">Rules</FormCaption>
              <ValBox value={flightRule} className="justify-center" />
            </div>
            <div className="w-16">
              <FormCaption>Flight</FormCaption>
              <ValBox value={typeOfFlight} className="justify-center" />
            </div>
            <div className="self-center"><End /></div>
          </div>

          {/* Items 9 / 10 */}
          <div className="grid grid-cols-[auto_1fr_auto_1.5fr_auto] gap-2 items-end">
            <div className="w-12">
              <FormCaption num="9">No.</FormCaption>
              <ValBox value="1" className="justify-center" />
            </div>
            <div className="min-w-0">
              <FormCaption>Type of Aircraft</FormCaption>
              <ValBox value={sub.aircraftType} />
            </div>
            <div className="w-16">
              <FormCaption>Wake</FormCaption>
              <ValBox value={sub.wakeCategory} className="justify-center" />
            </div>
            <div className="min-w-0">
              <FormCaption num="10">Equipment / SSR</FormCaption>
              <ValBox value={`${STD_EQUIP} / ${STD_SSR}`} className="text-[11px]" />
            </div>
            <div className="self-center"><End /></div>
          </div>

          {/* Item 13 */}
          <div className="grid grid-cols-[1.4fr_1fr_auto] gap-2 items-end">
            <div className="min-w-0">
              <FormCaption num="13">Departure Aerodrome</FormCaption>
              <ValBox value={`${sub.dep}${sub.depName ? ` (${sub.depName})` : ''}`} />
            </div>
            <div>
              <FormCaption>Time (EOBT)</FormCaption>
              <ValBox value={sub.eobt} />
            </div>
            <div className="self-center"><End /></div>
          </div>

          {/* Item 15 — speed / level / route */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FormCaption num="15">Cruising Speed</FormCaption>
              <ValBox value={sub.speed} />
            </div>
            <div>
              <FormCaption>Level</FormCaption>
              <ValBox value={sub.level} />
            </div>
          </div>
          <div>
            <FormCaption>Route</FormCaption>
            <div className="flex items-start gap-1">
              <div className="flex-1 border border-slate-400 bg-white px-2 py-1 font-mono text-[13px] text-slate-900 min-h-[44px] whitespace-pre-wrap leading-snug break-words">
                {sub.route && sub.route.trim()
                  ? sub.route
                  : <span className="text-slate-400 italic font-sans text-[11px]">— blank —</span>}
              </div>
              <div className="pt-1"><End /></div>
            </div>
          </div>

          {/* Item 16 — destination / EET / alternate */}
          <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2 items-end">
            <div className="min-w-0">
              <FormCaption num="16">Destination</FormCaption>
              <ValBox value={`${sub.dest}${sub.destName ? ` (${sub.destName})` : ''}`} />
            </div>
            <div>
              <FormCaption>Total EET</FormCaption>
              <ValBox value={sub.totalEet} />
            </div>
            <div>
              <FormCaption>Altn</FormCaption>
              <ValBox value={sub.altn} />
            </div>
            <div className="self-center"><End /></div>
          </div>

          {/* Item 18 — other information */}
          <div>
            <FormCaption num="18">Other Information</FormCaption>
            <div className="flex items-start gap-1">
              <ValBox value={`DOF/${flightDate}`} className="flex-1" />
              <End />
            </div>
          </div>

          {/* Item 19 — supplementary */}
          <div className="border border-slate-400 rounded bg-white/50 p-3 space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-700 text-center border-b border-slate-300 pb-1">
              19 — Supplementary Information
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormCaption>E/ Endurance</FormCaption>
                <ValBox value={sub.endurance} />
              </div>
              <div>
                <FormCaption>P/ Persons on Board</FormCaption>
                <ValBox value={sub.pob} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const FplApprovalGame: React.FC = () => {
  const { activeTaskId, tasks, submitTask, addStoreMessage } = useShift();
  const task = tasks.find(t => t.id === activeTaskId);

  const [marks, setMarks]       = useState<Record<string, CheckMark>>({});
  const [decision, setDecision] = useState<Decision | null>(null);
  const [stamped, setStamped]   = useState(false);
  const [signature, setSignature] = useState('');
  const [addressee, setAddressee] = useState('');
  const [result, setResult]     = useState<{ award: number; vCorrect: number; decisionOk: boolean; stampOk: boolean; addrOk: boolean } | null>(null);

  useEffect(() => {
    if (task) {
      setMarks({});
      setDecision(null);
      setStamped(false);
      setSignature(officerInitials());
      setAddressee('');
      setResult(null);
    }
  }, [task?.id]);

  if (!task || task.type !== 'FPL_APPROVAL') return null;

  const s = task.scenario as {
    originator: string;
    originatorType: string;
    flightDate: string;
    submitted: FplApprovalSubmitted;
    filing: { callsign: string; kind: 'FPL'; addressee: string; flightDate: string };
  };
  const ca = task.correctAnswer as {
    errors: (keyof FplApprovalSubmitted)[];
    fieldNotes: Partial<Record<keyof FplApprovalSubmitted, string>>;
    mustReject: boolean;
    addressee: string;
    explanation: string;
  };
  const sub = s.submitted;
  const errorSet = new Set<string>(ca.errors as string[]);
  const submitted = result !== null;

  const setMark = (key: string, m: CheckMark) => {
    if (submitted) return;
    setMarks(prev => ({ ...prev, [key]: m }));
  };

  const allMarked = FPL_APPROVAL_CHECK_FIELDS.every(f => marks[f.key]);
  const canSubmit =
    allMarked &&
    decision !== null &&
    (decision === 'reject' || (stamped && signature.trim().length > 0 && addressee.trim().length > 0));

  const handleSubmit = () => {
    if (submitted || !canSubmit || decision === null) return;

    // Verification: a field is correct if the mark matches whether it is an error.
    let vCorrect = 0;
    FPL_APPROVAL_CHECK_FIELDS.forEach(f => {
      const isErr = errorSet.has(f.key as string);
      const want: CheckMark = isErr ? 'err' : 'ok';
      if (marks[f.key] === want) vCorrect++;
    });
    const vFrac = vCorrect / FPL_APPROVAL_CHECK_FIELDS.length;

    const decisionOk = (decision === 'reject') === ca.mustReject;

    let stampOk = false;
    let addrOk = false;
    let filingFrac = 0;
    if (decisionOk) {
      if (ca.mustReject) {
        filingFrac = 1; // correct rejection — no filing required
      } else {
        stampOk = stamped && signature.trim().length > 0;
        addrOk  = norm(addressee) === norm(ca.addressee);
        filingFrac = (stampOk ? 0.5 : 0) + (addrOk ? 0.5 : 0);
      }
    }

    const award = Math.round(
      task.maxScore * (vFrac * 0.4 + (decisionOk ? 0.3 : 0) + filingFrac * 0.3)
    );

    const summary = decisionOk
      ? (ca.mustReject
          ? `Correctly rejected — returned to ${s.originator}. ${vCorrect}/${FPL_APPROVAL_CHECK_FIELDS.length} fields verified correctly.`
          : `Approved & filed to ${ca.addressee}. ${vCorrect}/${FPL_APPROVAL_CHECK_FIELDS.length} fields verified correctly${addrOk ? '' : ', addressee incorrect'}.`)
      : (ca.mustReject
          ? `Incorrect — this plan had disqualifying errors and should have been rejected. ${ca.explanation}`
          : `Incorrect — this plan was acceptable and should have been approved & filed. ${ca.explanation}`);

    setResult({ award, vCorrect, decisionOk, stampOk, addrOk });
    submitTask(task.id, award, task.maxScore, summary);

    // Only a fully correct approve & file (right decision, stamped & signed, and
    // correct addressee) records the plan in the shift file store under the
    // addressee's folder as processed work — an incomplete filing must not
    // fabricate a filed record.
    if (decisionOk && !ca.mustReject && stampOk && addrOk) {
      addStoreMessage({
        kind: 'FPL',
        callsign: s.filing.callsign,
        folderId: folderForAddressee(ca.addressee),
        addressee: ca.addressee,
        flightDate: s.filing.flightDate,
        dep: sub.dep,
        dest: sub.dest,
        detail: `Filed to SELX — ${sub.dep} → ${sub.dest}, EOBT ${sub.eobt}`,
        acked: true,
        processed: true,
      });
    }
  };

  const total = FPL_APPROVAL_CHECK_FIELDS.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 mb-3">
        <div className="text-xs text-white/40 font-bold uppercase tracking-widest">FPL Approval &amp; SELX Filing</div>
        <p className="text-xs text-white/40 mt-1">
          A flight plan has arrived <span className="text-white/60">already filled in</span> by an outside party.
          Verify every field, then approve &amp; file it to SELX, or reject it back to the originator.
        </p>
      </div>

      {/* ── Split layout: source plan stays in view (left) while the officer works
            the verification, decision and filing (right). Each pane scrolls
            independently on md+ so a data-heavy plan never hides the source. ── */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 overflow-y-auto md:overflow-hidden">

        {/* ── LEFT: submitted plan as the official ICAO FPL form ── */}
        <div className="md:w-1/2 md:min-h-0 md:overflow-y-auto md:pr-1 shrink-0 md:shrink">
          <OfficialFplForm
            sub={sub}
            flightDate={s.flightDate}
            originator={s.originator}
            originatorType={s.originatorType}
          />
        </div>

        {/* ── RIGHT: verification, decision, filing ── */}
        <div className="md:w-1/2 md:min-h-0 md:overflow-y-auto md:pr-1 flex flex-col gap-3">

          {/* ── Verification checklist ── */}
          <div className="rounded-xl border border-white/15 bg-black/20 p-3 shrink-0">
            <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Step 1 — Verify each field</div>
            <p className="text-[11px] text-white/35 mb-3">Mark every field <span className="text-emerald-300">OK</span> if it is correct, or <span className="text-red-300">Error</span> if it is wrong or malformed.</p>
            <div className="space-y-1.5">
              {FPL_APPROVAL_CHECK_FIELDS.map(f => {
                const v = sub[f.key];
                const mark = marks[f.key];
                const isErr = errorSet.has(f.key as string);
                return (
                  <div key={f.key} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-white/50 uppercase tracking-wide truncate">{f.label}</div>
                      <div className="font-mono text-xs text-white/90 truncate">{v || <span className="text-white/30 italic">— blank —</span>}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        style={{ touchAction: 'manipulation' }}
                        disabled={submitted}
                        onClick={() => setMark(f.key, 'ok')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          mark === 'ok'
                            ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                            : 'border-white/15 bg-black/20 text-white/40 hover:text-white/70'
                        }`}
                      >OK</button>
                      <button
                        type="button"
                        style={{ touchAction: 'manipulation' }}
                        disabled={submitted}
                        onClick={() => setMark(f.key, 'err')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          mark === 'err'
                            ? 'border-red-400 bg-red-500/25 text-red-200'
                            : 'border-white/15 bg-black/20 text-white/40 hover:text-white/70'
                        }`}
                      >Error</button>
                    </div>
                    {submitted && (
                      <span className={`shrink-0 w-5 text-center font-bold ${
                        marks[f.key] === (isErr ? 'err' : 'ok') ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {marks[f.key] === (isErr ? 'err' : 'ok') ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {submitted && ca.errors.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-2 space-y-1">
                <div className="text-[11px] text-white/40 uppercase tracking-widest">Faults in this plan</div>
                {ca.errors.map(k => (
                  <div key={k} className="text-[11px] text-amber-200/80 leading-relaxed">
                    <span className="font-bold text-amber-300">{FPL_APPROVAL_CHECK_FIELDS.find(f => f.key === k)?.label}:</span>{' '}
                    {ca.fieldNotes[k]}
                  </div>
                ))}
              </div>
            )}
            {submitted && ca.errors.length === 0 && (
              <div className="mt-3 border-t border-white/10 pt-2 text-[11px] text-emerald-200/80">
                This plan was clean — no field errors. The correct verification is to mark every field OK.
              </div>
            )}
          </div>

          {/* ── Decision ── */}
          <div className="rounded-xl border border-white/15 bg-black/20 p-3 shrink-0">
            <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Step 2 — Decision</div>
            <p className="text-[11px] text-white/35 mb-3">
              Minor, correctable errors (a format slip, one wrong code) → <span className="text-emerald-300">approve</span> and fix before filing.
              Disqualifying errors (safety, missing required item, impossible data) → <span className="text-red-300">reject</span> and return it.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                style={{ touchAction: 'manipulation' }}
                disabled={submitted}
                onClick={() => setDecision('approve')}
                className={`flex-1 h-11 rounded-xl font-bold text-sm border transition-colors ${
                  decision === 'approve'
                    ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                    : 'border-white/15 bg-black/20 text-white/60 hover:text-white'
                }`}
              >✓ Approve &amp; File</button>
              <button
                type="button"
                style={{ touchAction: 'manipulation' }}
                disabled={submitted}
                onClick={() => setDecision('reject')}
                className={`flex-1 h-11 rounded-xl font-bold text-sm border transition-colors ${
                  decision === 'reject'
                    ? 'border-red-400 bg-red-500/25 text-red-200'
                    : 'border-white/15 bg-black/20 text-white/60 hover:text-white'
                }`}
              >✕ Reject &amp; Return</button>
            </div>
          </div>

          {/* ── Filing form (only on approve) ── */}
          {decision === 'approve' && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-900/10 p-3 shrink-0">
              <div className="text-xs text-emerald-300/80 font-bold uppercase tracking-widest mb-3">Step 3 — Stamp, sign &amp; file to SELX</div>

              <button
                type="button"
                style={{ touchAction: 'manipulation' }}
                disabled={submitted}
                onClick={() => setStamped(v => !v)}
                className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed font-bold text-sm uppercase tracking-widest transition-colors mb-3 ${
                  stamped
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                    : 'border-white/25 text-white/40 hover:text-white/70'
                }`}
              >
                {stamped ? '✓ APPROVED — AIS BARBADOS' : 'Tap to apply APPROVED stamp'}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] text-white/50 uppercase tracking-widest mb-1.5">Officer signature (initials)</label>
                  <input
                    type="text"
                    value={signature}
                    onChange={e => !submitted && setSignature(e.target.value.toUpperCase().slice(0, 4))}
                    readOnly={submitted}
                    data-testid="input-signature"
                    placeholder="e.g. JO"
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 h-11 text-white text-sm font-mono focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/50 uppercase tracking-widest mb-1.5">AFTN addressee (SELX)</label>
                  <input
                    type="text"
                    value={addressee}
                    onChange={e => !submitted && setAddressee(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 8))}
                    readOnly={submitted}
                    data-testid="input-addressee"
                    placeholder="8-letter address"
                    className={`w-full bg-black/30 border rounded-lg px-3 h-11 text-white text-sm font-mono tracking-widest focus:outline-none ${
                      submitted
                        ? (result?.addrOk ? 'border-green-500' : 'border-red-500')
                        : 'border-white/20 focus:border-emerald-400'
                    }`}
                  />
                </div>
              </div>
              <p className="text-[11px] text-white/35">
                Inbound plans are filed to the Barbados arrivals SELX address. Enter the correct 8-letter AFTN addressee.
              </p>
            </div>
          )}

          {/* ── Submit / result ── */}
          {!submitted ? (
            <button
              type="button"
              style={{ touchAction: 'manipulation' }}
              disabled={!canSubmit}
              onClick={handleSubmit}
              data-testid="button-submit-approval"
              className="shrink-0 h-12 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold text-sm uppercase tracking-widest transition-colors"
            >
              {decision === null
                ? 'Verify & decide to continue'
                : decision === 'reject'
                  ? 'Submit — Reject & Return'
                  : 'Submit — Stamp, Sign & File'}
            </button>
          ) : (
            <div className={`shrink-0 rounded-xl p-4 border ${
              result!.award >= task.maxScore * 0.7 ? 'border-green-400/50 bg-green-900/20'
              : result!.award >= task.maxScore * 0.4 ? 'border-amber-400/50 bg-amber-900/20'
              : 'border-red-400/50 bg-red-900/20'
            }`}>
              <div className="text-white font-bold text-base mb-1">Score: {result!.award} / {task.maxScore}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mb-2">
                <span className={result!.vCorrect === total ? 'text-green-400' : 'text-amber-400'}>
                  Verification: {result!.vCorrect}/{total}
                </span>
                <span className={result!.decisionOk ? 'text-green-400' : 'text-red-400'}>
                  Decision: {result!.decisionOk ? 'correct' : 'wrong'}
                </span>
                {ca.mustReject ? (
                  <span className="text-white/40">Filing: n/a (rejected)</span>
                ) : (
                  <>
                    <span className={result!.stampOk ? 'text-green-400' : 'text-red-400'}>
                      Stamp &amp; sign: {result!.stampOk ? 'done' : 'missing'}
                    </span>
                    <span className={result!.addrOk ? 'text-green-400' : 'text-red-400'}>
                      Addressee: {result!.addrOk ? 'correct' : ca.addressee}
                    </span>
                  </>
                )}
              </div>
              <p className="text-white/70 text-xs leading-relaxed">{ca.explanation}</p>
              <p className="text-white/30 text-xs mt-2">Select another task from the queue to continue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
