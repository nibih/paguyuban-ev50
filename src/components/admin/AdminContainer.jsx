import React, { useState } from 'react';
import { 
  BarChart3, 
  Table2, 
  Receipt, 
  Wallet, 
  Bus, 
  ShieldCheck, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ScreenA1Dashboard } from './ScreenA1Dashboard';
import { ScreenA2MatriksIuran } from './ScreenA2MatriksIuran';
import { ScreenA3Pengeluaran } from './ScreenA3Pengeluaran';
import { ScreenA4BukuPiutang } from './ScreenA4BukuPiutang';
import { ScreenA5LogbookArmada } from './ScreenA5LogbookArmada';

export const AdminContainer = () => {
  const { adminTab, setAdminTab, currentUser, debts, incidents } = useApp();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const navItems = [
    { id: 'A1', label: 'Ringkasan Kas KPI', icon: BarChart3 },
    { id: 'A2', label: 'Matriks Iuran & Bank', icon: Table2 },
    { id: 'A3', label: 'Pengeluaran & Belanja', icon: Receipt },
    { id: 'A4', label: 'Buku Piutang Driver', icon: Wallet, badge: debts.length },
    { id: 'A5', label: 'Logbook Armada & Bodi', icon: Bus, badge: incidents.length },
  ];

  const renderActiveScreen = () => {
    switch (adminTab) {
      case 'A1':
        return <ScreenA1Dashboard onOpenExpenseModal={() => setIsExpenseModalOpen(true)} />;
      case 'A2':
        return <ScreenA2MatriksIuran />;
      case 'A3':
        return <ScreenA3Pengeluaran isModalOpen={isExpenseModalOpen} setIsModalOpen={setIsExpenseModalOpen} />;
      case 'A4':
        return <ScreenA4BukuPiutang />;
      case 'A5':
        return <ScreenA5LogbookArmada />;
      default:
        return <ScreenA1Dashboard onOpenExpenseModal={() => setIsExpenseModalOpen(true)} />;
    }
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
      
      {/* Sidebar Navigation */}
      <aside 
        className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 select-none ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Admin Identity Card */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0 shadow">
                AP
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <div className="font-bold text-white text-xs truncate">Afrizal Firmansyah</div>
                  <div className="text-[11px] text-teal-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-teal-400" /> Admin Kasir & Korlap
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = adminTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setAdminTab(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0B2F64] text-white shadow-md shadow-blue-950/40 border border-blue-600/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </div>

                  {!isSidebarCollapsed && item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Toggle & Bottom info */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="text-[10px] text-slate-500">
              Versi 2.4.0 • Transjakarta DAMRI
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition mx-auto"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {renderActiveScreen()}
        </div>
      </main>

    </div>
  );
};
