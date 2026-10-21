import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  AlertCircle,
  Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { rp } from '../../utils/format';
import { MONTHS } from '../../constants';

// Expense records carry ISO dates (2026-09-01); the iuran book is keyed by
// month name. Map one to the other so a per-month row can line them up.
const MONTH_NO = { Mei: '05', Juni: '06', Juli: '07', Agustus: '08', September: '09' };


// A1: the money in and the money out.
//
// This screen used to lead with the vault — total aset, kas kecil, rekening
// BSI, piutang, an operational summary, four different ways of describing the
// same balance — and answered none of the question a cashier actually opens
// the panel with: did we take in more than we spent?
//
// The vault balance is deliberately NOT shown. It is a stored figure that the
// seeded history never fed, so presenting it beside the income totals invites
// a comparison that cannot be reconciled from this data. A2 carries that
// reconciliation, with its gaps stated.

// KPI tile for the two headline figures. Module-scope so React reconciles it by
// identity; defined inside the screen it became a new component type on every
// render and was torn down and rebuilt each time.
const Figure = ({ tone, icon: Icon, label, value, sub }) => {
  const isIn = tone === 'in';
  return (
    <div className={`flex-1 rounded-2xl p-5 border shadow-sm ${isIn ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${isIn ? 'text-emerald-600' : 'text-rose-600'}`} />
        <span className={`text-[11px] font-black uppercase tracking-widest ${isIn ? 'text-emerald-700' : 'text-rose-700'}`}>
          {label}
        </span>
      </div>
      <div className={`text-3xl font-black font-mono mt-2 tracking-tight whitespace-nowrap ${isIn ? 'text-emerald-700' : 'text-rose-700'}`}>
        {value}
      </div>
      <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
    </div>
  );
};

export const ScreenA1Dashboard = ({ onOpenExpenseModal }) => {
  const { users, iuranRecords, expenses, setAdminTab } = useApp();
  const [exporting, setExporting] = useState(null);

  // Pemasukan: every iuran marked lunas, whichever route it arrived by.
  // Pending claims are excluded — they are not money yet.
  const finance = useMemo(() => {
    const perMonth = {};
    MONTHS.forEach((m) => { perMonth[m] = { in: 0, out: 0 }; });

    let income = 0;
    let pending = 0;

    users.forEach((u) => {
      const rec = iuranRecords[u.nik] || {};
      MONTHS.forEach((m) => {
        const d = rec[m];
        if (!d) return;
        const nominal = Number(d.nominal) || 0;
        if (d.status === 'lunas') {
          income += nominal;
          perMonth[m].in += nominal;
        } else if (d.status === 'pending') {
          pending += nominal;
        }
      });
    });

    let expense = 0;
    expenses.forEach((e) => {
      const amt = e.amount || 0;
      expense += amt;
      const no = String(e.date || '').slice(5, 7);
      const m = MONTHS.find((k) => MONTH_NO[k] === no);
      if (m) perMonth[m].out += amt;
    });

    return { perMonth, income, expense, pending };
  }, [users, iuranRecords, expenses]);

  const net = finance.income - finance.expense;
  const stamp = new Date().toISOString().slice(0, 10);

  // CSV download. The web has no share sheet, so this is a plain blob link —
  // the same columns the phone exports, for the monthly DAMRI meeting.
  const downloadCsv = (rows, filename) => {
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportIuran = () => {
    setExporting('iuran');
    try {
      const rows = [['No', 'NIK', 'Nama Pramudi', ...MONTHS]];
      users.forEach((u, i) => {
        const rec = iuranRecords[u.nik] || {};
        rows.push([
          i + 1,
          `"${u.nik}"`,
          `"${u.name}"`,
          ...MONTHS.map((m) => (rec[m]?.status === 'lunas' ? 'Lunas' : rec[m]?.status === 'pending' ? 'Menunggu' : 'Belum Bayar'))
        ]);
      });
      downloadCsv(rows, `iuran-paguyuban-${stamp}.csv`);
    } finally {
      setExporting(null);
    }
  };

  const exportExpenses = () => {
    setExporting('expenses');
    try {
      const rows = [['ID', 'Tanggal', 'Uraian', 'Kategori', 'PIC', 'Sumber', 'Nominal']];
      expenses.forEach((e) => {
        rows.push([
          e.id || '',
          e.date || '',
          `"${String(e.title || '').replace(/"/g, '""')}"`,
          `"${e.category || ''}"`,
          `"${e.pic || ''}"`,
          `"${e.source || ''}"`,
          e.amount || 0
        ]);
      });
      downloadCsv(rows, `pengeluaran-${stamp}.csv`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header + actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900">Kas: Pemasukan &amp; Pengeluaran</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Petugas kasir jaga: <span className="font-semibold text-slate-800">Afrizal Firmansyah (Admin Kas)</span> • Data langsung dari Firestore
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenExpenseModal}
            className="px-3.5 py-2 bg-navy-800 hover:bg-navy-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
          </button>

          <button
            onClick={() => setAdminTab('A2')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Buka Antrean Verifikasi</span>
          </button>
        </div>
      </div>

      {/* The two figures */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Figure
          tone="in"
          icon={TrendingUp}
          label="Pemasukan"
          value={rp(finance.income)}
          sub="iuran masuk"
        />
        <Figure
          tone="out"
          icon={TrendingDown}
          label="Pengeluaran"
          value={rp(finance.expense)}
          sub={`${expenses.length} transaksi`}
        />
      </div>

      {/* Selisih */}
      <div className={`bg-white rounded-2xl p-5 border shadow-sm text-center ${net < 0 ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200'}`}>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Selisih (Masuk − Keluar)
        </div>
        <div className={`text-3xl font-black font-mono mt-1 whitespace-nowrap ${net < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
          {net < 0 ? '−' : '+'}{rp(Math.abs(net))}
        </div>
      </div>

      {finance.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-black">{rp(finance.pending)}</span> masih menunggu verifikasi
            dan belum dihitung sebagai pemasukan. Buka antrean di tab Iuran untuk memeriksanya
            terhadap mutasi rekening.
          </p>
        </div>
      )}

      {/* Per-month */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Per Bulan</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-5 text-left">Bulan</th>
              <th className="py-2.5 px-5 text-right">Masuk</th>
              <th className="py-2.5 px-5 text-right">Keluar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {MONTHS.map((m) => {
              const r = finance.perMonth[m];
              return (
                <tr key={m} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-5 font-bold text-slate-800">{m}</td>
                  <td className="py-2.5 px-5 text-right font-mono text-emerald-700">{rp(r.in)}</td>
                  <td className="py-2.5 px-5 text-right font-mono text-rose-700">{rp(r.out)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50/80">
              <td className="py-3 px-5 font-black text-slate-900">Total</td>
              <td className="py-3 px-5 text-right font-mono font-black text-emerald-700">{rp(finance.income)}</td>
              <td className="py-3 px-5 text-right font-mono font-black text-rose-700">{rp(finance.expense)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="px-5 py-3 text-[10px] text-slate-400 leading-relaxed border-t border-slate-100">
          Pengeluaran baru tercatat mulai September, jadi bulan sebelumnya memang kosong.
        </div>
      </div>

      {/* CSV export */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-1">
          Export Laporan CSV (Rapat Bulanan Damri)
        </h3>
        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
          Berkas .csv langsung bisa dibuka di Excel.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={exportIuran}
            disabled={!!exporting}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-left disabled:opacity-60"
          >
            <span className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-navy-800" />
            </span>
            <span className="flex-1">
              <span className="block text-xs font-bold text-slate-900">Matriks Iuran</span>
              <span className="block text-[11px] text-slate-500">{users.length} pramudi × {MONTHS.length} bulan</span>
            </span>
          </button>

          <button
            onClick={exportExpenses}
            disabled={!!exporting}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-left disabled:opacity-60"
          >
            <span className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-navy-800" />
            </span>
            <span className="flex-1">
              <span className="block text-xs font-bold text-slate-900">Buku Pengeluaran</span>
              <span className="block text-[11px] text-slate-500">{expenses.length} transaksi</span>
            </span>
          </button>
        </div>
      </div>

    </div>
  );
};
