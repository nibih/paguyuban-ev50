import React, { useState } from 'react';
import { 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Wrench, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  HeartHandshake,
  Clock,
  Sparkles,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MidtransModal } from '../MidtransModal';

export const ScreenM1Dashboard = () => {
  const { 
    currentUser, 
    iuranRecords, 
    debts, 
    expenses, 
    pettyCash, 
    bsiBalance, 
    setMemberTab, 
    payIuranMonths 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check September status for current user
  const userIuran = iuranRecords[currentUser.nik] || {};
  const septStatus = userIuran['September']?.status || 'unpaid';
  const isPaid = septStatus === 'lunas';

  // Check active debts
  const userDebt = debts.find(d => d.nik === currentUser.nik);
  const activeDebtAmount = userDebt ? (userDebt.amount - userDebt.paid) : 0;

  // Solidaritas feed
  const bansosFeed = [
    { title: "Bansos Rawat Inap", recipient: "Jonaemson Gultom", amount: 300000, date: "10 Sep 2026", type: "Sakit" },
    { title: "Santunan Laka Pulang Dinas", recipient: "Effendi", amount: 302500, date: "08 Sep 2026", type: "Kecelakaan" },
    { title: "Bantuan Sakit & Rawat", recipient: "Muflih", amount: 302500, date: "16 Sep 2026", type: "Sakit" },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* 1. User Profile Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0B2F64] to-[#0284C7] p-0.5 shadow-md">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white font-extrabold text-lg">
              {currentUser.name.charAt(0)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-slate-900 text-sm">{currentUser.name}</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                NIK: {currentUser.nik}
              </span>
              <span className="text-[11px] text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                {currentUser.position || 'Pramudi EV 50 Cawang'}
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => setMemberTab('M2')}
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition"
          >
            <Clock className="w-4 h-4" />
          </button>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
            2
          </span>
        </div>
      </div>

      {/* 2. Current Due Status Hero Card (Dynamic Gradient Blue Card) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B2F64] via-[#0e3b7d] to-[#01579b] text-white p-5 shadow-xl shadow-blue-900/15 border border-blue-400/20">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-sky-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs uppercase tracking-wider text-teal-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Transaksi Kas Bulanan
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">Iuran Paguyuban - September 2026</h3>
            </div>
            
            {isPaid ? (
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3 py-1 rounded-full text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Lunas Kas
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-rose-500/25 text-rose-200 border border-rose-400/40 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-300" /> Belum Dibayar
              </span>
            )}
          </div>

          <div className="my-3">
            <div className="text-3xl font-black tracking-tight text-white font-mono">
              Rp100.000
            </div>
            <div className="text-xs text-blue-200 mt-1">
              Kewajiban kas operasional, bansos, dan perlindungan armada EV 50.
            </div>
          </div>

          {isPaid ? (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Terverifikasi Kasir ({userIuran['September']?.method || 'Sistem'})</span>
              </div>
              <span className="font-mono text-[11px] opacity-80">
                {userIuran['September']?.date || '02/09/2026'}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Bayar Iuran Sekarang (Midtrans)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Paguyuban Public Vault Summary (3-Column Mini Stats) */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
            Kas Berjalan
          </div>
          <div className="text-xs font-bold text-slate-900 font-mono">
            Rp{pettyCash.toLocaleString('id-ID')}
          </div>
          <div className="text-[9px] text-teal-600 font-medium mt-0.5 truncate">
            BSI: Rp12.45 Jt
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
            Kas Masuk
          </div>
          <div className="text-xs font-bold text-emerald-600 font-mono">
            Rp10.250.000
          </div>
          <div className="text-[9px] text-slate-400 font-medium mt-0.5">
            Periode aktif
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
            Penyaluran
          </div>
          <div className="text-xs font-bold text-rose-600 font-mono">
            Rp5.665.000
          </div>
          <div className="text-[9px] text-slate-400 font-medium mt-0.5">
            15 Pengeluaran
          </div>
        </div>
      </div>

      {/* 4. Quick Action Grid (4 round icons) */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 px-1">
          Menu Layanan Mandiri
        </h4>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setMemberTab('M2')}
            className="flex flex-col items-center p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm transition active:scale-95 group text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:bg-blue-600 group-hover:text-white transition">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">Bayar Iuran</span>
          </button>

          <button
            onClick={() => setMemberTab('M3')}
            className="flex flex-col items-center p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm transition active:scale-95 group text-center relative"
          >
            {activeDebtAmount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5 group-hover:bg-amber-600 group-hover:text-white transition">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">Kartu Hutang</span>
          </button>

          <button
            onClick={() => setMemberTab('M4')}
            className="flex flex-col items-center p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm transition active:scale-95 group text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-1.5 group-hover:bg-teal-600 group-hover:text-white transition">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">Lapor Bodi</span>
          </button>

          <button
            onClick={() => setMemberTab('M5')}
            className="flex flex-col items-center p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm transition active:scale-95 group text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1.5 group-hover:bg-indigo-600 group-hover:text-white transition">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">Kas Terbuka</span>
          </button>
        </div>
      </div>

      {/* 5. Feed Bansos & Solidaritas (Live Ticker / Card List) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-rose-500" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Penyaluran Solidaritas Terkini
            </h4>
          </div>
          <button 
            onClick={() => setMemberTab('M5')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
          >
            Semua <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {bansosFeed.map((item, idx) => (
            <div 
              key={idx} 
              className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 flex items-center justify-between transition"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mt-0.5 shrink-0 text-xs font-bold">
                  {idx + 1}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.title}</div>
                  <div className="text-[11px] text-slate-500">
                    Rekan <span className="font-semibold text-slate-700">{item.recipient}</span> • {item.date}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono text-rose-600">
                  - Rp{item.amount.toLocaleString('id-ID')}
                </span>
                <span className="block text-[9px] text-slate-400">{item.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      <MidtransModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedMonths={['September']}
        onPaymentSuccess={(months, method) => payIuranMonths(currentUser.nik, months, method)}
      />
    </div>
  );
};
