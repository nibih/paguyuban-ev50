import React, { useState, useMemo } from 'react';
import {
  Phone,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EMERGENCY_ROUTES } from '../../constants';
import { prettyPhone, telHref, waHref } from '../../utils/format';

// A7: the route dispatch list.
//
// This exists because the alternative was a hardcoded list in the APK, and a
// phone number is exactly the kind of field that changes: drivers move depots,
// swap SIM cards, and leave. Hardcoded, every one of those changes meant a new
// EAS build and a reinstall on every phone. Here the pengurus edits a row and
// it lands on every handset from the same Firestore snapshot as everything
// else.
//
// Two deliberate rules, both enforced in AppContext rather than here:
//
//   1. The number is stored normalised (62812…), so the dialer link and the
//      WhatsApp link can never disagree.
//   2. A number that is too short to dial is REFUSED on save. A contact may
//      be saved with NO number, and this screen badges it loudly — an obvious
//      gap is honest, while a number that looks right and fails on the first
//      ring is a trap.
export const ScreenA7KontakDarurat = () => {
  const { emergencyContacts, addContact, updateContact, deleteContact } = useApp();
  const [form, setForm] = useState(null); // null = closed; object = create/edit
  const [busy, setBusy] = useState(false);

  // Group by route key in dispatcher order. Unknown keys land in a trailing
  // bucket instead of disappearing, so a contact written against a newer
  // route list still shows up on an older build.
  const groups = useMemo(() => {
    const buckets = EMERGENCY_ROUTES.map((r) => ({ ...r, items: [] }));
    const byKey = new Map(buckets.map((g) => [g.key, g]));
    const orphans = { key: '__other', label: 'Rute lainnya', items: [] };

    emergencyContacts.forEach((c) => {
      (byKey.get(c.route) || orphans).items.push(c);
    });

    const out = buckets.filter((g) => g.items.length > 0);
    if (orphans.items.length > 0) out.push(orphans);
    return out;
  }, [emergencyContacts]);

  const incomplete = emergencyContacts.filter((c) => !c.phone).length;

  const openCreate = () => setForm({ id: null, name: '', phone: '', route: EMERGENCY_ROUTES[0].key });
  const openEdit = (c) => setForm({ id: c.id, name: c.name, phone: c.phone, route: c.route });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form || busy) return;
    setBusy(true);
    const ok = form.id
      ? await updateContact(form.id, { name: form.name, phone: form.phone, route: form.route })
      : await addContact({ name: form.name, phone: form.phone, route: form.route });
    setBusy(false);
    if (ok) setForm(null);
  };

  const remove = (c) => {
    if (!window.confirm(`Hapus ${c.name} dari daftar kontak darurat?`)) return;
    deleteContact(c.id);
  };

  return (
    <div className="space-y-6">

      {/* Header — sticky like the other screens, so Tambah Kontak stays put
          while scrolling a long dispatch list. */}
      <div className="sticky top-16 z-30 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-navy-800" />
            <h2 className="text-lg font-bold text-slate-900">Kontak Darurat</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar panggilan per rute untuk kondisi darurat di jalan. Tersimpan di server,
            jadi perubahan langsung sampai ke HP pramudi tanpa build ulang.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="px-3.5 py-2 bg-navy-800 hover:bg-navy-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition active:scale-95 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kontak</span>
        </button>
      </div>

      {/* Incomplete numbers are surfaced, not hidden. */}
      {incomplete > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            <span className="font-black">
              {incomplete} kontak belum punya nomor lengkap.
            </span>{' '}
            Nomor yang kurang digit sengaja tidak disimpan — lebih baik kosong dan
            terlihat, daripada terlihat benar tapi tidak bisa dihubungi.
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
          <Phone className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Belum ada kontak darurat</p>
          <p className="text-xs text-slate-500 mt-1">
            Tekan Tambah Kontak untuk mengisi daftar per rute.
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">
                {g.label}
              </span>
              <span className="text-[11px] text-slate-400 shrink-0">{g.items.length} kontak</span>
            </div>

            <div className="divide-y divide-slate-100">
              {g.items.map((c) => {
                const tel = telHref(c.phone);
                const wa = waHref(c.phone);
                return (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{c.name}</div>
                      {c.phone ? (
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {prettyPhone(c.phone)}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> Nomor belum lengkap
                        </span>
                      )}
                    </div>

                    {/* Links are rendered even when blank so the row keeps its
                        shape; a blank number simply cannot be followed. */}
                    <a
                      href={tel || undefined}
                      aria-disabled={!tel}
                      onClick={(e) => { if (!tel) e.preventDefault(); }}
                      title={tel ? `Telepon ${c.name}` : 'Nomor belum lengkap'}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                        tel
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href={wa || undefined}
                      aria-disabled={!wa}
                      onClick={(e) => { if (!wa) e.preventDefault(); }}
                      target="_blank"
                      rel="noreferrer"
                      title={wa ? `WhatsApp ${c.name}` : 'Nomor belum lengkap'}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                        wa
                          ? 'bg-[#25D366] hover:bg-[#1DA851] text-white'
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => openEdit(c)}
                      title={`Ubah ${c.name}`}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 flex items-center justify-center transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => remove(c)}
                      title={`Hapus ${c.name}`}
                      className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Create / edit */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">
                {form.id ? 'Ubah Kontak Darurat' : 'Tambah Kontak Darurat'}
              </h4>
              <button onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">Nama</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Contoh: Koko"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">Nomor HP</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Boleh dikosongkan kalau nomornya belum lengkap — akan ditandai merah
                  di daftar. Nomor yang kurang digit akan ditolak saat disimpan.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">Rute</label>
                <select
                  value={form.route}
                  onChange={set('route')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {EMERGENCY_ROUTES.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                  {/* A contact can be grouped under an unknown key; keep that
                      option visible so editing one cannot silently move it. */}
                  {!EMERGENCY_ROUTES.some((r) => r.key === form.route) && (
                    <option value={form.route}>Rute lainnya ({form.route})</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setForm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="flex-1 py-2.5 bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition"
              >
                {busy ? 'Menyimpan…' : form.id ? 'Simpan Perubahan' : 'Simpan Kontak'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
