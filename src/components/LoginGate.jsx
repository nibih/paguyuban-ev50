import React, { useState } from 'react';
import { Lock, User, KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Admin gate.
//
// Two ways in, and the depot's shared password is still the default one:
//
//   1. Kata Sandi — the password the team has used since day one. Fast, and
//      nobody has to remember a NIK. It is also a DETERRENT, not security: the
//      value is compiled into the JavaScript bundle, so anyone who opens
//      devtools can read it. It stops a colleague at an unlocked laptop; it
//      does not stop someone who decides to look. Actions taken through it are
//      filed under the cashier account the panel has always used (Afrizal),
//      because a shared password carries no identity of its own.
//
//   2. Akun Pengurus — NIK + PIN checked against `users`, refused unless the
//      account is an active admin. This is the way off the shared password,
//      and the only mode where `verifiedBy` names the person who actually
//      clicked.
//
// READ THIS BEFORE ASSUMING THE PANEL IS PRIVATE: Firestore rules still have
// no `request.auth` check, because the mobile app never signs in. This gate
// protects the UI, not the data. Someone who calls the Firestore API directly
// is not stopped by either mode.
const Splash = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center gap-3 text-slate-400 text-sm">
    <span className="w-4 h-4 border-2 border-slate-700 border-t-teal-400 rounded-full animate-spin" />
    <span>Memeriksa sesi pengurus…</span>
  </div>
);

export const LoginGate = ({ children }) => {
  const { isAdmin, signIn, signInWithPassword, loading, hasSession } = useApp();
  const [mode, setMode] = useState('password');

  const [password, setPassword] = useState('');
  const [nik, setNik] = useState('');
  const [pin, setPin] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAdmin) return children;

  // A stored account session cannot be checked until the roster arrives.
  // Showing the form for that half-second would look like a logout on every
  // refresh. (A password session is already `isAdmin` above.)
  if (loading && hasSession) return <Splash />;

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setPassword('');
    setPin('');
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const res = signInWithPassword(password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setPassword('');
    }
  };

  const submitAccount = async (e) => {
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

  const tabClass = (id) =>
    `flex-1 py-2 rounded-lg text-[11px] font-bold transition ${
      mode === id
        ? 'bg-slate-900 text-white shadow-sm'
        : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img
            src="/logo.png"
            alt="Logo Paguyuban Pramudi DAMRI Cawang EV 50"
            className="w-24 h-24 rounded-full mb-4 shadow-lg ring-1 ring-white/10"
          />
          <h1 className="text-xl font-extrabold text-white tracking-wide">
            PAGUYUBAN EV50
          </h1>
          <p className="text-xs text-blue-300 font-medium mt-1">
            Panel Pengurus • DAMRI SBU Transbusway Cawang EV 50
          </p>
        </div>

        {/* Form */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white">Masuk Panel Pengurus</h2>
          </div>

          <div className="flex gap-1 p-1 bg-slate-900/80 rounded-xl mb-4">
            <button type="button" onClick={() => switchMode('password')} className={tabClass('password')}>
              Kata Sandi
            </button>
            <button type="button" onClick={() => switchMode('account')} className={tabClass('account')}>
              Akun Pengurus
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={submitPassword}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Kata Sandi Bersama
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="••••••••"
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
                disabled={busy || !password}
                className="mt-4 w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition active:scale-[0.98]"
              >
                {busy ? 'Membuka…' : 'Buka Panel'}
              </button>

              <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                Tindakan lewat kata sandi bersama dicatat atas nama kasir
                (Afrizal Firmansyah). Untuk nama Anda sendiri di riwayat, pakai
                tab Akun Pengurus.
              </p>
            </form>
          ) : (
            <form onSubmit={submitAccount}>
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
                Hanya akun berstatus pengurus yang bisa masuk. PIN bawaan adalah
                4 angka terakhir NIK.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-4">
          Sesi berakhir saat tab ditutup.
        </p>
      </div>
    </div>
  );
};
