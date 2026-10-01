import React, { useState, useEffect } from 'react';
import { 
  Bus, 
  Clock, 
  Bell, 
  ChevronDown, 
  User, 
  ShieldCheck, 
  Smartphone, 
  Monitor,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const TopNavbar = () => {
  const { role, setRole, activeNik, setActiveNik, users, toast } = useApp();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    if (newRole === 'member') {
      setActiveNik('17001137'); // A Sutriadi
    } else {
      setActiveNik('17001589'); // Afrizal Firmansyah
    }
  };

  return (
    <header className="h-16 bg-[#0B2F64] text-white px-4 md:px-8 flex items-center justify-between border-b border-blue-900/60 sticky top-0 z-40 shadow-lg">
      
      {/* App Branding */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-sky-500 p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-[#0B2F64] rounded-[10px] flex items-center justify-center">
            <Bus className="w-5 h-5 text-teal-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm md:text-base tracking-wide text-white flex items-center gap-1.5">
              PAGUYUBAN EV50
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-teal-300 fill-teal-300" /> DAMRI CAWANG
            </span>
          </div>
          <p className="text-[11px] text-blue-200 font-medium hidden sm:block">
            SBU TRANSBUSWAY AREA CAWANG • SISTEM MUTUAL-AID PRAMUDI
          </p>
        </div>
      </div>

      {/* Middle Status / Real-time Clock */}
      <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-blue-950/60 border border-blue-800/60 px-3 py-1.5 rounded-xl text-teal-300 shadow-inner">
        <Clock className="w-3.5 h-3.5 text-teal-400" />
        <span>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</span>
        <span className="text-slate-400 font-sans">•</span>
        <span className="font-sans text-blue-200">
          {time.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Role Switcher & Notification Controls */}
      <div className="flex items-center space-x-3">
        
        {/* Role Switcher Dropdown */}
        <div className="flex items-center bg-blue-950/80 border border-blue-700/60 rounded-xl p-1 shadow-sm">
          <div className="px-2 hidden sm:flex items-center text-teal-300 text-xs font-bold gap-1">
            {role === 'member' ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span className="text-[11px] uppercase tracking-wider text-slate-300">Mode:</span>
          </div>

          <select
            value={role}
            onChange={handleRoleChange}
            className="bg-[#0e3b7d] text-white text-xs font-bold py-1.5 px-3 rounded-lg border border-blue-500/40 outline-none cursor-pointer hover:bg-blue-800 transition"
          >
            <option value="member">📱 Member (Pramudi - A Sutriadi)</option>
            <option value="admin">💻 Admin (Pengurus / Korlap - Afrizal)</option>
          </select>
        </div>

        {/* Member Selector (If in member mode) */}
        {role === 'member' && (
          <select
            value={activeNik}
            onChange={(e) => setActiveNik(e.target.value)}
            className="hidden md:block bg-blue-950/80 text-blue-200 text-xs py-1.5 px-2.5 rounded-xl border border-blue-800 outline-none cursor-pointer"
            title="Ganti Pengemudi untuk Test Kasus"
          >
            <option value="17001137">A Sutriadi (Lunas & Bersih)</option>
            <option value="17001504">M. Sapli (Ada Hutang Rp200k)</option>
            <option value="17001109">M. Hasan (Ada Hutang Rp500k)</option>
            <option value="17000839">Bayu Dyan (Ada Hutang Rp300k)</option>
          </select>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button 
            className="w-9 h-9 rounded-xl bg-blue-950/60 hover:bg-blue-900 border border-blue-800/80 flex items-center justify-center text-blue-200 hover:text-white transition"
            title="Notifikasi Sistem"
          >
            <Bell className="w-4 h-4" />
          </button>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-400 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow">
            2
          </span>
        </div>

      </div>

    </header>
  );
};
