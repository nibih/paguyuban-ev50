import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Receipt, 
  Calendar, 
  DollarSign, 
  Tag, 
  Check, 
  X,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { rp } from '../../utils/format';

export const ScreenA3Pengeluaran = ({ isModalOpen, setIsModalOpen }) => {
  const { expenses, addExpense, deleteExpense, users } = useApp();
  const [activeTab, setActiveTab] = useState('Semua');
  const [search, setSearch] = useState('');
  const [viewReceiptItem, setViewReceiptItem] = useState(null);

  // Driver list for the talangan picker, alphabetical like the roster.
  const drivers = useMemo(
    () => [...users].sort((a, b) => String(a.name).localeCompare(String(b.name), 'id')),
    [users]
  );

  // New Expense Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState('Bansos');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPic, setFormPic] = useState('');
  const [formBody, setFormBody] = useState('-');
  const [formSource, setFormSource] = useState('Debet Rekening BSI Paguyuban');
  // Which driver's debt card this talangan belongs to. Empty means "cash out
  // of the paguyuban's own pocket", not a loan to anybody.
  const [formRelatedNik, setFormRelatedNik] = useState('');

  const TABS = [
    { label: 'Semua', count: expenses.length },
    { label: 'Bansos', count: expenses.filter(e => e.category === 'Bansos').length },
    { label: 'Talangan', count: expenses.filter(e => e.category === 'Talangan').length },
    { label: 'Belanja Teknik', count: expenses.filter(e => e.category === 'Belanja Teknik').length },
    { label: 'Sparepart', count: expenses.filter(e => e.category === 'Sparepart').length },
    { label: 'Konsumsi & Atensi', count: expenses.filter(e => e.category === 'Konsumsi & Atensi').length },
  ];

  const filteredExpenses = expenses.filter(item => {
    const matchesTab = activeTab === 'Semua' || item.category === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                          item.pic.toLowerCase().includes(search.toLowerCase()) ||
                          (item.body && item.body.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const handleSubmitExpense = (e) => {
    e.preventDefault();
    const nominal = parseInt(formAmount.replace(/\D/g, ''), 10);
    if (!nominal || nominal <= 0) return;

    addExpense({
      date: formDate,
      category: formCategory,
      title: formTitle,
      amount: nominal,
      pic: formPic || 'Admin Depo',
      body: formBody,
      source: formSource,
      ...(formCategory === 'Talangan' && formRelatedNik ? { relatedNik: formRelatedNik } : {})
    });

    // Reset
    setFormTitle('');
    setFormAmount('');
    setFormPic('');
    setFormRelatedNik('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header with Add Button — sticky, so recording an expense never
          means scrolling back up through the whole ledger. */}
      <div className="sticky top-16 z-30 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Buku Kas Pengeluaran & Pembelanjaan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar mutasi resmi pengeluaran kas Paguyuban EV50 — DAMRI SBU Transbusway Cawang EV 50, periode September 2026
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-navy-800 hover:bg-navy-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-2 transition active:scale-95 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Pengeluaran Baru</span>
        </button>
      </div>

      {/* 2. Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {TABS.map(tab => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTab === tab.label
                  ? 'bg-navy-800 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.label ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari transaksi / mekanik..."
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
      </div>

      {/* 3. Master Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Nama Kegiatan / Uraian Transaksi</th>
                <th className="py-3.5 px-3">Kategori</th>
                <th className="py-3.5 px-4 text-right">Nominal (Debet)</th>
                <th className="py-3.5 px-4">Pihak Terkait / Mekanik</th>
                <th className="py-3.5 px-4 text-center">Bukti Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp, idx) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-center font-mono text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {exp.date}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{exp.title}</div>
                    <div className="text-[10px] text-slate-400">
                      Sumber: {exp.source} {exp.body && exp.body !== '-' && `• ${exp.body}`}
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                    −{rp(exp.amount)}
                  </td>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                    {exp.pic}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setViewReceiptItem(exp)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200"
                    >
                      <Receipt className="w-3 h-3" />
                      <span>Nota</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: + Catat Pengeluaran Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Catat Pengeluaran Kas Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  >
                    <option value="Bansos">Bansos Sosial & Sakit</option>
                    <option value="Bantuan Laka / Suket">Bantuan Laka & Suket</option>
                    <option value="Talangan">Dana Talangan Anggota</option>
                    <option value="Sparepart">Sparepart & Suku Cadang</option>
                    <option value="Belanja Teknik">Kebutuhan Teknik, Cat & Stiker</option>
                    <option value="Konsumsi & Atensi">Konsumsi & Atensi Mekanik</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Transaksi</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Pembelian Cat, Tinner, dll + Transport"
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Body Bus (Opsional)</label>
                  <select
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl outline-none"
                  >
                    <option value="-">- Bukan Bodi Tertentu -</option>
                    <option value="Body 237">Body 237</option>
                    <option value="Body 242">Body 242</option>
                    <option value="Body 248">Body 248</option>
                    <option value="Body 258">Body 258</option>
                    <option value="Body 270">Body 270</option>
                    <option value="Body 285">Body 285</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penerima / PIC Mekanik</label>
                  <input
                    type="text"
                    value={formPic}
                    onChange={(e) => setFormPic(e.target.value)}
                    placeholder="Contoh: Mekanik KLI / Uday / Afrizal"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

              </div>

              {formCategory === 'Talangan' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Talangan untuk Pramudi</label>
                  <select
                    value={formRelatedNik}
                    onChange={(e) => setFormRelatedNik(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">- Bukan talangan anggota (tidak menambah kartu) -</option>
                    {drivers.map((u) => (
                      <option key={u.nik} value={u.nik}>{u.name} · {u.nik}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nominal ini menambah kartu piutang pramudi yang dipilih, dan
                    dihapus lagi kalau pengeluaran ini dihapus.
                  </p>
                </div>
              )}

              {/* The receipt is the printable record opened by the Nota button,
                  not an uploaded photo: the old file picker stored only the
                  filename, so it promised evidence it never kept — and the
                  extra `receipt` key was rejected by the expense rules, which
                  made every web save fail. Photos would need a real upload
                  path and a storage decision first. */}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-navy-800 hover:bg-navy-700 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {viewReceiptItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">Pratinjau Nota Pengeluaran</h4>
              <button onClick={() => setViewReceiptItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1.5">
              <div className="text-center font-bold pb-2 border-b border-dashed border-slate-300">
                BUKTI KAS KELUAR RESMI<br/>
                PAGUYUBAN EV50<br/>
                <span className="font-normal">DAMRI SBU TRANSBUSWAY CAWANG</span>
              </div>
              <div className="flex justify-between">
                <span>Ref ID:</span>
                <span className="font-bold">EXP-{viewReceiptItem.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span className="font-bold">{viewReceiptItem.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Uraian:</span>
                <span className="font-bold text-right">{viewReceiptItem.title}</span>
              </div>
              <div className="flex justify-between">
                <span>PIC / Vendor:</span>
                <span className="font-bold">{viewReceiptItem.pic}</span>
              </div>
              <div className="flex justify-between">
                <span>Sumber Kas:</span>
                <span>{viewReceiptItem.source}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-bold text-xs text-rose-600">
                <span>NOMINAL KELUAR:</span>
                <span>{rp(viewReceiptItem.amount)}</span>
              </div>
            </div>

            {/* Delete lives behind the receipt preview on purpose: you see the
                full record — date, PIC, source, nominal — before removing it. */}
            <div className="pt-3">
              <button
                onClick={() => {
                  if (window.confirm(`Hapus pengeluaran "${viewReceiptItem.title}" senilai ${rp(viewReceiptItem.amount)}? Saldo vault akan menyesuaikan.`)) {
                    // deleteExpense takes the whole record, not the id — it
                    // needs expense.source to know which vault bucket to
                    // refund and expense.amount for how much.
                    deleteExpense(viewReceiptItem);
                    setViewReceiptItem(null);
                  }
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-rose-200 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Pengeluaran (Koreksi Admin)</span>
              </button>
            </div>

            <button
              onClick={() => setViewReceiptItem(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold mt-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
