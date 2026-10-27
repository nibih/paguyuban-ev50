import React, { useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { fileToBase64, base64Src } from '../utils/image';

// One image slot: a dashed picker when empty, a thumbnail with a remove button
// when filled. Kept as a component so the incident photos, the iuran proof and
// the installment proof all share one compression and error path.
export const ImageUpload = ({
  value,
  onChange,
  onView,
  disabled = false,
  title = 'Lampirkan foto',
  className = 'w-10 h-10'
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setError('');
    try {
      const base64 = await fileToBase64(file);
      await onChange(base64);
    } catch (err) {
      setError(err.message || 'Gagal memproses gambar.');
    }
    setBusy(false);
  };

  if (value) {
    const thumb = (
      <img
        src={base64Src(value)}
        alt={title}
        className={`${className} object-cover rounded-lg border border-slate-200`}
      />
    );

    return (
      <div className="relative shrink-0" title={title}>
        {onView ? (
          <button
            type="button"
            onClick={onView}
            className="block rounded-lg hover:ring-2 hover:ring-teal-400 transition"
            title={`${title} — klik untuk memperbesar`}
          >
            {thumb}
          </button>
        ) : (
          thumb
        )}
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled || busy}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow disabled:opacity-40"
          title="Hapus foto"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  return (
    <label
      className={`${className} shrink-0 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 transition cursor-pointer ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-teal-400 hover:text-teal-600'
      }`}
      title={error || title}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || busy}
        onChange={pick}
      />
    </label>
  );
};
