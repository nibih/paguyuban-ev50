import React, { useState } from 'react';
import { 
  CreditCard, 
  QrCode, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Copy, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  Upload,
  X,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MidtransModal = ({ isOpen, onClose, selectedMonths, onPaymentSuccess }) => {
  const { currentUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('snap'); // 'snap' or 'manual'
  const [paymentType, setPaymentType] = useState('qris'); // 'qris', 'bca_va', 'mandiri'
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualProof, setManualProof] = useState(null);
  const [countdown, setCountdown] = useState(895); // seconds ~ 14:55

  if (!isOpen) return null;

  const totalAmount = selectedMonths.length * 100000;

  const handleSimulateWebhook = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentSuccess(selectedMonths, 'Midtrans ' + (paymentType === 'qris' ? 'QRIS' : paymentType.toUpperCase()));
      onClose();
    }, 1200);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      showToast(`Bukti transfer a.n ${currentUser.name} terkirim. Menunggu verifikasi Bendahara Kas!`, 'info');
      onClose();
    }, 1000);
  };

  const formatCountdown = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-[#0B2F64] text-white p-5 flex items-center justify-between relative">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-teal-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Transaksi Kas Paguyuban
              </div>
              <h3 className="text-lg font-bold">Pembayaran Iuran Pramudi</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Pill */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Bulan Dipilih:</span>
            <div className="font-semibold text-slate-800 text-sm">{selectedMonths.join(', ')}</div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium">Total Nominal:</span>
            <div className="text-xl font-extrabold text-[#0B2F64]">Rp{totalAmount.toLocaleString('id-ID')}</div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('snap')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'snap' 
                ? 'bg-white text-[#0B2F64] shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-teal-600" />
            Online Instan (Midtrans Snap)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'manual' 
                ? 'bg-white text-[#0B2F64] shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            Transfer Manual BSI
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {activeTab === 'snap' ? (
            <div className="space-y-4">
              {/* Payment Methods */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'qris', label: 'QRIS', sub: 'GoPay, OVO, Dana' },
                  { id: 'bca_va', label: 'BCA VA', sub: 'Virtual Account' },
                  { id: 'mandiri', label: 'Mandiri', sub: 'Livin by Mandiri' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentType(m.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      paymentType === m.id 
                        ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-800">{m.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight">{m.sub}</div>
                  </button>
                ))}
              </div>

              {/* QR / Virtual Account Simulation Box */}
              {paymentType === 'qris' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-3 border border-amber-200">
                    <Clock className="w-3 h-3" /> Berakhir dalam: {formatCountdown(countdown)}
                  </div>
                  
                  {/* Generated QR Mockup */}
                  <div className="w-44 h-44 bg-white p-3 rounded-xl border-2 border-slate-800 shadow-sm flex flex-col items-center justify-center relative group">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                      <rect width="100" height="100" fill="white"/>
                      {/* Corner 1 */}
                      <rect x="5" y="5" width="26" height="26" fill="black"/>
                      <rect x="8" y="8" width="20" height="20" fill="white"/>
                      <rect x="12" y="12" width="12" height="12" fill="black"/>
                      {/* Corner 2 */}
                      <rect x="69" y="5" width="26" height="26" fill="black"/>
                      <rect x="72" y="8" width="20" height="20" fill="white"/>
                      <rect x="76" y="12" width="12" height="12" fill="black"/>
                      {/* Corner 3 */}
                      <rect x="5" y="69" width="26" height="26" fill="black"/>
                      <rect x="8" y="72" width="20" height="20" fill="white"/>
                      <rect x="12" y="76" width="12" height="12" fill="black"/>
                      {/* Pattern dots */}
                      <rect x="36" y="8" width="8" height="8" fill="black"/>
                      <rect x="48" y="15" width="8" height="8" fill="black"/>
                      <rect x="36" y="25" width="12" height="6" fill="black"/>
                      <rect x="10" y="38" width="15" height="8" fill="black"/>
                      <rect x="30" y="40" width="40" height="18" fill="black"/>
                      <rect x="75" y="42" width="15" height="15" fill="black"/>
                      <rect x="36" y="65" width="10" height="15" fill="black"/>
                      <rect x="52" y="68" width="18" height="8" fill="black"/>
                      <rect x="75" y="72" width="18" height="18" fill="black"/>
                      <rect x="50" y="82" width="16" height="10" fill="black"/>
                      <rect x="36" y="85" width="8" height="8" fill="black"/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-[#0B2F64] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                        EV50
                      </div>
                    </div>
                  </div>
                  
                  <span className="text-[11px] text-slate-500 mt-2 font-medium">
                    NMID: ID10202619082390 • Paguyuban EV50 Cawang
                  </span>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">Nomor Rekening Virtual Account:</div>
                  <div className="text-2xl font-mono font-bold tracking-wider text-slate-900 mb-2">
                    8921 0812 9901 1137
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard?.writeText('8921081299011137');
                      showToast('Nomor VA berhasil disalin!');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-teal-600 font-semibold hover:text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200"
                  >
                    <Copy className="w-3 h-3" /> Salin Nomor VA
                  </button>
                </div>
              )}

              {/* Webhook tester button */}
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-teal-900">
                    <span className="font-bold flex items-center gap-1 text-teal-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Mode Simulasi Midtrans:
                    </span>
                    Klik untuk mentrigger webhook sukses instan.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateWebhook}
                  disabled={isProcessing}
                  className="w-full mt-2.5 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memproses Webhook Midtrans...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simulasikan Sukses Bayar (Webhook Midtrans)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-xs text-blue-800 font-semibold mb-1">Rekening Kas Resmi Paguyuban:</div>
                <div className="text-sm font-bold text-slate-900">Bank Syariah Indonesia (BSI)</div>
                <div className="text-lg font-mono font-bold text-[#0B2F64] tracking-wide my-1">
                  720510945
                </div>
                <div className="text-xs text-slate-600 mb-2 font-medium">a.n PAGUYUBAN EV 50 CAWANG</div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText('720510945');
                    showToast('No. Rekening BSI berhasil disalin!');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-white px-3 py-1 rounded-lg border border-blue-300 font-medium hover:bg-blue-50"
                >
                  <Copy className="w-3 h-3" /> Salin Rekening
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Bukti Transfer Bank / Slip ATM
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-400 bg-slate-50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setManualProof(e.target.files[0]?.name || 'bukti_transfer.jpg')}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                  />
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs text-slate-600 font-medium">
                    {manualProof ? manualProof : "Klik atau seret foto bukti transfer di sini"}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau PDF max 5MB</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2.5 px-4 bg-[#0B2F64] hover:bg-[#123e7e] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {isProcessing ? 'Mengirim Konfirmasi...' : 'Kirim Bukti Konfirmasi ke Admin'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
