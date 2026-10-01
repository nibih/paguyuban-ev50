import React from 'react';
import { 
  DollarSign, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle, 
  Plus, 
  CheckCheck, 
  Printer, 
  PieChart, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ScreenA1Dashboard = ({ onOpenExpenseModal, onOpenVerifyModal }) => {
  const { pettyCash, bsiBalance, expenses, debts, setAdminTab } = useApp();

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalDebts = debts.reduce((acc, curr) => acc + (curr.amount - curr.paid), 0);

  // Allocation categories breakdown calculation
  const allocation = [
    { label: "Dana Talangan / Laka", amount: 2300000, percentage: "40.6%", color: "bg-amber-500" },
    { label: "Sparepart & Perbaikan KLI", amount: 1002500, percentage: "17.7%", color: "bg-blue-600" },
    { label: "Belanja Cat, Tinner & Stiker", amount: 1056500, percentage: "18.7%", color: "bg-teal-500" },
    { label: "Bansos Sosial & Sakit", amount: 905000, percentage: "16.0%", color: "bg-rose-500" },
    { label: "Konsumsi & Atensi Mekanik", amount: 401000, percentage: "7.0%", color: "bg-emerald-500" }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Top Status Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900">Executive Financial KPI Paguyuban</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Petugas Kasir On-Duty: <span className="font-semibold text-slate-800">Afrizal Pirmansyah (Admin Kas)</span> • Update Realtime SBU Cawang
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenExpenseModal}
            className="px-3.5 py-2 bg-[#0B2F64] hover:bg-[#123e7e] text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pengeluaran Baru</span>
          </button>

          <button
            onClick={() => setAdminTab('A2')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Verifikasi Kas Masuk</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Rekap PDF</span>
          </button>
        </div>
      </div>

      {/* 2. High-Impact Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Saldo Kas Kecil */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo Kas Kecil Tunai</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            Rp{pettyCash.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 leading-snug">
            Sisa dari total kas Rp5.796.500 setelah 15 pengeluaran September.
          </div>
        </div>

        {/* Card 2: Rekening Penampung BSI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Rekening Bank BSI</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#0B2F64]">
            Rp{bsiBalance.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rekening BSI: <span className="font-mono font-semibold">720510945</span> a.n Paguyuban EV50
          </div>
        </div>

        {/* Card 3: Total Pengeluaran Bulan Berjalan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pengeluaran Sept</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600">
            Rp{totalExpense.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {expenses.length} transaksi disbursement terbukukan sah.
          </div>
        </div>

        {/* Card 4: Total Piutang Dana Paguyuban */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Piutang Talangan Beredar</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600">
            Rp{totalDebts.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            5 anggota aktif berhutang (Sandi, Hasan, Bayu, Zeva, Sapli).
          </div>
        </div>

      </div>

      {/* 3. Visual Analytical Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Alokasi Pengeluaran September 2026 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#0B2F64]" />
              <h3 className="font-bold text-slate-900 text-sm">
                Alokasi Pengeluaran Kas September 2026
              </h3>
            </div>
            <span className="text-xs font-bold font-mono text-slate-500">
              Total: Rp{totalExpense.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-6">
            <div style={{ width: '40.6%' }} className="bg-amber-500 h-full" title="Talangan 40.6%" />
            <div style={{ width: '18.7%' }} className="bg-teal-500 h-full" title="Belanja Cat 18.7%" />
            <div style={{ width: '17.7%' }} className="bg-blue-600 h-full" title="Sparepart 17.7%" />
            <div style={{ width: '16.0%' }} className="bg-rose-500 h-full" title="Bansos 16.0%" />
            <div style={{ width: '7.0%' }} className="bg-emerald-500 h-full" title="Konsumsi 7.0%" />
          </div>

          {/* Breakdown Items List */}
          <div className="space-y-3">
            {allocation.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <span className={`w-3.5 h-3.5 rounded-md ${item.color} shrink-0`} />
                  <span className="font-semibold text-slate-800">{item.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 font-mono">{item.percentage}</span>
                  <span className="font-mono font-bold text-slate-900 w-28 text-right">
                    Rp{item.amount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Activity Feed */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Aktivitas Kasir & Jalur Terkini
              </h3>
            </div>

            <div className="space-y-3.5">
              {[
                { text: "Pencairan Attensi Mekanik KLI & Afrizal", time: "19 Sep 2026", user: "Afrizal P", nominal: "- Rp50.000" },
                { text: "Bansos rawat Muflih (Sakit)", time: "16 Sep 2026", user: "Kholiq", nominal: "- Rp302.500" },
                { text: "Pencairan Dana Talang Laka M. Sapli Tol JORR", time: "15 Sep 2026", user: "Kholiq", nominal: "- Rp200.000" },
                { text: "Pembayaran Sparepart KLI bln Mei via BSI", time: "11 Sep 2026", user: "Afrizal P", nominal: "- Rp500.000" },
                { text: "Suket M. Hasan Body 270 Laka Lantas", time: "04 Sep 2026", user: "Kholiq", nominal: "- Rp500.000" }
              ].map((act, i) => (
                <div key={i} className="border-l-2 border-teal-500 pl-3 py-0.5 text-xs">
                  <div className="font-semibold text-slate-800 leading-snug">{act.text}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>{act.time} • PJ: {act.user}</span>
                    <span className="font-mono font-bold text-rose-600">{act.nominal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Log sinkronisasi live</span>
            <button 
              onClick={() => setAdminTab('A3')}
              className="text-blue-600 font-bold hover:underline"
            >
              Lihat Semua Buku Kas &rarr;
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
