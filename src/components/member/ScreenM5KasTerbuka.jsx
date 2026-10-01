import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Receipt, 
  ExternalLink, 
  Calendar, 
  CheckCircle, 
  Tag,
  DollarSign,
  Eye,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ScreenM5KasTerbuka = () => {
  const { expenses } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [activeReceipt, setActiveReceipt] = useState(null);

  const CATEGORIES = [
    'Semua',
    'Bansos',
    'Talangan',
    'Bantuan Laka / Suket',
    'Sparepart',
    'Belanja Teknik',
    'Konsumsi & Atensi'
  ];

  const filteredExpenses = expenses.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                          item.pic.toLowerCase().includes(search.toLowerCase()) ||
                          (item.body && item.body.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'Semua' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Bansos':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Talangan':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Bantuan Laka / Suket':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Sparepart':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Belanja Teknik':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'Konsumsi & Atensi':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 pb-14">
      {/* 1. Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Transparansi Dana Paguyuban</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Akuntabilitas Arus Kas Masuk & Keluar Kas Paguyuban EV50 Cawang
        </p>
      </div>

      {/* 2. Search & Category Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari transaksi, cat, suket, mekanik..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
          />
        </div>

        {/* Scrollable category pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#0B2F64] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Detailed Transaction Cards / List */}
      <div className="space-y-2.5">
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map((exp) => (
            <div 
              key={exp.id} 
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {exp.date}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getCategoryColor(exp.category)}`}>
                  {exp.category}
                </span>
              </div>

              <div className="font-bold text-slate-900 text-xs mb-1">
                {exp.title}
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-500 font-medium">
                  {exp.pic ? `PIC / Penerima: ${exp.pic}` : 'Operasional EV50'}
                </span>
                <span className="font-mono font-bold text-rose-600 text-xs">
                  - Rp{exp.amount.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 text-[10px]">
                  Sumber: {exp.source || 'Kas Kecil Tunai'}
                </span>
                <button
                  onClick={() => setActiveReceipt(exp)}
                  className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/70"
                >
                  <Eye className="w-3 h-3" />
                  <span>Lihat Bukti Nota</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
            Tidak ada transaksi pengeluaran yang cocok dengan filter.
          </div>
        )}
      </div>

      {/* Modal Preview Nota / Struk Bukti */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <h4 className="font-bold text-slate-900 text-sm">Bukti Nota Digital</h4>
              </div>
              <button 
                onClick={() => setActiveReceipt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              {/* Receipt Simulation Visual */}
              <div className="border border-slate-300 rounded-lg p-3 bg-white shadow-inner font-mono text-[11px] text-slate-700 space-y-1.5">
                <div className="text-center font-bold pb-2 border-b border-dashed border-slate-300">
                  *** PAGUYUBAN EV50 CAWANG ***<br/>
                  BUKTI PENGELUARAN SAH
                </div>
                <div className="flex justify-between pt-1">
                  <span>Tanggal:</span>
                  <span className="font-bold">{activeReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uraian:</span>
                  <span className="font-bold text-right">{activeReceipt.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>PIC / Penerima:</span>
                  <span className="font-bold">{activeReceipt.pic}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kategori:</span>
                  <span className="font-bold">{activeReceipt.category}</span>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between font-bold text-xs text-rose-600">
                  <span>TOTAL DEBET:</span>
                  <span>Rp{activeReceipt.amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200">
                  TERVERIFIKASI BENDAHARA / KORLAP
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
