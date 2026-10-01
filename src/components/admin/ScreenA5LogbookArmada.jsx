import React, { useState } from 'react';
import { 
  Bus, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  User, 
  DollarSign,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ScreenA5LogbookArmada = () => {
  const { incidents, updateIncidentStatus } = useApp();
  const [selectedIncident, setSelectedIncident] = useState(null);

  const COLUMNS = [
    { id: 'Laporan Baru Masuk', title: 'Laporan Baru Masuk', color: 'border-amber-400 bg-amber-50/50 text-amber-800' },
    { id: 'Sedang Dikerjakan Mekanik', title: 'Sedang Dikerjakan Mekanik', color: 'border-blue-400 bg-blue-50/50 text-blue-800' },
    { id: 'Selesai', title: 'Selesai / Body Halus Kembali', color: 'border-emerald-400 bg-emerald-50/50 text-emerald-800' }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Logbook Teknik, Bodi Armada EV & Suket</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Papan pemantauan kerusakan bodi Transjakarta Cawang, penugasan Mekanik KLI / Uday & suket laka
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold border border-slate-200">
            Total {incidents.length} Catatan Kerusakan
          </span>
        </div>
      </div>

      {/* 2. Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map(col => {
          const colItems = incidents.filter(inc => {
            if (col.id === 'Selesai') {
              return inc.status.includes('Selesai');
            }
            return inc.status === col.id;
          });

          return (
            <div key={col.id} className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200/80 flex flex-col min-h-[500px]">
              
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full border-2 ${col.color}`} />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    {col.title}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-700 shadow-sm border border-slate-200">
                  {colItems.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIncident(item)}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition cursor-pointer group"
                  >
                    {/* Vehicle Badge & Suket */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black font-mono bg-[#0B2F64] text-white">
                        {item.body}
                      </span>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        item.suketStatus.includes('Selesai') 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : item.suketStatus.includes('Diproses')
                          ? 'bg-purple-50 text-purple-700 border-purple-300 animate-pulse'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {item.suketStatus}
                      </span>
                    </div>

                    {/* Driver & Date */}
                    <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {item.driver}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{item.date}</span>
                    </div>

                    {/* Damage description */}
                    <div className="text-xs font-semibold text-slate-700 my-2 line-clamp-2 leading-relaxed">
                      {item.damage}
                    </div>

                    {/* Repair Info & Mechanic */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-teal-600" />
                        {item.mechanic}
                      </span>

                      {item.expenseRef && item.expenseRef !== '-' && (
                        <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[10px]">
                          {item.expenseRef}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {colItems.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
                    Tidak ada unit di status ini.
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Incident Detail / Mechanic Assignment Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-[#0B2F64] text-white">
                  {selectedIncident.body}
                </span>
                <h4 className="font-bold text-slate-900 text-sm">Status Armada Transjakarta</h4>
              </div>
              <button 
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Pramudi Bertugas:</span>
                <span className="font-bold text-slate-800">{selectedIncident.driver} (NIK: {selectedIncident.nik || '-'})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Titik Lokasi & Waktu:</span>
                <span className="font-medium text-slate-800">{selectedIncident.location || 'Area Operasional Transjakarta'} • {selectedIncident.date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kerusakan:</span>
                <span className="font-semibold text-rose-700">{selectedIncident.damage}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Catatan Tindak Lanjut:</span>
                <span className="text-slate-600">{selectedIncident.notes || '-'}</span>
              </div>

              {/* Status Update Selectors */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
                <div className="font-bold text-slate-800">Update Pengerjaan & Mekanik:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Status Unit:</label>
                    <select
                      value={selectedIncident.status}
                      onChange={(e) => {
                        const updated = { ...selectedIncident, status: e.target.value };
                        setSelectedIncident(updated);
                        updateIncidentStatus(selectedIncident.id, e.target.value, null);
                      }}
                      className="w-full px-2 py-1.5 border rounded-lg bg-white text-xs font-medium"
                    >
                      <option value="Laporan Baru Masuk">Laporan Baru Masuk</option>
                      <option value="Sedang Dikerjakan Mekanik">Sedang Dikerjakan Mekanik</option>
                      <option value="Selesai">Selesai / Body Halus Kembali</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Mekanik Penanggung Jawab:</label>
                    <select
                      value={selectedIncident.mechanic}
                      onChange={(e) => {
                        const updated = { ...selectedIncident, mechanic: e.target.value };
                        setSelectedIncident(updated);
                        updateIncidentStatus(selectedIncident.id, null, e.target.value);
                      }}
                      className="w-full px-2 py-1.5 border rounded-lg bg-white text-xs font-medium"
                    >
                      <option value="Belum Ditugaskan">Belum Ditugaskan</option>
                      <option value="Mekanik KLI">Mekanik KLI</option>
                      <option value="Mekanik Uday">Mekanik Uday</option>
                      <option value="Teknik Depo Cawang">Teknik Depo Cawang</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedIncident(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Simpan & Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
