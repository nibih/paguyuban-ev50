import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  CreditCard, 
  Building2, 
  Clock, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MidtransModal } from '../MidtransModal';

export const ScreenM2Iuran = () => {
  const { currentUser, iuranRecords, payIuranMonths, MONTHS } = useApp();
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const userIuran = iuranRecords[currentUser.nik] || {};

  const toggleMonth = (month) => {
    if (userIuran[month]?.status === 'lunas' || userIuran[month]?.status === 'special') return;
    
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  const handlePaySelection = () => {
    if (selectedMonths.length === 0) return;
    setIsModalOpen(true);
  };

  const totalBill = selectedMonths.length * 100000;

  return (
    <div className="space-y-4 pb-14">
      {/* 1. Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Status Iuran Anggota</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Kewajiban Iuran Rutin Rp100.000 / Bulan (Perlindungan Armada & Kas Solidaritas EV50 Cawang)
        </p>
      </div>

      {/* 2. Month Progress Tracker */}
      <div className="space-y-2.5">
        {MONTHS.map((month) => {
          const record = userIuran[month];
          const isLunas = record?.status === 'lunas';
          const isSpecial = record?.status === 'special';
          const isSelected = selectedMonths.includes(month);

          return (
            <div
              key={month}
              onClick={() => toggleMonth(month)}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                isLunas
                  ? 'bg-emerald-50/50 border-emerald-200 cursor-default'
                  : isSpecial
                  ? 'bg-sky-50/50 border-sky-200 cursor-default'
                  : isSelected
                  ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 cursor-pointer shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Selection checkbox for unpaid */}
                {!isLunas && !isSpecial ? (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // controlled by wrapper div
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 pointer-events-none"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{month} 2026</span>
                    {isLunas && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold">
                        Lunas
                      </span>
                    )}
                    {isSpecial && (
                      <span className="text-[10px] text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded font-semibold">
                        {record.note || 'Khusus'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Rp{(record?.nominal || 100000).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Status & Method Badge */}
              <div className="text-right">
                {isLunas ? (
                  <div>
                    <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700">
                      Terverifikasi
                    </span>
                    <span className="block text-[9px] text-slate-400">
                      {record.method || 'Transfer BSI'}
                    </span>
                  </div>
                ) : isSpecial ? (
                  <div>
                    <span className="inline-flex items-center text-[11px] font-semibold text-sky-700">
                      Rp{record.nominal.toLocaleString('id-ID')}
                    </span>
                    <span className="block text-[9px] text-slate-400">Kasus Khusus</span>
                  </div>
                ) : (
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <AlertCircle className="w-3 h-3" /> Tunggakan
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">
                      {isSelected ? 'Terpilih Bayar' : 'Klik utk memilih'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Sticky Bottom Multi-Month Selection Drawer */}
      {selectedMonths.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-30 max-w-sm mx-auto bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between animate-bounce-subtle">
          <div>
            <div className="text-[11px] text-teal-400 font-semibold">
              {selectedMonths.length} Bulan Terpilih: {selectedMonths.join(', ')}
            </div>
            <div className="text-lg font-mono font-extrabold">
              Total: Rp{totalBill.toLocaleString('id-ID')}
            </div>
          </div>
          <button
            onClick={handlePaySelection}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition"
          >
            <span>Bayar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Payment Modal */}
      <MidtransModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMonths([]);
        }}
        selectedMonths={selectedMonths}
        onPaymentSuccess={(months, method) => payIuranMonths(currentUser.nik, months, method)}
      />
    </div>
  );
};
