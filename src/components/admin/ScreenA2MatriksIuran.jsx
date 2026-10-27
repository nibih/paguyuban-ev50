import React, { useState, useMemo } from 'react';
import {
  Search,
  Check,
  CheckCircle2,
  Clock,
  X,
  AlertTriangle,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { rp } from '../../utils/format';
import { MONTHS, IURAN_FEE, COLLECTION_MONTH, dueMonths } from '../../constants';
import { ImageUpload } from '../ImageUpload';
import { ImagePreview } from '../ImagePreview';

// Provenance dot in the legend. Module-scope so React can reconcile it by
// identity rather than treating it as a fresh component type each render.
const ProvDot = ({ color }) => <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />;

// Transfer proof. The web panel writes `proof`; the mobile app historically
// wrote `receipt` for the same image, so both keys are read. Normalising the
// write side is a mobile change; until every phone runs it, old rows still
// carry the other name.
const proofOf = (entry) => entry?.proof || entry?.receipt || '';

// A2: the reconciliation matrix.
//
// Ticking a cell does NOT take money into the till — it queues the month as
// `pending`. The queue at the top of this screen is cleared only after each
// item has been matched against the BSI statement or the counted kas kecil.
// Only `verifyIuran` credits the vault.
export const ScreenA2MatriksIuran = () => {
  const {
    users, iuranRecords, markIuranPaidCash, verifyIuran, rejectIuran, unverifyIuran,
    attachIuranProof, expenses, debts, vault, showToast
  } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [expandedNik, setExpandedNik] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  // Bulk selection over the pending queue. A Set of queue keys — never
  // indices: the queue is rebuilt from a live Firestore snapshot and
  // re-sorted by date, so an index could point at a different payment by
  // the time the button is pressed.
  const [picked, setPicked] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // Proof currently open in the viewer: { src, title, note } or null.
  const [viewing, setViewing] = useState(null);

  // Every month sitting in the queue, newest claim first.
  const queue = useMemo(() => {
    const out = [];
    users.forEach((u) => {
      const rec = iuranRecords[u.nik] || {};
      MONTHS.forEach((m) => {
        const d = rec[m];
        if (d?.status === 'pending') {
          out.push({ nik: u.nik, name: u.name, month: m, ...d, key: `${u.nik}-${m}` });
        }
      });
    });
    return out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [users, iuranRecords]);

  const pendingTotal = queue.reduce((s, q) => s + (Number(q.nominal) || 0), 0);

  const runVerify = async (item) => {
    setBusyKey(item.key);
    await verifyIuran(item.nik, item.month);
    setBusyKey(null);
  };
  const runReject = async (item) => {
    setBusyKey(item.key);
    await rejectIuran(item.nik, item.month);
    setBusyKey(null);
  };

  // Undoing a confirmation is a financial reversal, not a UI toggle: the month
  // returns to unpaid and the vault is debited. Two guards keep it honest —
  // bank-sourced rows are refused outright, and the cashier is told the exact
  // amount that will leave the till before anything moves.
  const runUnverify = async (item, entry) => {
    if (entry?.source === 'Laporan Uang Masuk') {
      showToast('Data ini dari laporan bank, bukan verifikasi aplikasi.', 'error');
      return;
    }
    const amount = Number(entry?.nominal) || 0;
    const ok = window.confirm(
      `Batalkan pembayaran ${item.month} a.n ${item.name}?\n\n` +
      `Status kembali ke Belum Bayar dan kas dikurangi ${rp(amount)}.`
    );
    if (!ok) return;

    setBusyKey(item.key);
    await unverifyIuran(item.nik, item.month);
    setBusyKey(null);
  };

  const togglePick = (key) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const pickedItems = queue.filter((q) => picked.has(q.key));
  const pickedTotal = pickedItems.reduce((s, q) => s + (Number(q.nominal) || 0), 0);
  const allPicked = queue.length > 0 && pickedItems.length === queue.length;
  const clearPicked = () => setPicked(new Set());

  // Bulk verify / reject.
  //
  // It calls verifyIuran or rejectIuran once per item and reimplements
  // nothing. Those are the only paths that credit the vault, and running
  // them N times gives N individually atomic transactions rather than one
  // batched mutation — so if three fail halfway, the books are exactly as
  // correct as they were after any single verification.
  //
  // What it does NOT do is report a blanket success. Partial runs are
  // reported as partial, naming enough of the failures for the cashier to
  // redo them.
  const runBulk = async (kind) => {
    if (bulkBusy || pickedItems.length === 0) return;
    const items = pickedItems;
    const total = pickedTotal;

    const question =
      kind === 'verify'
        ? `Verifikasi ${items.length} klaim senilai ${rp(total)}?\n\nIni mengkredit kas. Cocokkan dengan mutasi BSI / hitung kas kecil dulu.`
        : `Tolak ${items.length} klaim senilai ${rp(total)}?\n\nUang ini TIDAK dicatat masuk kas.`;

    if (!window.confirm(question)) return;

    setBulkBusy(true);
    let ok = 0;
    const failed = [];
    for (const q of items) {
      const good = kind === 'verify'
        ? await verifyIuran(q.nik, q.month)
        : await rejectIuran(q.nik, q.month);
      if (good) ok += 1;
      else failed.push(`${q.name} · ${q.month}`);
    }
    setBulkBusy(false);

    if (failed.length === 0) {
      showToast(
        kind === 'verify'
          ? `${ok} pembayaran terverifikasi, kas dikredit.`
          : `${ok} klaim ditolak, kas tidak berubah.`
      );
    } else {
      const shown = failed.slice(0, 3).join(', ');
      const more = failed.length > 3 ? `, +${failed.length - 3} lainnya` : '';
      showToast(`${ok} dari ${items.length} berhasil. Gagal: ${shown}${more}`, 'error');
    }
    clearPicked();
  };

  const rows = useMemo(() => users
    .map((u) => ({ ...u, rec: iuranRecords[u.nik] || {} }))
    .filter((u) => {
      const q = search.trim().toLowerCase();
      if (q && !u.name.toLowerCase().includes(q) && !u.nik.includes(q)) return false;

      const unpaid = dueMonths(u).filter((m) => u.rec[m]?.status !== 'lunas').length;
      const anyPending = MONTHS.some((m) => u.rec[m]?.status === 'pending');
      if (filter === 'Lunas') return unpaid === 0;
      if (filter === 'Menunggu') return anyPending;
      if (filter === 'Tunggak 1') return unpaid === 1;
      if (filter === 'Tunggak >2') return unpaid > 1;
      return true;
    }), [users, iuranRecords, search, filter]);

  const counts = useMemo(() => {
    let lunas = 0; let t1 = 0; let t2 = 0; let pending = 0;
    users.forEach((u) => {
      const r = iuranRecords[u.nik] || {};
      if (MONTHS.some((m) => r[m]?.status === 'pending')) pending += 1;
      // Arrears are counted against the months this driver owes, so someone
      // who joined this month is one month late, not six.
      const unpaid = dueMonths(u).filter((m) => r[m]?.status !== 'lunas').length;
      if (unpaid === 0) lunas += 1;
      else if (unpaid === 1) t1 += 1;
      else t2 += 1;
    });
    return { Lunas: lunas, 'Tunggak 1': t1, 'Tunggak >2': t2, Menunggu: pending };
  }, [users, iuranRecords]);

  const FILTERS = [
    { key: 'Semua', label: 'Semua', count: users.length },
    { key: 'Menunggu', label: 'Menunggu', count: counts.Menunggu },
    { key: 'Lunas', label: 'Lunas', count: counts.Lunas },
    { key: 'Tunggak 1', label: 'Tunggak 1', count: counts['Tunggak 1'] },
    { key: 'Tunggak >2', label: 'Tunggak >2', count: counts['Tunggak >2'] }
  ];

  // Pemasukan iuran — the full recorded history, NOT just what flowed through
  // the app. Most of this book predates the app entirely and came from the
  // bank's own money-in report, so the two provenances are kept visibly
  // separate rather than merged into one confident-looking total:
  //
  //   Laporan Uang Masuk  seeded from the BSI statement — pre-app history
  //   Verifikasi Kasir    confirmed in-app by a bendahara
  //   Menunggu            a claim, worth nothing until confirmed
  //
  // Every `lunas` entry counts as income here regardless of provenance, but
  // `vault` is NOT derived from this. The vault is a separate stored balance.
  const income = useMemo(() => {
    const fromBank = (d) => d?.source === 'Laporan Uang Masuk';

    const rowsByMonth = MONTHS.map((month) => {
      let bank = 0;
      let cashier = 0;
      let pending = 0;

      users.forEach((u) => {
        const d = iuranRecords[u.nik]?.[month];
        if (!d) return;
        const nominal = Number(d.nominal) || 0;
        if (d.status === 'lunas' && fromBank(d)) bank += nominal;
        else if (d.status === 'lunas') cashier += nominal;
        else if (d.status === 'pending') pending += nominal;
      });

      return { month, bank, cashier, pending };
    });

    const totalBank = rowsByMonth.reduce((a, r) => a + r.bank, 0);
    const totalCashier = rowsByMonth.reduce((a, r) => a + r.cashier, 0);
    const totalPending = rowsByMonth.reduce((a, r) => a + r.pending, 0);

    return {
      rows: rowsByMonth,
      totalBank,
      totalCashier,
      totalPending,
      totalRecorded: totalBank + totalCashier
    };
  }, [users, iuranRecords]);

  // Reconciliation of recorded cash movement against the vault.
  //
  // This deliberately does NOT assert that the books balance, because with the
  // data currently held they cannot, and printing a tidy equation that
  // "closes" would be a lie a cashier would eventually discover the hard way.
  // Two concrete gaps are computed and named instead:
  //
  //   1. The expense book only covers September, while iuran spans five
  //      months, so four months of spending are simply absent.
  //   2. Some talangan advances were booked as expenses AND as debt
  //      principal, so subtracting both would double-count them.
  const recon = useMemo(() => {
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // A talangan expense that also has a matching debt card is the same
    // money recorded twice.
    const overlap = expenses
      .filter((e) => e.category === 'Talangan')
      .filter((e) => debts.some((d) => d.amount === e.amount && norm(d.name).includes(norm(e.pic))))
      .reduce((a, e) => a + (e.amount || 0), 0);

    const expenseMonths = [...new Set(expenses.map((e) => String(e.date || '').slice(0, 7)))]
      .filter(Boolean).sort();

    return {
      vaultTotal: (vault.bsiBalance || 0) + (vault.pettyCash || 0),
      totalExpense: expenses.reduce((a, e) => a + (e.amount || 0), 0),
      talanganOutstanding: debts.reduce((a, d) => a + (d.amount - d.paid), 0),
      overlap,
      monthsCovered: expenseMonths.length,
      monthsWanted: MONTHS.length
    };
  }, [expenses, debts, vault]);

  const exportMatrix = () => {
    const out = [['No', 'NIK', 'Nama Pramudi', ...MONTHS]];
    users.forEach((u, i) => {
      const rec = iuranRecords[u.nik] || {};
      out.push([
        i + 1,
        `"${u.nik}"`,
        `"${u.name}"`,
        ...MONTHS.map((m) => (rec[m]?.status === 'lunas' ? 'Lunas' : rec[m]?.status === 'pending' ? 'Menunggu' : 'Belum Bayar'))
      ]);
    });
    const csv = out.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matriks-iuran-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV matriks iuran diunduh.');
  };

  return (
    <div className="space-y-6">

      {/* Header — sticky, so the matrix export and filters stay put while
          scrolling the 128-driver grid. */}
      <div className="sticky top-16 z-30 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Iuran: Verifikasi &amp; Buku Pemasukan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Iuran wajib {rp(IURAN_FEE)} / pramudi / bulan • Tanda centang hanya ANTREKAN, bukan uang masuk kas
          </p>
        </div>
        <button
          onClick={exportMatrix}
          className="px-3.5 py-2 bg-navy-800 hover:bg-navy-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition active:scale-95 self-start"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Excel (.csv)</span>
        </button>
      </div>

      {/* VERIFICATION QUEUE */}
      {queue.length > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-900 flex-1">
              Menunggu Verifikasi ({queue.length})
            </h3>
            <span className="text-sm font-black font-mono text-amber-800">{rp(pendingTotal)}</span>
          </div>
          <p className="text-[11px] text-amber-700 leading-relaxed mb-4">
            Belum masuk kas. Cocokkan dulu dengan mutasi BSI / hitung kas kecil, baru tekan centang.
          </p>

          {/* Bulk controls */}
          <div className="flex flex-wrap items-center gap-3 mb-3 p-2.5 bg-white/70 rounded-xl border border-amber-200">
            <label className="flex items-center gap-2 text-[11px] font-bold text-amber-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allPicked}
                onChange={(e) => setPicked(e.target.checked ? new Set(queue.map((q) => q.key)) : new Set())}
                className="w-4 h-4 accent-teal-600"
              />
              Pilih semua
            </label>

            <span className="text-[11px] text-slate-500 font-medium">
              {pickedItems.length} dipilih
              {pickedItems.length > 0 ? ` · ${rp(pickedTotal)}` : ''}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => runBulk('reject')}
                disabled={bulkBusy || pickedItems.length === 0}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 text-[11px] font-bold hover:bg-rose-50 transition disabled:opacity-40"
              >
                Tolak Terpilih
              </button>
              <button
                onClick={() => runBulk('verify')}
                disabled={bulkBusy || pickedItems.length === 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-500 transition disabled:opacity-40"
              >
                {bulkBusy ? 'Memproses…' : 'Verifikasi Terpilih'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {queue.map((q) => {
              const busy = busyKey === q.key;
              return (
                <div key={q.key} className="flex items-center gap-3 bg-white rounded-xl border border-amber-200 p-3">
                  <input
                    type="checkbox"
                    checked={picked.has(q.key)}
                    onChange={() => togglePick(q.key)}
                    disabled={busy || bulkBusy}
                    className="w-4 h-4 accent-teal-600 shrink-0"
                    aria-label={`Pilih ${q.name} — ${q.month}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{q.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {q.month} · {q.method} · {rp(q.nominal)}
                      {q.markedBy ? ` · ditandai ${q.markedBy}` : ''}
                    </div>
                  </div>
                  <ImageUpload
                    value={proofOf(q)}
                    className="w-9 h-9"
                    title={proofOf(q) ? 'Bukti transfer' : 'Lampirkan bukti transfer'}
                    onView={() => setViewing({
                      src: proofOf(q),
                      title: `Bukti transfer — ${q.name}`,
                      note: `${q.month} · ${q.method || 'Tunai Kasir'} · ${rp(q.nominal)}`
                    })}
                    onChange={(proof) => attachIuranProof(q.nik, q.month, proof)}
                  />
                  <button
                    onClick={() => runVerify(q)}
                    disabled={busy || bulkBusy}
                    className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition disabled:opacity-40"
                    title="Cocokkan dengan bank, lalu konfirmasi — ini yang mengkredit kas"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => runReject(q)}
                    disabled={busy || bulkBusy}
                    className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition disabled:opacity-40"
                    title="Tolak klaim — uang tidak dicatat"
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
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-xs text-emerald-800 font-semibold">
            Tidak ada pembayaran menunggu verifikasi.
          </p>
        </div>
      )}

      {/* PEMASUKAN LEDGER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Pemasukan Iuran</h3>
          <span className="text-xl font-black font-mono text-emerald-700">{rp(income.totalRecorded)}</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          Total seluruh riwayat iuran yang tercatat, termasuk data sebelum aplikasi ada.
          Ini arus masuk kumulatif, <span className="font-semibold">bukan</span> saldo kas saat ini —
          lihat Rekonsiliasi di bawah untuk hubungannya.
        </p>

        {/* Provenance legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 mb-4 text-[10px] text-slate-500 font-semibold">
          <span className="flex items-center gap-1.5"><ProvDot color="#0B2F64" /> Laporan Uang Masuk</span>
          <span className="flex items-center gap-1.5"><ProvDot color="#059669" /> Verifikasi Kasir</span>
          <span className="flex items-center gap-1.5"><ProvDot color="#D97706" /> Menunggu</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 text-left">Bulan</th>
                <th className="py-2.5 px-3 text-right">Laporan Uang Masuk</th>
                <th className="py-2.5 px-3 text-right">Verifikasi Kasir</th>
                <th className="py-2.5 px-3 text-right">Total Masuk</th>
                <th className="py-2.5 px-3 text-right">Menunggu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {income.rows.map((r) => (
                <tr key={r.month} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-bold text-slate-800">{r.month}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">{rp(r.bank)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">{rp(r.cashier)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{rp(r.bank + r.cashier)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                    {r.pending > 0 ? rp(r.pending) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                <td className="py-3 px-3 font-black text-slate-900">Total</td>
                <td className="py-3 px-3 text-right font-mono font-black text-slate-900">{rp(income.totalBank)}</td>
                <td className="py-3 px-3 text-right font-mono font-black text-slate-900">{rp(income.totalCashier)}</td>
                <td className="py-3 px-3 text-right font-mono font-black text-emerald-700">{rp(income.totalRecorded)}</td>
                <td className="py-3 px-3 text-right font-mono font-black text-amber-700">
                  {income.totalPending > 0 ? rp(income.totalPending) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-3 text-[10px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-600">Dari laporan bank (sebelum aplikasi):</span> {rp(income.totalBank)}
          <span className="mx-2">•</span>
          <span className="font-semibold text-slate-600">Dari verifikasi kasir (lewat aplikasi):</span> {rp(income.totalCashier)}
        </div>
      </div>

      {/* REKONSILIASI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Rekonsiliasi terhadap Kas</h3>
        <p className="text-[11px] text-slate-500 mt-1 mb-4 leading-relaxed">
          Iuran di atas adalah arus masuk sejak data dicatat. Kas adalah saldo yang tersisa
          setelah pengeluaran dan talangan. Keduanya memang angka berbeda.
        </p>

        <div className="space-y-2">
          {[
            { label: 'Pemasukan iuran tercatat', value: rp(income.totalRecorded), cls: 'text-slate-900' },
            { label: 'Pengeluaran tercatat', value: `−${rp(recon.totalExpense)}`, cls: 'text-rose-700' },
            { label: 'Saldo kas saat ini (BSI + Kas Kecil)', value: rp(recon.vaultTotal), cls: 'text-slate-900 font-black' },
            { label: 'Piutang talangan belum kembali', value: rp(recon.talanganOutstanding), cls: 'text-amber-700' }
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 bg-slate-50 rounded-lg px-3 py-2.5">
              <span className="text-[11px] text-slate-600 flex-1">{r.label}</span>
              <span className={`text-xs font-mono font-bold whitespace-nowrap ${r.cls}`}>{r.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-900">Catatan Rekonsiliasi</span>
          </div>
          <ul className="text-[11px] text-amber-800 leading-relaxed space-y-1.5 list-disc pl-4">
            <li>
              Buku pengeluaran hanya mencakup {recon.monthsCovered} dari {recon.monthsWanted} bulan,
              sehingga sebagian pengeluaran tidak ikut terhitung di sini.
            </li>
            {recon.overlap > 0 && (
              <li>
                Sebagian dana talangan tercatat dua kali: sebagai pengeluaran sekaligus sebagai
                pokok piutang ({rp(recon.overlap)}). Keduanya uang yang sama.
              </li>
            )}
            <li>
              Karena itu selisih di atas tidak dipaksakan agar tampak seimbang. Cocokkan dengan
              mutasi BSI sungguhan sebelum dipakai sebagai laporan resmi rapat.
            </li>
          </ul>
        </div>
      </div>

      {/* FILTER + MATRIX */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIK pramudi..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filter === f.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Matriks Iuran Pramudi</span>
          <span className="text-[11px] text-slate-400">{rows.length} pramudi ditampilkan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10 text-center">No</th>
                <th className="py-3 px-4">NIK</th>
                <th className="py-3 px-4">Nama Pramudi</th>
                {MONTHS.map((m) => <th key={m} className="py-3 px-2 text-center">{m}</th>)}
                <th className="py-3 px-4 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((user, idx) => {
                const rec = user.rec;
                const isCurrentPaid = rec[COLLECTION_MONTH]?.status === 'lunas';
                const hasPending = MONTHS.some((m) => rec[m]?.status === 'pending');

                return (
                  <tr key={user.nik} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{user.nik}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{user.name}</div>
                      <div className="text-[10px] text-slate-400">{user.position || user.role}</div>
                    </td>

                    {MONTHS.map((month) => {
                      const d = rec[month];
                      const isLunas = d?.status === 'lunas';
                      const isPending = d?.status === 'pending';
                      const isPartial = d?.status === 'partial';

                      if (isLunas) {
                        const bank = d.source === 'Laporan Uang Masuk';
                        const key = `${user.nik}-${month}`;
                        return (
                          <td key={month} className="py-3 px-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={busyKey === key || bank}
                                onClick={() => runUnverify({ nik: user.nik, name: user.name, month, key }, d)}
                                title={
                                  bank
                                    ? 'Berasal dari laporan bank — koreksi lewat laporan aslinya'
                                    : `Lunas: ${d.date || '-'} via ${d.method || 'BSI'}${d.verifiedBy ? ` · diverifikasi ${d.verifiedBy}` : ''}\nKlik untuk membatalkan (kas dikurangi).`
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                                  bank
                                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                {d.nominal ? rp(d.nominal) : '—'}
                              </button>
                              {proofOf(d) && (
                                <button
                                  type="button"
                                  onClick={() => setViewing({
                                    src: proofOf(d),
                                    title: `Bukti transfer — ${user.name}`,
                                    note: `${month} · ${d.method || 'BSI'} · ${rp(d.nominal)}${d.verifiedBy ? ` · oleh ${d.verifiedBy}` : ''}`
                                  })}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-teal-700 hover:border-teal-300 flex items-center justify-center transition"
                                  title="Lihat bukti transfer"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }

                      if (isPending) {
                        return (
                          <td key={month} className="py-3 px-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <span
                                title={`Menunggu verifikasi — ${d.method || 'Tunai Kasir'} · ${d.date || '-'}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 cursor-help"
                              >
                                <Clock className="w-3 h-3 text-amber-600" />
                                Antre
                              </span>
                              {proofOf(d) && (
                                <button
                                  type="button"
                                  onClick={() => setViewing({
                                    src: proofOf(d),
                                    title: `Bukti transfer — ${user.name}`,
                                    note: `${month} · ${d.method || 'Tunai Kasir'} · ${rp(d.nominal)} · menunggu verifikasi`
                                  })}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-teal-700 hover:border-teal-300 flex items-center justify-center transition"
                                  title="Lihat bukti transfer"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={month} className="py-3 px-2 text-center">
                          <button
                            onClick={() => markIuranPaidCash(user.nik, month)}
                            title={`Tandai ${month} sebagai dibayar tunai — masuk antrean verifikasi`}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition"
                          >
                            {isPartial ? rp(d.nominal) : 'Belum Bayar'}
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-3 px-4 text-center">
                      {hasPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          Di antrean
                        </span>
                      ) : isCurrentPaid ? (
                        <span className="text-[11px] text-slate-400 font-medium">Terverifikasi</span>
                      ) : (
                        <button
                          onClick={() => markIuranPaidCash(user.nik, COLLECTION_MONTH)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition active:scale-95"
                          title="Tandai Lunas Tunai Kasir — masuk antrean verifikasi"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Lunas Tunai</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="px-5 py-8 text-center text-xs text-slate-400">
            Tidak ada pramudi yang cocok dengan filter ini.
          </div>
        )}
      </div>

      {viewing && (
        <ImagePreview
          src={viewing.src}
          title={viewing.title}
          note={viewing.note}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
};
