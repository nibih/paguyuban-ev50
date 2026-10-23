import React, { useState } from 'react';
import { Bus, User, KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Admin gate — an ACCOUNT, not a shared password.
//
// Until now the panel opened for anyone who typed a password that was compiled
// into the JavaScript bundle, and then acted as Afrizal regardless of who was
// sitting there. A driver who found the URL could read and edit the books.
//
// Now the gate matches NIK + PIN against `users` and refuses every account
// whose role is not `admin`. The default PIN is the last four digits of the
// NIK, which is how the mobile app already behaves; nothing in Firestore
// stores a PIN yet, so that default is what actually raises the bar, and
// changing it is the next step.
//
// READ THIS BEFORE ASSUMING THE PANEL IS PRIVATE: Firestore rules still have
// no `request.auth` check, because the mobile app never signs in. This gate
// protects the UI, not the data. Someone who calls the Firestore API directly
// is not stopped by it.
const Splash = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center gap-3 text-slate-400 text-sm">
    <span className="w-4 h-4 border-2 border-slate-700 border-t-teal-400 rounded-full animate-spin" />
    <span>Memeriksa sesi pengurus…</span>
  </div>
);

export const LoginGate = ({ children }) => {
  const { isAdmin, signIn, loading, hasSession } = useApp();
  const [nik, setNik] = useState('');
  const [pin, setPin] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAdmin) return children;

  // A stored session cannot be checked until the roster arrives. Showing the
  // form for that half-second would look like a logout on every refresh.
  if (loading && hasSession) return <Splash />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const res = await signIn(nik, pin);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-400 to-sky-500 p-0.5 shadow-lg flex items-center justify-center mb-4">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Bus className="w-7 h-7 text-teal-400" />
            </div>
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-wide">
            PAGUYUBAN EV50
          </h1>
          <p className="text-xs text-blue-300 font-medium mt-1">
            Panel Pengurus • DAMRI SBU Transbusway Cawang EV 50
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={submit}
          className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white">Masuk Akun Pengurus</h2>
          </div>

          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            NIK
          </label>
          <div className="relative mb-3">
            <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="username"
              value={nik}
              onChange={(e) => {
                setNik(e.target.value.replace(/\D/g, ''));
                if (error) setError('');
              }}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="1700xxxx"
            />
          </div>

          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            PIN
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={show ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                if (error) setError('');
              }}
              className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              title={show ? 'Sembunyikan' : 'Tampilkan'}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !nik || pin.length < 4}
            className="mt-4 w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition active:scale-[0.98]"
          >
            {busy ? 'Memeriksa…' : 'Buka Panel'}
          </button>

          <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
            Hanya akun berstatus pengurus yang bisa membuka panel ini. PIN bawaan
            adalah 4 angka terakhir NIK.
          </p>
        </form>

        <p className="text-center text-[10px] text-slate-600 mt-4">
          Sesi berakhir saat tab ditutup.
        </p>
      </div>
    </div>
  );
};
