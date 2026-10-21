import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Catches render-time crashes so one broken screen does not leave the pengurus
// staring at a blank white page with no route back to the rest of the panel.
//
// It deliberately reads no context. AppProvider owns the Firestore listeners
// and is the thing most likely to throw, and a boundary that pulled from it
// would go down with it — so this is mounted above the provider in main.jsx.
export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // console.error, not warn: a real crash should survive minification and
    // stay visible in the deployed build's console.
    console.error('Admin panel crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans selection:bg-teal-500 selection:text-white">
        <div className="w-full max-w-md bg-white rounded-2xl border border-rose-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="text-[11px] font-black uppercase tracking-widest text-rose-700">
              Layar rusak
            </span>
          </div>

          <h1 className="text-lg font-bold text-slate-900">Bagian ini gagal dimuat.</h1>

          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            Uang kas dan catatannya tidak hilang — hanya tampilannya yang gagal
            dirender. Muat ulang halaman untuk kembali ke layar utama. Bila ini
            terus terjadi, kirimkan pesan error di bawah ini ke pengurus.
          </p>

          {error?.message && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-mono text-slate-600 whitespace-pre-wrap break-words">
              {String(error.message)}
            </pre>
          )}

          <button
            onClick={() => window.location.reload()}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-white text-xs font-black uppercase tracking-widest px-4 py-3 transition shadow"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
