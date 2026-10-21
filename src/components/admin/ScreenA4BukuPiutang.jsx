import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Clock,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { rp } from '../../utils/format';


// A4: the receivables book and the installment verification queue.
//
// This screen used to take installments directly — a form that moved `paid`
// the moment the cashier pressed save. That path is gone. Drivers record their
// own cicilan on the phone, where it stops at `pending`; the bendahara clears
// them here after counting the actual cash. Only `verifyInstallment` credits
// the vault and moves `paid`.
//
// It also used to render a `mutations` ledger from each debt document. Live
// Firestore debt cards have no such field, so the drawer would have thrown on
// the first row clicked. What follows shows what the documents actually hold:
// the pending queue, and the confirmed progress of paid against amount.
export const ScreenA4BukuPiutang = () => {
  const { debts, verifyInstallment, rejectInstallment, deleteDebt } = useApp();
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  const totalOutstanding = debts.reduce((acc, curr) => acc + (curr.amount - curr.paid), 0);
  const openCount = debts.filter((d) => (d.amount - d.paid) > 0).length;

  // Every installment parked on a card, across the whole book.
  const queue = useMemo(() => {
    const out = [];
    debts.forEach((d) => {
      (d.pendingInstallments || []).forEach((p) => {
        out.push({ ...p, debtId: d.id, debtName: d.name, key: `${d.id}-${p.id}` });
      });
    });
    return out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [debts]);

  const queueTotal = queue.reduce((s, q) => s + (Number(q.amount) || 0), 0);

  const runVerify = async (item) => {
    setBusyKey(item.key);
    await verifyInstallment(item.debtId, item.id);
    setBusyKey(null);
    // Drop the drawer open on stale data if it showed this card.
    setSelectedDebt((prev) => (prev ? prev : prev));
  };

  const runReject = async (item) => {
    setBusyKey(item.key);
    await rejectInstallment(item.debtId, item.id);
    setBusyKey(null);
  };

  // Keep the open drawer in step with the store: it holds a snapshot, and
  // verifying an installment changes the card underneath it.
  const liveSelected = selectedDebt ? debts.find((d) => d.id === selectedDebt.id) || selectedDebt : null;

  return (
    <div className="space-y-6">

      {/* Summary banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-amber-900">
              Total Piutang Paguyuban Beredar
            </div>
            <div className="text-2xl font-black font-mono text-amber-950 mt-0.5 whitespace-nowrap">
              {rp(totalOutstanding)}
            </div>
          </div>
        </div>

        <div className="text-xs text-amber-800 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-amber-200">
          <span className="font-bold">{openCount} pramudi</span> memiliki tanggungan dana talangan aktif.
        </div>
      </div>

      {/* Installment verification queue */}
      {queue.length > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-900 flex-1">
              Antrean Angsuran ({queue.length})
            </h3>
            <span className="text-sm font-black font-mono text-amber-800">{rp(queueTotal)}</span>
          </div>
          <p className="text-[11px] text-amber-700 leading-relaxed mb-4">
            Setoran dari pramudi, belum mengurangi sisa hutang dan belum masuk kas.
            Hitung uangnya dulu, baru konfirmasi.
          </p>

          <div className="space-y-2">
            {queue.map((q) => {
              const busy = busyKey === q.key;
              return (
                <div key={q.key} className="flex items-center gap-3 bg-white rounded-xl border border-amber-200 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {q.debtName}
                      <span className="font-mono font-normal text-slate-400 ml-2">{rp(q.amount)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {q.method} · {q.date}
                      {q.requestedBy ? ` · oleh ${q.requestedBy}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => runVerify(q)}
                    disabled={busy}
                    className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition disabled:opacity-40"
                    title="Konfirmasi — mengurangi sisa hutang dan mengkredit kas"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => runReject(q)}
                    disabled={busy}
                    className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition disabled:opacity-40"
                    title="Tolak — uang tidak dicatat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <Check className="w-4 h-4 text-emerald-600" />
          <p className="text-xs text-emerald-800 font-semibold">
            Tidak ada angsuran menunggu verifikasi.
          </p>
        </div>
      )}

      {/* Debtor directory */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Buku Rekapitulasi Piutang &amp; Pinjaman</h3>
          <span className="text-xs text-slate-400">Klik baris untuk membuka kartu</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">NIK</th>
                <th className="py-3 px-4">Nama Pramudi</th>
                <th className="py-3 px-4">Kasus Insiden</th>
                <th className="py-3 px-4">Tanggal Mulai</th>
                <th className="py-3 px-4 text-right">Total Talangan</th>
                <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                <th className="py-3 px-4 text-right">Sisa Kewajiban</th>
                <th className="py-3 px-4 text-center">Antrean</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debts.map((item) => {
                const remaining = item.amount - item.paid;
                const isLunas = remaining <= 0;
                const pending = (item.pendingInstallments || []).length;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedDebt(item)}
                    className="hover:bg-amber-50/50 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{item.nik ?? '—'}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-amber-800 transition">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.body}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">{item.incident}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">{item.startDate}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{rp(item.amount)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600">{rp(item.paid)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">{rp(remaining)}</td>
                    <td className="py-3.5 px-4 text-center">
                      {pending > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3" />
                          {pending}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isLunas ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Lunas
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {item.status || 'Sedang Mengangsur'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {debts.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-slate-400">
            Belum ada kartu piutang.
          </div>
        )}
      </div>

      {/* Drawer */}
      {liveSelected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedDebt(null)}
        >
          <div
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono text-slate-400">KARTU PIUTANG ANGGOTA</span>
                <h3 className="font-bold text-slate-900 text-base">{liveSelected.name}</h3>
                <span className="text-xs text-slate-500 font-mono">NIK: {liveSelected.nik ?? 'belum ditautkan'}</span>
              </div>
              <button
                onClick={() => setSelectedDebt(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {liveSelected.nik == null && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Kartu ini belum tertaut ke NIK mana pun karena namanya tidak ada di daftar
                  126 pramudi. Perlu orang yang hafal daftar untuk menautkannya.
                </p>
              </div>
            )}

            {/* Incident summary */}
            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div>
                <span className="text-slate-400 block text-[10px]">Uraian Laka / Kebutuhan:</span>
                <span className="font-bold text-slate-800">{liveSelected.incident}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Talangan:</span>
                  <span className="font-mono font-bold text-slate-900">{rp(liveSelected.amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sisa Kewajiban:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {rp(liveSelected.amount - liveSelected.paid)}
                  </span>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-200">
                <span className="text-slate-400 block text-[10px] mb-1">Progres Angsuran</span>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(100, ((liveSelected.paid || 0) / (liveSelected.amount || 1)) * 100)}%`
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block whitespace-nowrap">
                  {rp(liveSelected.paid)} / {rp(liveSelected.amount)}
                </span>
              </div>
            </div>

            {/* Pending installments on this card */}
            <div className="mb-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                Angsuran Menunggu ({(liveSelected.pendingInstallments || []).length})
              </h4>
              {(liveSelected.pendingInstallments || []).length === 0 ? (
                <p className="text-[11px] text-slate-400">Tidak ada. Semua setoran sudah diproses.</p>
              ) : (
                <div className="space-y-2">
                  {liveSelected.pendingInstallments.map((p) => {
                    const item = { ...p, debtId: liveSelected.id, key: `${liveSelected.id}-${p.id}` };
                    const busy = busyKey === item.key;
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 font-mono">{rp(p.amount)}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {p.method} · {p.date}
                          </div>
                        </div>
                        <button
                          onClick={() => runVerify(item)}
                          disabled={busy}
                          className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition disabled:opacity-40"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => runReject(item)}
                          disabled={busy}
                          className="w-7 h-7 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition disabled:opacity-40"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin correction */}
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (window.confirm(`Hapus kartu piutang ${liveSelected.name}? Riwayat iurannya tetap tersimpan.`)) {
                    deleteDebt(liveSelected.id);
                    setSelectedDebt(null);
                  }
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-rose-200 transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Hapus Kartu Piutang (Koreksi Admin)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
