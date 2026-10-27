import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { base64Src } from '../utils/image';

// Full-size view for a base64 thumbnail riding on a Firestore document.
//
// The picker alone only ever showed a 36–56px square, which is enough to see
// that *a* receipt exists and useless for reading the amount, date or
// destination account on it. This opens the stored image at whatever size the
// screen allows.
export const ImagePreview = ({ src, title = 'Bukti transfer', note, onClose }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!src) return null;
  const url = base64Src(src);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{title}</h3>
            {note && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{note}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              download={`${String(title).replace(/[^\w-]+/g, '_')}.jpg`}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              title="Unduh gambar"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900 flex items-center justify-center max-h-[75vh] overflow-auto">
          <img src={url} alt={title} className="max-w-full max-h-[75vh] object-contain" />
        </div>
      </div>
    </div>
  );
};
