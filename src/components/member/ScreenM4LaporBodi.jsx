import React, { useState } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  ShieldAlert, 
  Camera, 
  Calendar, 
  MapPin, 
  Check, 
  Send,
  Bus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ScreenM4LaporBodi = () => {
  const { currentUser, addIncidentReport, setMemberTab } = useApp();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [body, setBody] = useState('Body 248');
  const [location, setLocation] = useState('');
  const [damageTypes, setDamageTypes] = useState(['Bemper Kanan / Kiri Baret']);
  const [customDamage, setCustomDamage] = useState('');
  const [description, setDescription] = useState('');
  const [suketNeeded, setSuketNeeded] = useState(false);
  const [needMechanic, setNeedMechanic] = useState(true);
  const [fileName, setFileName] = useState('');

  const DAMAGE_OPTIONS = [
    'Bemper Kanan / Kiri Baret',
    'Bodi Bawah Gompal',
    'Kaca Spion Pecah',
    'Lampu Utama / Sein Retak',
    'Lainnya (tulis manual)'
  ];

  const handleCheckboxChange = (option) => {
    if (damageTypes.includes(option)) {
      setDamageTypes(damageTypes.filter(item => item !== option));
    } else {
      setDamageTypes([...damageTypes, option]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!location.trim()) {
      alert('Mohon cantumkan titik lokasi kejadian');
      return;
    }

    addIncidentReport({
      body: body,
      driver: currentUser.name,
      nik: currentUser.nik,
      location: location,
      damage: damageTypes.includes('Lainnya (tulis manual)') 
        ? `${damageTypes.filter(d => d !== 'Lainnya (tulis manual)').join(', ')} - ${customDamage}`
        : damageTypes.join(', '),
      damageTypes: damageTypes,
      notes: description || 'Laporan baru dibuat melalui aplikasi pengemudi EV50.',
      suketNeeded: suketNeeded,
      needMechanic: needMechanic
    });

    // Reset & redirect to home
    setMemberTab('M1');
  };

  return (
    <div className="space-y-4 pb-14">
      {/* 1. Header */}
      <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase tracking-wider mb-1">
          <Wrench className="w-4 h-4 text-teal-600" /> Form Khusus Pramudi
        </div>
        <p className="text-xs text-teal-900 leading-relaxed">
          Laporkan baret, tabrakan, atau kendala bodi untuk koordinasi perbaikan teknis mekanik (KLI/Uday) dan surat keterangan (suket) kepolisian.
        </p>
      </div>

      {/* 2. Interactive Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-4 text-xs">
        
        {/* Field 1: Tanggal & Waktu Kejadian */}
        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal & Waktu Kejadian
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
            required
          />
        </div>

        {/* Field 2: Nomor Lambung Bus */}
        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Bus className="w-3.5 h-3.5 text-slate-400" /> Nomor Lambung Bus (Body EV)
          </label>
          <select
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="Body 237">Body 237 (Electric Bus Transjakarta)</option>
            <option value="Body 242">Body 242 (Electric Bus Transjakarta)</option>
            <option value="Body 248">Body 248 (Electric Bus Transjakarta)</option>
            <option value="Body 258">Body 258 (Electric Bus Transjakarta)</option>
            <option value="Body 270">Body 270 (Electric Bus Transjakarta)</option>
            <option value="Body 285">Body 285 (Electric Bus Transjakarta)</option>
          </select>
        </div>

        {/* Field 3: Titik Lokasi Insiden */}
        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" /> Titik Lokasi Insiden
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Contoh: Koridor 6H / Tol JORR / Halte Cawang UKI"
            className="w-full px-3 py-2 border rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
            required
          />
        </div>

        {/* Field 4: Jenis & Bagian Kerusakan */}
        <div>
          <label className="block font-bold text-slate-700 mb-2">
            Jenis & Bagian Kerusakan Bodi
          </label>
          <div className="space-y-2">
            {DAMAGE_OPTIONS.map((item) => (
              <label 
                key={item} 
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={damageTypes.includes(item)}
                  onChange={() => handleCheckboxChange(item)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 border-slate-300"
                />
                <span className="text-slate-800 font-medium text-xs">{item}</span>
              </label>
            ))}

            {damageTypes.includes('Lainnya (tulis manual)') && (
              <input
                type="text"
                value={customDamage}
                onChange={(e) => setCustomDamage(e.target.value)}
                placeholder="Sebutkan detail kerusakan lain..."
                className="w-full px-3 py-2 border rounded-xl text-xs mt-1 outline-none focus:ring-2 focus:ring-teal-500"
              />
            )}
          </div>
        </div>

        {/* Field 5: Deskripsi Kronologi Singkat */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Deskripsi Kronologi Singkat
          </label>
          <textarea
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan singkat penyebab baret/insiden (misal: tersenggol pohon saat manuver, terpepet kendaraan pribadi)..."
            className="w-full px-3 py-2 border rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
          />
        </div>

        {/* Field 6: Kebutuhan Bantuan Paguyuban */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block font-bold text-slate-700">
            Dukungan Operasional Paguyuban
          </label>

          {/* Suket Toggle */}
          <div className="flex items-start justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="pr-2">
              <div className="font-bold text-slate-800">
                Perlu Pengurusan Surat Keterangan (Suket) Laka Polisi
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Estimasi biaya suket disupport/ditalangi kas paguyuban EV50 untuk laporan laka DAMRI.
              </p>
            </div>
            <input
              type="checkbox"
              checked={suketNeeded}
              onChange={(e) => setSuketNeeded(e.target.checked)}
              className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 mt-0.5 cursor-pointer"
            />
          </div>

          {/* Mechanic Toggle */}
          <div className="flex items-start justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="pr-2">
              <div className="font-bold text-slate-800">
                Perlu Pendampingan Mekanik Jalur
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Pengerjaan touch-up cat / perbaikan darurat oleh Mekanik KLI atau Mekanik Uday di Depo Cawang.
              </p>
            </div>
            <input
              type="checkbox"
              checked={needMechanic}
              onChange={(e) => setNeedMechanic(e.target.checked)}
              className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 mt-0.5 cursor-pointer"
            />
          </div>
        </div>

        {/* Field 7: Lampiran Foto Kerusakan */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Lampiran Foto Kerusakan Armada
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-teal-500 bg-slate-50 transition cursor-pointer relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFileName(e.target.files[0]?.name || 'foto_bodi.jpg')}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <span className="text-slate-600 font-medium block text-xs">
              {fileName ? fileName : 'Ambil foto bodi atau upload dari galeri'}
            </span>
            <span className="text-[10px] text-slate-400">JPG, PNG resolusi jelas</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition active:scale-[0.98]"
        >
          <Send className="w-4 h-4" />
          <span>Kirim Laporan Kerusakan ke Tim Korlap & Mekanik</span>
        </button>
      </form>
    </div>
  );
};
