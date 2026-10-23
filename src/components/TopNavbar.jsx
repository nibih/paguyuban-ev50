import React, { useState, useEffect } from 'react';
import { Bus, Clock, LogOut, Zap, Users, Wallet, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Admin panel top bar: identity, live clock, and the three counts a cashier
// glances at before deciding which screen to open.
//
// The old role switcher (Member / Admin) and the member-identity dropdown are
// gone — there is no member mode on the website any more.

// Stat pill in the top bar. Module-scope: TopNavbar re-renders every second off
// its clock, and a component defined inside it was remounting 4x/second.
const Stat = ({ icon: Icon, value, label, tone }) => (
  <div className="hidden md:flex items-center gap-2 bg-blue-950/60 border border-blue-800/60 px-3 py-1.5 rounded-xl" title={label}>
    <Icon className={`w-3.5 h-3.5 ${tone}`} />
    <span className="text-sm font-black text-white leading-none font-mono">{value}</span>
    <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wide">{label}</span>
  </div>
);

export const TopNavbar = () => {
  const { currentUser, users, debts, iuranRecords, signOut } = useApp();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // How many claims are waiting on a cashier right now. This is the number
  // that should be non-zero most often: money claimed but not yet checked.
  const pendingClaims = React.useMemo(() => {
    let n = 0;
    Object.values(iuranRecords).forEach((months) => {
      Object.values(months || {}).forEach((entry) => {
        if (entry?.status === 'pending') n += 1;
      });
    });
    debts.forEach((d) => { n += (d.pendingInstallments || []).length; });
    return n;
  }, [iuranRecords, debts]);

  const activeDrivers = users.filter((u) => u.status !== 'inactive').length;

  return (
    <header className="h-16 bg-navy-800 text-white px-4 md:px-8 flex items-center justify-between border-b border-blue-900/60 sticky top-0 z-40 shadow-lg">
      {/* App Branding */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-sky-500 p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-navy-800 rounded-[10px] flex items-center justify-center">
            <Bus className="w-5 h-5 text-teal-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm md:text-base tracking-wide text-white flex items-center gap-1.5">
              PAGUYUBAN EV50
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-teal-300 fill-teal-300" /> PANEL PENGURUS
            </span>
          </div>
          <p className="text-[11px] text-blue-200 font-medium hidden sm:block">
            DAMRI SBU TRANSBUSWAY CAWANG EV 50 • KAS &amp; IURAN PRAMUDI
          </p>
        </div>
      </div>

      {/* Live counts */}
      <div className="flex items-center gap-2">
        <Stat icon={Users} value={activeDrivers} label="Pramudi" tone="text-teal-300" />
        <Stat icon={Wallet} value={debts.length} label="Kartu Piutang" tone="text-amber-300" />

        {pendingClaims > 0 ? (
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/50 px-3 py-1.5 rounded-xl" title="Menunggu verifikasi kasir">
            <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-sm font-black text-amber-200 leading-none font-mono">{pendingClaims}</span>
            <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wide hidden sm:inline">Menunggu Verifikasi</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/40 px-3 py-1.5 rounded-xl" title="Tidak ada klaim menunggu">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wide">Antrean Bersih</span>
          </div>
        )}

        {/* Clock */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-blue-950/60 border border-blue-800/60 px-3 py-1.5 rounded-xl text-teal-300 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          <span>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</span>
        </div>

        {/* Cashier identity. The panel now has a real account behind it, so
            the identity block doubles as the sign-out control. */}
        <button
          onClick={signOut}
          className="flex items-center gap-2 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 rounded-xl px-3 py-1.5 shadow-sm transition group"
          title={`Keluar dari akun ${currentUser?.name || ''}`}
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">
            {(currentUser?.name || 'Pengurus').split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </div>
          <div className="hidden sm:block leading-tight text-left">
            <div className="text-[11px] font-bold text-white">{currentUser?.name || 'Pengurus'}</div>
            <div className="text-[9px] text-teal-300 font-semibold uppercase tracking-wide">{currentUser?.position || 'Pengurus'}</div>
          </div>
          <LogOut className="w-3.5 h-3.5 text-blue-300 group-hover:text-rose-300 hidden sm:block ml-1 transition" />
        </button>
      </div>
    </header>
  );
};
