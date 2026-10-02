import React from 'react';
import { 
  Home, 
  CreditCard, 
  Wallet, 
  Wrench, 
  TrendingUp, 
  Maximize2, 
  Minimize2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ScreenM1Dashboard } from './ScreenM1Dashboard';
import { ScreenM2Iuran } from './ScreenM2Iuran';
import { ScreenM3Talangan } from './ScreenM3Talangan';
import { ScreenM4LaporBodi } from './ScreenM4LaporBodi';
import { ScreenM5KasTerbuka } from './ScreenM5KasTerbuka';

export const MemberContainer = () => {
  const { 
    memberTab, 
    setMemberTab, 
    isMobileFrame, 
    setIsMobileFrame, 
    currentUser,
    debts
  } = useApp();

  const userDebt = debts.find(d => d.nik === currentUser.nik);
  const hasDebt = userDebt && (userDebt.amount - userDebt.paid) > 0;

  const renderActiveScreen = () => {
    switch (memberTab) {
      case 'M1':
        return <ScreenM1Dashboard />;
      case 'M2':
        return <ScreenM2Iuran />;
      case 'M3':
        return <ScreenM3Talangan />;
      case 'M4':
        return <ScreenM4LaporBodi />;
      case 'M5':
        return <ScreenM5KasTerbuka />;
      default:
        return <ScreenM1Dashboard />;
    }
  };

  const navItems = [
    { id: 'M1', label: 'Beranda', icon: Home },
    { id: 'M2', label: 'Iuran', icon: CreditCard },
    { id: 'M3', label: 'Talangan', icon: Wallet, badge: hasDebt },
    { id: 'M4', label: 'Lapor Perbaikan', icon: Wrench },
    { id: 'M5', label: 'Kas Terbuka', icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-64px)] p-2 md:p-6 bg-slate-900/95">
      
      {/* Frame Toggle Header in Mobile View */}
      <div className="w-full max-w-[430px] flex items-center justify-between mb-3 px-2 text-slate-300">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-teal-400"></span>
          <span>Pramudi App Frame</span>
          <span className="text-[10px] bg-slate-800 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
            iPhone 14 / 390px
          </span>
        </div>
        <button
          onClick={() => setIsMobileFrame(!isMobileFrame)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition"
          title="Toggle Fullscreen Width"
        >
          {isMobileFrame ? (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Phone Frame</span>
            </>
          )}
        </button>
      </div>

      {/* Main Container / Mobile Device Frame */}
      <div 
        className={`w-full transition-all duration-300 relative bg-[#F8FAFC] flex flex-col ${
          isMobileFrame 
            ? 'max-w-[410px] h-[844px] rounded-[44px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-[10px] border-slate-800 ring-1 ring-slate-700 overflow-hidden' 
            : 'max-w-4xl min-h-[800px] rounded-3xl shadow-xl border border-slate-700 overflow-hidden'
        }`}
      >
        {/* Device Notch & Status Bar (in mobile frame) */}
        {isMobileFrame && (
          <div className="w-full bg-[#0B2F64] pt-3 px-6 pb-2 flex items-center justify-between text-white text-[11px] font-semibold shrink-0 select-none">
            <span>09:41</span>
            {/* Dynamic Island / Notch */}
            <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto" />
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2.5 border border-white rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-emerald-400 rounded-2xs" />
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 relative scrollbar-thin">
          {renderActiveScreen()}
        </div>

        {/* Bottom Tab Navigation Bar */}
        <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around shrink-0 relative z-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = memberTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setMemberTab(item.id)}
                className={`flex-1 flex flex-col items-center py-1 relative transition-colors ${
                  isActive ? 'text-[#0B2F64]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : ''}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 ${isActive ? 'font-extrabold text-[#0B2F64]' : 'font-medium'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-4 h-1 bg-[#00A896] rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
