import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Check, 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  Send, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ScreenA2MatriksIuran = () => {
  const { users, iuranRecords, markIuranPaidCash, MONTHS, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Filter users based on search & payment status
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
                          user.nik.includes(search);

    const userIuran = iuranRecords[user.nik] || {};
    const septStatus = userIuran['September']?.status;

    let matchesStatus = true;
    if (statusFilter === 'Lunas Bulan Ini') {
      matchesStatus = septStatus === 'lunas';
    } else if (statusFilter === 'Menunggak 1 Bulan') {
      matchesStatus = septStatus !== 'lunas' && userIuran['Agustus']?.status === 'lunas';
    } else if (statusFilter === 'Menunggak >2 Bulan') {
      // Unpaid in Aug & Sept
      matchesStatus = septStatus !== 'lunas' && userIuran['Agustus']?.status !== 'lunas';
    }

    return matchesSearch && matchesStatus;
  });

  // Export CSV simulation
  const handleExportCSV = () => {
    let csv = "No,NIK,Nama Pramudi,Mei,Juni,Juli,Agustus,September\n";
    users.forEach((u, i) => {
      const rec = iuranRecords[u.nik] || {};
      const row = [
        i + 1,
        `"${u.nik}"`,
        `"${u.name}"`,
        rec['Mei']?.status === 'lunas' ? 'Lunas' : (rec['Mei']?.nominal || '0'),
        rec['Juni']?.status === 'lunas' ? 'Lunas' : (rec['Juni']?.nominal || '0'),
        rec['Juli']?.status === 'lunas' ? 'Lunas' : (rec['Juli']?.nominal || '0'),
        rec['Agustus']?.status === 'lunas' ? 'Lunas' : (rec['Agustus']?.nominal || '0'),
        rec['September']?.status === 'lunas' ? 'Lunas' : (rec['September']?.nominal || 'Belum Bayar')
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Iuran_Paguyuban_EV50_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('File CSV Rekap Iuran berhasil di-download!');
  };

  const handleSendWhatsAppReminder = () => {
    showToast('Pesan Broadcast WhatsApp pengingat iuran berhasil dikirim ke 7 nomor pengemudi yang menunggak!', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Matriks Iuran Anggota & Rekonsiliasi Bank</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan iuran wajib bulanan Rp100.000 / Pramudi Armada EV Transjakarta Area Cawang
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSendWhatsAppReminder}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Pengingat WA Menunggak</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-[#0B2F64] hover:bg-[#123e7e] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel (.csv)</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan Nama atau NIK pramudi..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['Semua', 'Lunas Bulan Ini', 'Menunggak 1 Bulan', 'Menunggak >2 Bulan'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Dynamic Spreadsheet-Like Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">NIK</th>
                <th className="py-3.5 px-4">Nama Pramudi</th>
                {MONTHS.map(m => (
                  <th key={m} className="py-3.5 px-3 text-center">{m}</th>
                ))}
                <th className="py-3.5 px-4 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user, idx) => {
                const rec = iuranRecords[user.nik] || {};
                const septStatus = rec['September']?.status;
                const isSeptPaid = septStatus === 'lunas';

                return (
                  <tr key={user.nik} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {user.nik}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{user.name}</div>
                      <div className="text-[10px] text-slate-400">{user.position || user.role}</div>
                    </td>

                    {/* Month Columns */}
                    {MONTHS.map(month => {
                      const mData = rec[month];
                      const isLunas = mData?.status === 'lunas';
                      const isSpecial = mData?.status === 'special';

                      return (
                        <td key={month} className="py-3 px-2 text-center">
                          {isLunas ? (
                            <span 
                              title={`Lunas: ${mData.date || '-'} via ${mData.method || 'BSI'}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-help"
                            >
                              <Check className="w-3 h-3 text-emerald-600" />
                              Rp100.000
                            </span>
                          ) : isSpecial ? (
                            <span 
                              title={mData.note}
                              className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 cursor-help"
                            >
                              Rp{mData.nominal.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Belum Bayar
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Aksi Cepat */}
                    <td className="py-3 px-4 text-center">
                      {!isSeptPaid ? (
                        <button
                          onClick={() => markIuranPaidCash(user.nik, 'September')}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition active:scale-95"
                          title="Tandai Lunas Tunai Kasir"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Lunas Tunai</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Terverifikasi
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
