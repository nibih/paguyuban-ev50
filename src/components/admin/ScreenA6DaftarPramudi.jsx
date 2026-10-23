import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Pencil,
  Check,
  X,
  ShieldCheck,
  ShieldOff,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { rp } from '../../utils/format';
import { MONTHS } from '../../constants';

const EMPTY_FORM = {
  nik: '',
  name: '',
  position: '',
  role: 'member',
  pin: ''
};

// A6: the roster.
//
// Members are never hard-deleted. A driver with a debt card or a settled
// iuran history is part of the paguyuban's financial record, and removing the
// roster entry would orphan that money. Deactivation is the only "delete"
// available here, and even that is blocked for the last active admin — a
// system nobody can get back into is not a system.
export const ScreenA6DaftarPramudi = () => {
  const {
    users, iuranRecords, debts, addMember, updateMember, setMemberActive, showToast
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [form, setForm] = useState(null);      // null = closed; object = create/edit
  const [editingNik, setEditingNik] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => users
    .map((u) => {
      const rec = iuranRecords[u.nik] || {};
      const paid = MONTHS.filter((m) => rec[m]?.status === 'lunas').length;
      const pending = MONTHS.filter((m) => rec[m]?.status === 'pending').length;
      const debt = debts.find((d) => d.nik === u.nik);
      const outstanding = debt ? debt.amount - debt.paid : 0;
      return { ...u, paid, pending, outstanding };
    })
    .filter((u) => {
      const q = search.trim().toLowerCase();
      if (q && !u.name.toLowerCase().includes(q) && !String(u.nik).includes(q)) return false;
      if (statusFilter === 'Aktif') return u.status !== 'inactive';
      if (statusFilter === 'Nonaktif') return u.status === 'inactive';
      if (statusFilter === 'Piutang') return u.outstanding > 0;
      if (statusFilter === 'Menunggu') return u.pending > 0;
      return true;
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'id')),
  [users, iuranRecords, debts, search, statusFilter]);

  const counts = useMemo(() => {
    const inactive = users.filter((u) => u.status === 'inactive').length;
    return {
      Semua: users.length,
      Aktif: users.length - inactive,
      Nonaktif: inactive,
      Piutang: rows.filter((r) => r.outstanding > 0).length,
      Menunggu: rows.filter((r) => r.pending > 0).length
    };
  }, [users, rows]);

  const FILTERS = ['Semua', 'Aktif', 'Piutang', 'Menunggu', 'Nonaktif'];

  const openCreate = () => { setEditingNik(null); setForm({ ...EMPTY_FORM }); };
  const openEdit = (u) => {
    setEditingNik(u.nik);
    setForm({
      nik: u.nik,
      name: u.name,
      position: u.position || '',
      role: u.role === 'admin' ? 'admin' : 'member',
      // An empty PIN means "leave it alone", never "clear it" — prefilling
      // the stored value would risk writing the default back over a custom PIN.
      pin: ''
    });
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const ok = editingNik
        ? await updateMember(editingNik, form)
        : await addMember(form);
      if (ok) setForm(null);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u) => {
    const active = u.status === 'inactive';
    if (!active && !window.confirm(`Nonaktifkan ${u.name}? Riwayat keuangannya tetap tersimpan.`)) return;
    await setMemberActive(u.nik, active);
  };

  // Bulk activate / deactivate over the roster.
  //
  // setMemberActive stays the only path, called once per driver, which means
  // its last-admin guard applies to every row: selecting both admins and
  // deactivating them succeeds on the first and refuses the second rather
  // than locking the pengurus out of their own panel. That one refusal is
  // reported, not swallowed.
  const [picked, setPicked] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const togglePick = (nik) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(nik)) next.delete(nik);
      else next.add(nik);
      return next;
    });

  const pickedRows = rows.filter((u) => picked.has(u.nik));
  const allPicked = rows.length > 0 && pickedRows.length === rows.length;
  const clearPicked = () => setPicked(new Set());

  const runBulkStatus = async (active) => {
    if (bulkBusy || pickedRows.length === 0) return;
    const items = pickedRows;

    const question = active
      ? `Aktifkan kembali ${items.length} pramudi?`
      : `Nonaktifkan ${items.length} pramudi?\n\nRiwayat keuangannya tetap tersimpan; kartu piutang tidak dihapus.`;
    if (!window.confirm(question)) return;

    setBulkBusy(true);
    let ok = 0;
    const failed = [];
    for (const u of items) {
      const good = await setMemberActive(u.nik, active);
      if (good) ok += 1;
      else failed.push(u.name);
    }
    setBulkBusy(false);

    // Partial results are reported as partial — a batch where the last admin
    // was refused is not a success, and the cashier needs to know who stuck.
    if (failed.length === 0) {
      showToast(`${ok} pramudi ${active ? 'diaktifkan kembali' : 'dinonaktifkan'}.`);
    } else {
      const shown = failed.slice(0, 3).join(', ');
      const more = failed.length > 3 ? `, +${failed.length - 3} lainnya` : '';
      showToast(`${ok} dari ${items.length} berhasil. Gagal: ${shown}${more}`, 'error');
    }
    clearPicked();
  };

  const pill = (u) => {
    if (u.status === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
          <ShieldOff className="w-3 h-3" /> Nonaktif
        </span>
      );
    }
    if (u.role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <ShieldCheck className="w-3 h-3" /> Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Aktif
      </span>
    );
  };

  return (
    <div className="space-y-6">

      {/* Header — sticky: with 128 pramudi below it, the Tambah Pramudi
          button would otherwise scroll off the top of the roster. */}
      <div className="sticky top-16 z-30 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-navy-800" />
            <h2 className="text-lg font-bold text-slate-900">Daftar Pramudi</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {users.length} pramudi terdaftar • Anggota tidak pernah dihapus, hanya dinonaktifkan
          </p>
        </div>

        <button
          onClick={openCreate}
          className="px-3.5 py-2 bg-navy-800 hover:bg-navy-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition active:scale-95 self-start"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pramudi</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIK pramudi..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === f
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {f} ({counts[f] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Roster table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Roster Anggota</span>
          <span className="text-[11px] text-slate-400">{rows.length} ditampilkan</span>
        </div>

        {/* Bulk status controls */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-3">
          <span className="text-[11px] text-slate-600 font-medium">
            <span className="font-black text-slate-900">{pickedRows.length}</span> dipilih
            {pickedRows.length > 0 ? ` dari ${rows.length}` : ''}
          </span>
          {pickedRows.length > 0 && (
            <button
              onClick={clearPicked}
              className="text-[11px] text-slate-500 underline hover:text-slate-700 transition"
            >
              Bersihkan
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => runBulkStatus(true)}
              disabled={bulkBusy || pickedRows.length === 0}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-500 transition disabled:opacity-40"
            >
              Aktifkan Terpilih
            </button>
            <button
              onClick={() => runBulkStatus(false)}
              disabled={bulkBusy || pickedRows.length === 0}
              className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 text-[11px] font-bold hover:bg-rose-50 transition disabled:opacity-40"
            >
              {bulkBusy ? 'Memproses…' : 'Nonaktifkan Terpilih'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 text-center w-10">
                  <input
                    type="checkbox"
                    checked={allPicked}
                    onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((u) => u.nik)) : new Set())}
                    className="w-4 h-4 accent-teal-600"
                    aria-label="Pilih semua pramudi yang ditampilkan"
                  />
                </th>
                <th className="py-3 px-4 text-center w-10">No</th>
                <th className="py-3 px-4">NIK</th>
                <th className="py-3 px-4">Nama Pramudi</th>
                <th className="py-3 px-4 text-center">Iuran</th>
                <th className="py-3 px-4 text-right">Piutang</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((u, idx) => (
                <tr key={u.nik} className={picked.has(u.nik) ? 'bg-teal-50/70 transition' : 'hover:bg-slate-50/80 transition'}>
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={picked.has(u.nik)}
                      onChange={() => togglePick(u.nik)}
                      disabled={bulkBusy}
                      className="w-4 h-4 accent-teal-600"
                      aria-label={`Pilih ${u.name}`}
                    />
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{u.nik}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.position}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-mono text-[11px] font-bold ${u.paid === MONTHS.length ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {u.paid}/{MONTHS.length}
                    </span>
                    {u.pending > 0 && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        +{u.pending} antre
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[11px]">
                    {u.outstanding > 0 ? (
                      <span className="font-bold text-rose-600">{rp(u.outstanding)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">{pill(u)}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(u)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition mr-1.5"
                    >
                      <Pencil className="w-3 h-3" /> Ubah
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        u.status === 'inactive'
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      }`}
                      title={u.status === 'inactive' ? 'Aktifkan kembali' : 'Nonaktifkan — riwayat tetap tersimpan'}
                    >
                      {u.status === 'inactive' ? 'Aktifkan' : 'Nonaktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="px-5 py-8 text-center text-xs text-slate-400">
            Tidak ada pramudi yang cocok dengan filter ini.
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm animate-fadeIn p-4"
          onClick={() => setForm(null)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-[10px] font-mono text-slate-400">
                  {editingNik ? 'UBAH DATA PRAMUDI' : 'PRAMUDI BARU'}
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingNik ? form.name || editingNik : 'Tambah ke Daftar'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">NIK (6–16 digit angka)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.nik}
                  onChange={set('nik')}
                  disabled={!!editingNik}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
                  placeholder="17001234"
                  required
                />
                {editingNik && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    NIK tidak bisa diubah — kartu piutang dan riwayat iuran tertaut ke angka ini.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Nama pramudi"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Jalur / Posisi</label>
                <input
                  type="text"
                  value={form.position}
                  onChange={set('position')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Pramudi EV 50 Cawang"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Peran</label>
                  <select
                    value={form.role}
                    onChange={set('role')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none bg-white"
                  >
                    <option value="member">Pramudi</option>
                    <option value="admin">Pengurus / Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">PIN (opsional)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.pin}
                    onChange={set('pin')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="••••"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                {editingNik
                  ? 'Kosongkan PIN untuk mempertahankan PIN yang sudah ada. PIN baru harus tepat 4 angka.'
                  : 'Kosongkan PIN agar otomatis memakai 4 digit terakhir NIK.'}
              </p>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                {editingNik ? 'Simpan Perubahan' : 'Tambah Pramudi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!form && users.length > 0 && rows.length === 0 && (
        <p className="text-[11px] text-slate-400 text-center">
          Data sumber: koleksi <span className="font-mono">users</span> di Firestore.
        </p>
      )}
    </div>
  );
};
