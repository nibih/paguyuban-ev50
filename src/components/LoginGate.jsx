import React, { useState, useEffect } from 'react';
import { Bus, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';

// Admin password gate.
//
// READ THIS BEFORE ASSUMING THE PANEL IS PRIVATE.
//
// The Firestore rules deployed on this project have no `request.auth` check —
// they enforce data integrity (valid shapes, derived status, bounded lists)
// but NOT authorization. That is deliberate: the mobile app never signs in,
// so tightening the rules to require authentication would break every driver's
// phone.
//
// Consequence: this password is a DETERRENT, not security. The correct value
// is compiled into the JavaScript bundle, so anyone who opens devtools can
// read it. It stops a colleague walking up to an unlocked laptop, and it
// stops search engines indexing the panel. It does not stop someone who
// decides to look.
//
// The real fix is Firebase Auth for the pengurus plus a rules change to
// `request.auth != null` — which requires adding sign-in to the mobile app
// first. Until then, treat the URL as the actual secret.
const STORAGE_KEY = 'paguyuban.admin.unlocked';

// VITE_ADMIN_PASSWORD is read from .env.local (gitignored). The fallback below
// exists so `npm run dev` works on a fresh clone with no .env — it is a
// development default, not a production secret.
const PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'EV50-Cawang-2026';

export const LoginGate = ({ children }) => {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Lock again when the tab closes, so a shared depot machine re-locks itself.
  useEffect(() => {
    const onUnload = () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* storage unavailable — nothing to clear */
      }
    };
    window.addEventListener('unload', onUnload);
    return () => window.removeEventListener('unload', onUnload);
  }, []);

  if (unlocked) return children;

  const submit = (e) => {
    e.preventDefault();
    if (value === PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* private mode — stay unlocked for this render only */
      }
      setUnlocked(true);
      setError('');
      return;
    }
    setAttempts((a) => a + 1);
    setValue('');
    setError('Kata sandi salah.');
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
            Panel Pengurus • SBU Transbusway Area Cawang
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={submit}
          className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white">Masuk Panel Admin</h2>
          </div>

          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Kata Sandi Pengurus
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              autoComplete="current-password"
              className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="••••••••••"
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
            className="mt-4 w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold rounded-xl transition active:scale-[0.98]"
          >
            Buka Panel
          </button>

          {attempts >= 3 && (
            <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
              Panel ini terhubung langsung ke data Firestore. Kata sandi ada di
              bundel JavaScript, jadi anggap URL-nya sebagai rahasia yang
              sebenarnya.
            </p>
          )}
        </form>

        <p className="text-center text-[10px] text-slate-600 mt-4">
          Sesi terkunci otomatis saat tab ditutup.
        </p>
      </div>
    </div>
  );
};
