import React from 'react';
import { useApp } from './context/AppContext';
import { LoginGate } from './components/LoginGate';
import { TopNavbar } from './components/TopNavbar';
import { AdminContainer } from './components/admin/AdminContainer';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// The website is the admin panel. Full stop.
//
// It used to render a member view inside a phone-shaped frame — a preview of
// the app rather than a tool in its own right — and it read every number from
// a hardcoded local dataset, so it could not see what the drivers' phones
// actually recorded. Both are gone: there is one role, one layout, and one
// source of truth (Firestore).
//
// Drivers use the mobile app. This is for the pengurus at the depot desk.
function App() {
  const { toast, showToast, loading } = useApp();

  const toastStyle = {
    success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
    error: 'border-rose-500/40 bg-rose-950/90 text-rose-100',
    info: 'border-sky-500/40 bg-sky-950/90 text-sky-100'
  };

  const ToastIcon = toast?.type === 'error' ? AlertCircle : toast?.type === 'info' ? Info : CheckCircle2;

  return (
    <LoginGate>
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
        {/* Top Persistent Control Bar */}
        <TopNavbar />

        {/* Main View Area */}
        <div className="flex-1 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center gap-3 text-slate-500 text-sm">
              <span className="w-4 h-4 border-2 border-slate-300 border-t-teal-500 rounded-full animate-spin" />
              <span>Menyinkronkan data kas…</span>
            </div>
          ) : (
            <AdminContainer />
          )}
        </div>

        {/* Global Interactive Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce-subtle">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-md max-w-sm ${toastStyle[toast.type] || toastStyle.success}`}>
              <ToastIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                onClick={() => showToast('')}
                className="opacity-60 hover:opacity-100 transition"
                aria-label="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </LoginGate>
  );
}

export default App;
