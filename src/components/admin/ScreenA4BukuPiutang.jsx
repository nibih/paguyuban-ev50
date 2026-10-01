import React, { useState } from 'react';
import { 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Plus, 
  X, 
  ArrowRight,
  Receipt,
  Printer
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ScreenA4BukuPiutang = () => {
  const { debts, repayDebt } = useApp();
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [installmentNominal, setInstallmentNominal] = useState('100000');
  const [installmentMethod, setInstallmentMethod] = useState('Cash ke Admin');

  const totalOutstanding = debts.reduce((acc, curr) => acc + (curr.amount - curr.paid), 0);

  const handleSaveInstallment = (e) => {
    e.preventDefault();
    if (!selectedDebt) return;
    const nominal = parseInt(installmentNominal.replace(/\D/g, ''), 10);
    if (!nominal || nominal <= 0) return;

    repayDebt(selectedDebt.id, nominal, installmentMethod);

    // Update selectedDebt locally for drawer view
    setSelectedDebt(prev => {
      const newPaid = prev.paid + nominal;
      const newRemaining = Math.max(0, prev.amount - newPaid);
      return {
        ...prev,
        paid: newPaid,
        status: newRemaining === 0 ? 'Lunas' : 'Sedang Mengangsur',
        mutations: [
          ...prev.mutations,
          {
            id: Date.now(),
            date: new Date().toLocaleDateString('id-ID'),
            desc: `Setoran Angsuran (${installmentMethod})`,
            debit: 0,
            credit: nominal,
            balance: newRemaining
          }
        ]
      };
    });

    setInstallmentNominal('100000');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Summary Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-amber-900">
              Total Piutang Paguyuban Beredar
            </div>
            <div className="text-2xl font-black font-mono text-amber-950 mt-0.5">
              Rp{totalOutstanding.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="text-xs text-amber-800 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-amber-200">
          <span className="font-bold">{debts.filter(d => (d.amount - d.paid) > 0).length} Anggota</span> memiliki tanggungan dana talangan aktif.
        </div>
      </div>

      {/* 2. Debtor Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Buku Rekapitulasi Piutang & Pinjaman</h3>
          <span className="text-xs text-slate-400">Klik baris mana saja untuk mutasi & input cicilan</span>
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
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debts.map((item) => {
                const remaining = item.amount - item.paid;
                const isLunas = remaining === 0;

                return (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedDebt(item)}
                    className="hover:bg-amber-50/50 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {item.nik}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-amber-800 transition">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.body}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                      {item.incident}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {item.startDate}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      Rp{item.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600">
                      Rp{item.paid.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                      Rp{remaining.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isLunas ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Lunas
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold group-hover:bg-amber-600 group-hover:text-white transition">
                        Buka Buku
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Interactive Member Debt Drawer / Modal */}
      {selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono text-slate-400">KARTU PIUTANG ANGGOTA</span>
                <h3 className="font-bold text-slate-900 text-base">{selectedDebt.name}</h3>
                <span className="text-xs text-slate-500 font-mono">NIK: {selectedDebt.nik}</span>
              </div>
              <button 
                onClick={() => setSelectedDebt(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Incident Summary Info */}
            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div>
                <span className="text-slate-400 block text-[10px]">Uraian Laka / Kebutuhan:</span>
                <span className="font-bold text-slate-800">{selectedDebt.incident}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Talangan:</span>
                  <span className="font-mono font-bold text-slate-900">
                    Rp{selectedDebt.amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sisa Kewajiban:</span>
                  <span className="font-mono font-bold text-rose-600">
                    Rp{(selectedDebt.amount - selectedDebt.paid).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Input Setoran Cicilan */}
            {(selectedDebt.amount - selectedDebt.paid) > 0 && (
              <form onSubmit={handleSaveInstallment} className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 text-xs mb-4">
                <div className="font-bold text-amber-900">Input Setoran Angsuran / Cicilan</div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nominal Angsuran (Rp)</label>
                  <input
                    type="number"
                    step="50000"
                    value={installmentNominal}
                    onChange={(e) => setInstallmentNominal(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Metode Setoran</label>
                  <select
                    value={installmentMethod}
                    onChange={(e) => setInstallmentMethod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl outline-none"
                  >
                    <option value="Cash ke Admin">Tunai ke Kasir Admin (Kholiq)</option>
                    <option value="Transfer BSI">Transfer Rekening BSI Paguyuban</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow transition"
                >
                  Simpan Setoran Angsuran
                </button>
              </form>
            )}

            {/* Mutation History */}
            <div className="flex-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                Riwayat Pembukuan Mutasi
              </h4>
              <div className="space-y-2">
                {selectedDebt.mutations.map((m, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{m.desc}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{m.date}</div>
                    </div>
                    <div className="text-right">
                      {m.debit > 0 ? (
                        <span className="font-mono font-bold text-rose-600 block">+ Rp{m.debit.toLocaleString('id-ID')}</span>
                      ) : (
                        <span className="font-mono font-bold text-emerald-600 block">- Rp{m.credit.toLocaleString('id-ID')}</span>
                      )}
                      <span className="text-[9px] text-slate-400">Sisa: Rp{m.balance.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Print */}
            <div className="pt-4 border-t border-slate-100 mt-4">
              <button 
                onClick={() => window.print()}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Rekening Koran Driver</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
