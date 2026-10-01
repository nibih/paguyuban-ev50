import React, { useState } from 'react';
import { 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  PlusCircle, 
  ArrowDownLeft, 
  ArrowUpRight,
  Upload,
  Calendar,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ScreenM3Talangan = () => {
  const { currentUser, debts, repayDebt, showToast } = useApp();
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentNominal, setInstallmentNominal] = useState('100000');
  const [paymentMethod, setPaymentMethod] = useState('Transfer BSI');

  // Find debt for current user
  const userDebt = debts.find(d => d.nik === currentUser.nik);
  const remainingDebt = userDebt ? (userDebt.amount - userDebt.paid) : 0;
  const hasDebt = remainingDebt > 0;

  const handleRepaySubmit = (e) => {
    e.preventDefault();
    if (!userDebt) return;
    const nominal = parseInt(installmentNominal.replace(/\D/g, ''), 10);
    if (!nominal || nominal <= 0) return;

    repayDebt(userDebt.id, nominal, paymentMethod);
    setIsInstallmentModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-14">
      {/* 1. Outstanding Debt Summary Header */}
      <div className={`rounded-3xl p-5 border text-slate-800 relative overflow-hidden shadow-sm ${
        hasDebt 
          ? 'bg-rose-50/70 border-rose-200' 
          : 'bg-emerald-50/70 border-emerald-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sisa Tanggungan Dana Talang
          </span>
          {hasDebt ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-200 text-rose-800">
              Pinjaman Aktif
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200 text-emerald-800">
              Bebas Hutang
            </span>
          )}
        </div>

        <div className="my-2.5">
          <div className={`text-3xl font-black font-mono tracking-tight ${
            hasDebt ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            Rp{remainingDebt.toLocaleString('id-ID')}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {hasDebt 
              ? `Jatuh Tempo: 1 Bulan dari pencairan (${userDebt?.tenor || '1 Bulan'})` 
              : 'Anda tidak memiliki tanggungan dana talang aktif.'}
          </p>
        </div>

        {hasDebt && (
          <button
            onClick={() => setIsInstallmentModalOpen(true)}
            className="w-full mt-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajukan Setoran Cicilan</span>
          </button>
        )}
      </div>

      {/* 2. Incident Details Card */}
      {userDebt && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Detail Kasus & Armada
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{userDebt.startDate}</span>
          </div>

          <div className="text-xs space-y-1.5">
            <div>
              <span className="text-slate-400 block text-[10px]">Uraian Kasus:</span>
              <span className="font-semibold text-slate-800">{userDebt.incident}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Unit Armada Terkait:</span>
                <span className="font-medium text-slate-700">{userDebt.body}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Pencairan Dana:</span>
                <span className="font-medium text-slate-700">{userDebt.disbursedBy}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Kartu Angsuran / Ledger Table */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
          Buku Mutasi & Pembayaran
        </h3>

        {userDebt && userDebt.mutations.length > 0 ? (
          <div className="space-y-2">
            {userDebt.mutations.map((m, idx) => (
              <div 
                key={m.id || idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800">{m.desc}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.date}</div>
                </div>

                <div className="text-right">
                  {m.debit > 0 ? (
                    <span className="font-mono font-bold text-rose-600 block">
                      + Rp{m.debit.toLocaleString('id-ID')}
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-emerald-600 block">
                      - Rp{m.credit.toLocaleString('id-ID')}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400">
                    Sisa: Rp{m.balance.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            Belum ada riwayat transaksi pinjaman dana talang.
          </div>
        )}
      </div>

      {/* Setoran Cicilan Modal */}
      {isInstallmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Ajukan Setoran Cicilan</h3>
              <button 
                onClick={() => setIsInstallmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nominal Angsuran (Rp)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={installmentNominal}
                  onChange={(e) => setInstallmentNominal(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="100000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="Transfer BSI">Transfer Bank BSI</option>
                  <option value="Cash ke Admin">Tunai ke Bendahara Kholiq</option>
                  <option value="Potong Honor">Titip Kasir Jam Operasional</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <span className="text-[11px] text-slate-600 block">Lampirkan Bukti Setoran (Opsional)</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Kirim Setoran Angsuran
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
