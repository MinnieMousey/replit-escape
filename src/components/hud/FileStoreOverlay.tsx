import React, { useMemo, useState } from 'react';
import { useShift } from '@/context/ShiftContext';
import {
  MESSAGE_KIND_META, SortKey, sortMessages, StoreMessage,
  STORE_FOLDERS, folderMeta, messageFolders,
} from '@/lib/fileStore';
import { toIcaoFreeText } from '@/lib/icaoFormat';

type View = 'pending' | 'processed';

const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: 'sent', label: 'Time sent' },
  { key: 'flightDate', label: 'Flight date' },
  { key: 'callsign', label: 'Callsign A–Z' },
];

/**
 * File store contents, rendered without any outer chrome so it can be dropped
 * straight into a {@link FloatingWindow}. Keeps all folders / filters / sort /
 * Ack / Process / Forward behaviour intact.
 */
export const FileStoreBody: React.FC = () => {
  const { fileStore, ackMessage, processMessage, forwardMessage } = useShift();

  const [folderId, setFolderId] = useState<string | null>(null);
  const [view, setView] = useState<View>('pending');
  const [sortKey, setSortKey] = useState<SortKey>('sent');
  const [asc, setAsc] = useState(true);
  const [callsignFilter, setCallsignFilter] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  // Folders that currently hold any messages, in the canonical directory order.
  // A message can belong to more than one folder, so count across all of them.
  const folders = useMemo(() => {
    const counts = new Map<string, { total: number; unacked: number; pending: number }>();
    for (const m of fileStore) {
      for (const fid of messageFolders(m)) {
        const c = counts.get(fid) ?? { total: 0, unacked: 0, pending: 0 };
        c.total += 1;
        if (!m.acked) c.unacked += 1;
        if (!m.processed) c.pending += 1;
        counts.set(fid, c);
      }
    }
    return STORE_FOLDERS
      .map(f => ({ folder: f, ...(counts.get(f.id) ?? { total: 0, unacked: 0, pending: 0 }) }))
      .filter(f => f.total > 0);
  }, [fileStore]);

  const activeFolderId = folderId && folders.some(f => f.folder.id === folderId)
    ? folderId
    : folders[0]?.folder.id ?? null;

  const visible = useMemo(() => {
    const want = callsignFilter.trim().toUpperCase();
    const filtered = fileStore.filter(m =>
      messageFolders(m).includes(activeFolderId ?? '') &&
      (view === 'pending' ? !m.processed : m.processed) &&
      (want === '' || m.callsign.toUpperCase().includes(want)),
    );
    return sortMessages(filtered, sortKey, asc);
  }, [fileStore, activeFolderId, view, callsignFilter, sortKey, asc]);

  const totalUnacked = fileStore.filter(m => !m.acked).length;
  const detailMsg = detailId ? fileStore.find(m => m.id === detailId) ?? null : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
        {/* Sub-header — counts */}
        <div className="shrink-0 px-4 py-2 border-b border-white/10">
          <p className="text-white/40 text-xs">
            Filed messages by AFTN addressee · {fileStore.length} on file
            {totalUnacked > 0 && <span className="text-amber-300"> · {totalUnacked} un-acked</span>}
          </p>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left — folder list */}
          <div className="w-44 sm:w-56 shrink-0 border-r border-white/10 overflow-y-auto p-2 space-y-1">
            {folders.length === 0 && (
              <p className="text-white/30 text-xs italic p-3">No messages on file yet.</p>
            )}
            {folders.map(({ folder, total, unacked, pending }) => {
              const sel = folder.id === activeFolderId;
              return (
                <button
                  key={folder.id}
                  onClick={() => setFolderId(folder.id)}
                  data-testid={`filestore-folder-${folder.id}`}
                  style={{ touchAction: 'manipulation' }}
                  className={`w-full text-left p-2.5 rounded-lg border text-sm transition-colors ${
                    sel
                      ? 'border-sky-400 bg-sky-900/30'
                      : 'border-white/15 bg-black/20 hover:bg-white/10 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{sel ? '📂' : '📁'}</span>
                    <span className="font-semibold text-white/90 text-xs leading-tight truncate">
                      {folder.country}
                    </span>
                    {unacked > 0 && (
                      <span className="ml-auto shrink-0 text-[10px] font-bold bg-amber-500/30 text-amber-200 rounded-full px-1.5 py-0.5">
                        {unacked}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1 pl-7">
                    <span className="font-mono text-[11px] font-bold text-sky-300/80">{folder.aftn}</span>
                    <span className="text-[10px] text-white/40">{pending} pend · {total}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right — messages */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* View tabs + controls */}
            <div className="shrink-0 border-b border-white/10 px-3 py-2 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView('pending')}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="filestore-tab-pending"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    view === 'pending'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-white/15 bg-black/20 text-white/50 hover:text-white/80'
                  }`}
                >Needs processing</button>
                <button
                  onClick={() => setView('processed')}
                  style={{ touchAction: 'manipulation' }}
                  data-testid="filestore-tab-processed"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    view === 'processed'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-white/15 bg-black/20 text-white/50 hover:text-white/80'
                  }`}
                >Processed</button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-white/30">Sort</span>
                {SORT_LABELS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSortKey(s.key)}
                    style={{ touchAction: 'manipulation' }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                      sortKey === s.key
                        ? 'border-sky-400 bg-sky-900/30 text-sky-200'
                        : 'border-white/15 bg-black/20 text-white/50 hover:text-white/80'
                    }`}
                  >{s.label}</button>
                ))}
                <button
                  onClick={() => setAsc(v => !v)}
                  style={{ touchAction: 'manipulation' }}
                  title={asc ? 'Ascending' : 'Descending'}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-white/15 bg-black/20 text-white/60 hover:text-white"
                >{asc ? '↑' : '↓'}</button>
                <input
                  type="text"
                  value={callsignFilter}
                  onChange={e => setCallsignFilter(e.target.value)}
                  placeholder="Filter callsign…"
                  data-testid="filestore-filter-callsign"
                  className="ml-auto bg-white/5 border border-white/20 rounded-md px-2.5 py-1 text-white text-xs w-32 focus:border-sky-400 outline-none placeholder-white/30"
                />
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {visible.length === 0 ? (
                <p className="text-white/30 text-xs italic p-3">
                  No {view === 'pending' ? 'messages needing processing' : 'processed messages'} in this folder.
                </p>
              ) : (
                visible.map(m => (
                  <MessageRow
                    key={m.id}
                    msg={m}
                    onAck={() => ackMessage(m.id)}
                    onProcess={() => processMessage(m.id)}
                    onForward={() => forwardMessage(m.id)}
                    onOpen={() => setDetailId(m.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

      {detailMsg && (
        <MessageDetail msg={detailMsg} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
};

const TRAFFIC_BADGE: Record<string, { label: string; cls: string }> = {
  inbound:    { label: 'INBOUND', cls: 'text-cyan-200 border-cyan-400/50 bg-cyan-900/30' },
  overflight: { label: 'OVERFLIGHT', cls: 'text-fuchsia-200 border-fuchsia-400/50 bg-fuchsia-900/30' },
};

const MessageRow: React.FC<{
  msg: StoreMessage;
  onAck: () => void;
  onProcess: () => void;
  onForward: () => void;
  onOpen: () => void;
}> = ({ msg, onAck, onProcess, onForward, onOpen }) => {
  const meta = MESSAGE_KIND_META[msg.kind];
  const traffic = msg.traffic ? TRAFFIC_BADGE[msg.traffic] : null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-start gap-2">
        <span className={`shrink-0 font-mono text-[10px] font-bold rounded px-1.5 py-0.5 border ${meta.color}`}>
          {meta.label}
        </span>
        <button
          onClick={onOpen}
          data-testid={`filestore-open-${msg.id}`}
          style={{ touchAction: 'manipulation' }}
          className="flex-1 min-w-0 text-left group"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-sm text-white truncate group-hover:text-sky-300 ${msg.acked ? 'font-normal' : 'font-bold'}`}>
              {msg.callsign}
            </span>
            {!msg.acked && (
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Un-acknowledged" />
            )}
            {traffic && (
              <span className={`shrink-0 font-mono text-[9px] font-bold rounded px-1.5 py-0.5 border ${traffic.cls}`}>
                {traffic.label}
              </span>
            )}
            {msg.foreign && (
              <span className="shrink-0 font-mono text-[9px] font-bold rounded px-1.5 py-0.5 border text-amber-200 border-amber-400/40 bg-amber-900/20">
                FOREIGN
              </span>
            )}
            {msg.forwarded && (
              <span className="shrink-0 font-mono text-[9px] font-bold rounded px-1.5 py-0.5 border text-emerald-200 border-emerald-400/50 bg-emerald-900/30">
                FWD ✓
              </span>
            )}
          </div>
          <p className="text-white/60 text-xs mt-0.5 leading-snug">{msg.detail}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-white/40 font-mono">
            <span>Sent {msg.timeSent}</span>
            <span>DOF {msg.flightDate}</span>
            {(msg.dep || msg.dest) && (
              <span>{msg.dep ?? '—'} → {msg.dest ?? '—'}</span>
            )}
            <span className="text-sky-300/60">{msg.addressee}</span>
            {msg.atcUnit && (
              <span className="text-fuchsia-300/70">→ {msg.atcUnit}{msg.forwarded ? '' : ' (relay)'}</span>
            )}
          </div>
          <p className="text-sky-300/50 text-[10px] mt-1 group-hover:text-sky-300">Open ICAO message ↗</p>
        </button>
        <div className="flex flex-col gap-1.5 shrink-0">
          {!msg.acked && (
            <button
              onClick={onAck}
              style={{ touchAction: 'manipulation' }}
              data-testid={`filestore-ack-${msg.id}`}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/30 transition-colors"
            >Ack</button>
          )}
          {msg.traffic && !msg.forwarded && (
            <button
              onClick={onForward}
              style={{ touchAction: 'manipulation' }}
              data-testid={`filestore-forward-${msg.id}`}
              title={msg.atcUnit ? `Forward to ${msg.atcUnit}` : 'Forward to ATC'}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-200 hover:bg-fuchsia-500/30 transition-colors"
            >Forward</button>
          )}
          {!msg.processed && !msg.traffic && (
            <button
              onClick={onProcess}
              style={{ touchAction: 'manipulation' }}
              data-testid={`filestore-process-${msg.id}`}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-400/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/30 transition-colors"
            >Process</button>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageDetail: React.FC<{ msg: StoreMessage; onClose: () => void }> = ({ msg, onClose }) => {
  const meta = MESSAGE_KIND_META[msg.kind];
  const icao = toIcaoFreeText(msg);
  const traffic = msg.traffic ? TRAFFIC_BADGE[msg.traffic] : null;
  const folderList = messageFolders(msg).map(folderMeta);
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900/98 border border-white/20 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="shrink-0 px-5 py-3 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[10px] font-bold rounded px-1.5 py-0.5 border ${meta.color}`}>
              {meta.label}
            </span>
            <span className="font-mono text-sm font-bold text-white">{msg.callsign}</span>
            {traffic && (
              <span className={`font-mono text-[9px] font-bold rounded px-1.5 py-0.5 border ${traffic.cls}`}>
                {traffic.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            data-testid="filestore-detail-close"
            className="text-white/40 hover:text-white text-2xl leading-none px-1"
          >×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Summary</div>
            <p className="text-white/80 text-sm leading-snug">{msg.detail}</p>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
              ICAO message (Doc 4444 free-text)
            </div>
            <pre
              data-testid="filestore-detail-icao"
              className="font-mono text-[12px] leading-relaxed text-emerald-200 bg-black/40 border border-emerald-400/20 rounded-lg p-3 whitespace-pre-wrap break-words"
            >{icao}</pre>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] font-mono">
            <Field label="Sent" value={msg.timeSent} />
            <Field label="DOF" value={msg.flightDate} />
            {msg.dep && <Field label="ADEP" value={msg.dep} />}
            {msg.dest && <Field label="ADES" value={msg.dest} />}
            <Field label="Addressee" value={msg.addressee} />
            {msg.atcUnit && <Field label="Relay to" value={msg.atcUnit} />}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Filed in folders</div>
            <div className="flex flex-wrap gap-1.5">
              {folderList.map(f => (
                <span key={f.id} className="font-mono text-[11px] rounded-md px-2 py-1 border border-white/15 bg-black/30 text-white/70">
                  {f.country} <span className="text-sky-300/70">{f.aftn}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <StatusPill on={msg.acked} label="Acknowledged" />
            {msg.traffic
              ? <StatusPill on={!!msg.forwarded} label={`Forwarded${msg.atcUnit ? ` → ${msg.atcUnit}` : ''}`} />
              : <StatusPill on={msg.processed} label="Processed" />}
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="text-white/40 w-20 shrink-0">{label}</span>
    <span className="text-white/90 truncate">{value}</span>
  </div>
);

const StatusPill: React.FC<{ on: boolean; label: string }> = ({ on, label }) => (
  <span className={`font-bold rounded-full px-2.5 py-1 border ${
    on
      ? 'text-emerald-200 border-emerald-400/50 bg-emerald-900/30'
      : 'text-white/40 border-white/15 bg-black/20'
  }`}>
    {on ? '✓ ' : '○ '}{label}
  </span>
);
