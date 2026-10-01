import React from 'react';
import { useApp } from './context/AppContext';
import { TopNavbar } from './components/TopNavbar';
import { MemberContainer } from './components/member/MemberContainer';
import { AdminContainer } from './components/admin/AdminContainer';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

function App() {
  const { role, toast } = useApp();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Persistent Control Bar */}
      <TopNavbar />

      {/* Main View Area (Member or Admin) */}
      <div className="flex-1 flex flex-col">
        {role === 'member' ? (
          <MemberContainer />
        ) : (
          <AdminContainer />
        )}
      </div>

      {/* Global Interactive Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-subtle">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-md ${
            toast.type === 'info'
              ? 'bg-blue-900/90 text-white border-blue-500'
              : 'bg-emerald-900/90 text-emerald-100 border-emerald-500'
          }`}>
            {toast.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
