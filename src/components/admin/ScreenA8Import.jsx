import React, { useMemo, useState } from 'react';
import {
  Users,
  Wrench,
  Upload,
  ClipboardPaste,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { rp } from '../../utils/format';
import {
  readWorkbook,
  parseRosterSheet,
  parseRosterText,
  parseRepairCards
} from '../../utils/importers';

// Batch intake. Two things arrive in groups: drivers (a new depot roster) and
// the paper "kartu perbaikan" the workshop keeps. Both are parsed in the
// browser, previewed row by row, and only written after the operator confirms.
//
// Money ledgers (LP) are deliberately NOT importable here yet. The vault model
// is still unresolved — the app credits iuran to BSI while the LP treats one
// cash pot — and importing rupiah into a book whose shape is still being
// decided would bake in the wrong answer. Roster and repair cards carry no
// money movement, so they are safe to land now.

const Card = ({ icon: Icon, title, subtitle, children, tone = 'teal' }) => (
  <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 flex items-start gap-3">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-700'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </section>
);

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200'
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tones[tone]}`}>
      {children}
    </span>
  );
};

const FileButton = ({ onPick, accept, busy, label, icon: Icon = Upload }) => (
  <label
    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
      busy
        ? 'bg-slate-100 text-slate-400 cursor-wait'
        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm active:scale-95'
    }`}
  >
    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
    {busy ? 'Membaca…' : label}
    <input type="file" accept={accept} className="hidden" disabled={busy} onChange={onPick} />
  </label>
);

export const ScreenA8Import = () => {
  const { users, incidents, addMembersBulk, addIncidentsBulk, showToast } = useApp();

  // --- roster -------------------------------------------------------------
  const [pasteText, setPasteText] = useState('');
  const [rosterRows, setRosterRows] = useState([]);
  const [rosterSource, setRosterSource] = useState('');
  const [rosterBusy, setRosterBusy] = useState(false);
  const [rosterResult, setRosterResult] = useState(null);

  // --- repair cards -------------------------------------------------------
  const [cards, setCards] = useState(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardResult, setCardResult] = useState(null);

  const takenNik = useMemo(() => new Set(users.map((u) => String(u.nik))), [users]);
  const takenIncident = useMemo(() => new Set(incidents.map((i) => i.id)), [incidents]);

  const rosterPreview = useMemo(() => {
    const seen = new Set();
    return rosterRows.map((r) => {
      const problems = [];
      if (!/^\d{6,16}$/.test(r.nik)) problems.push('NIK 6–16 angka');
      if (!r.name || r.name.trim().length < 2) problems.push('nama kosong');
      if (takenNik.has(r.nik)) problems.push('sudah terdaftar');
      else if (seen.has(r.nik)) problems.push('ganda di daftar ini');
      if (/^\d{6,16}$/.test(r.nik)) seen.add(r.nik);
      return { ...r, problems };
    });
  }, [rosterRows, takenNik]);

  const rosterValid = rosterPreview.filter((r) => r.problems.length === 0);
  const rosterBad = rosterPreview.length - rosterValid.length;

  const onRosterFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setRosterBusy(true);
    setRosterResult(null);
    try {
      const sheets = await readWorkbook(file);
      let best = null;
      for (const sheet of sheets) {
        const parsed = parseRosterSheet(sheet.rows);
        if (!best || parsed.rows.length > best.rows.length) best = parsed;
      }
      setRosterRows(best?.rows || []);
      setRosterSource(
        best
          ? `${file.name} · ${best.rows.length} baris${best.header ? '' : ' · tanpa baris header, kolom 1–3 dipakai'}`
          : file.name
      );
      if (!best?.rows.length) showToast('Tidak ada baris pramudi yang terbaca di file ini.', 'error');
    } catch (err) {
      showToast(err.message || 'File tidak bisa dibaca.', 'error');
    }
    setRosterBusy(false);
  };

  const loadPaste = () => {
    const rows = parseRosterText(pasteText);
    setRosterRows(rows);
    setRosterSource(`Teks tempelan · ${rows.length} baris`);
    setRosterResult(null);
    if (!rows.length) showToast('Belum ada baris untuk dibaca.', 'error');
  };

  const runRoster = async () => {
    if (!rosterValid.length) return;
    setRosterBusy(true);
    const res = await addMembersBulk(rosterValid);
    setRosterResult(res);
    // Keep only what did not land, so a second click cannot re-add anyone.
    const failedNik = new Set(res.failed.map((f) => f.nik));
    setRosterRows(rosterRows.filter((r) => failedNik.has(r.nik)));
    setRosterBusy(false);
  };

  const onCardFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCardBusy(true);
    setCardResult(null);
    try {
      const sheets = await readWorkbook(file);
      const parsed = parseRepairCards(sheets, users);
      const fresh = parsed.docs.filter((d) => !takenIncident.has(d.id));
      setCards({
        ...parsed,
        fresh,
        already: parsed.docs.length - fresh.length,
        fileName: file.name
      });
      if (!parsed.docs.length) {
        showToast('Tidak ada kartu perbaikan yang terbaca. Pastikan formatnya kartu pengawasan.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'File tidak bisa dibaca.', 'error');
    }
    setCardBusy(false);
  };

  const runCards = async () => {
    if (!cards?.fresh?.length) return;
    setCardBusy(true);
    const res = await addIncidentsBulk(cards.fresh);
    setCardResult(res);
    setCards(null);
    setCardBusy(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Impor Data</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Pramudi baru dan kartu perbaikan datang sekaligus. Keduanya diperiksa dulu,
          tidak ada yang langsung masuk sebelum dikonfirmasi.
        </p>
      </div>

      {/* ---------------------------- roster ---------------------------- */}
      <Card
        icon={Users}
        title="Impor Pramudi (massal)"
        subtitle="Tempel daftar atau unggah .xlsx/.csv dengan kolom NIK, Nama, Jabatan. NIK yang sudah ada dilewati, bukan ditimpa."
      >
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Tempel dari WhatsApp / spreadsheet
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder={'17002197, NICHOLAS, Pramudi EV 50 Cawang\n17001589, AFRIZAL, Pengurus'}
            className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 resize-y"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={loadPaste}
              disabled={!pasteText.trim()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold transition"
            >
              <ClipboardPaste className="w-4 h-4" />
              Baca Tempelan
            </button>
            <FileButton
              onPick={onRosterFile}
              accept=".xlsx,.xls,.csv"
              busy={rosterBusy}
              label="Unggah File"
              icon={FileSpreadsheet}
            />
            {rosterSource && <span className="text-[10px] text-slate-400">{rosterSource}</span>}
          </div>
        </div>

        {rosterPreview.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700">{rosterPreview.length} baris terbaca</span>
              <div className="flex items-center gap-2">
                <Badge tone="emerald">{rosterValid.length} siap</Badge>
                {rosterBad > 0 && <Badge tone="rose">{rosterBad} bermasalah</Badge>}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-white sticky top-0">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="px-3 py-2 font-bold">NIK</th>
                    <th className="px-3 py-2 font-bold">Nama</th>
                    <th className="px-3 py-2 font-bold">Jabatan</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterPreview.map((r, i) => (
                    <tr key={`${r.nik}-${i}`} className="border-b border-slate-50 last:border-0">
                      <td className="px-3 py-1.5 font-mono text-slate-700">{r.nik || '—'}</td>
                      <td className="px-3 py-1.5 text-slate-900 font-medium">{r.name || '—'}</td>
                      <td className="px-3 py-1.5 text-slate-500">{r.position || 'default'}</td>
                      <td className="px-3 py-1.5">
                        {r.problems.length === 0 ? (
                          <Badge tone="emerald">
                            <CheckCircle2 className="w-3 h-3" /> siap
                          </Badge>
                        ) : (
                          <span className="text-rose-600 font-medium">{r.problems.join(' · ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <p className="text-[10px] text-slate-500">
                Semua masuk sebagai <span className="font-bold">Pramudi</span> — peran pengurus
                diberikan satu per satu di Daftar Pramudi.
              </p>
              <button
                onClick={runRoster}
                disabled={rosterBusy || rosterValid.length === 0}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                {rosterBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Simpan {rosterValid.length} Pramudi
              </button>
            </div>
          </div>
        )}

        {rosterResult && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-[11px] ${
              rosterResult.failed.length
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              {rosterResult.failed.length ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {rosterResult.created.length} pramudi ditambahkan
              {rosterResult.failed.length ? `, ${rosterResult.failed.length} dilewati` : ''}.
            </div>
            {rosterResult.failed.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {rosterResult.failed.map((f, i) => (
                  <li key={`${f.nik}-${i}`} className="font-mono">
                    {f.nik || '(tanpa NIK)'} · {f.name || '—'} · {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {/* -------------------------- repair cards -------------------------- */}
      <Card
        icon={Wrench}
        tone="amber"
        title="Impor Kartu Perbaikan"
        subtitle="Unggah DATA PERBAIKAN ANGGOTA.xlsx. Setiap baris menjadi satu laporan bodi berstatus Selesai, ditandai sebagai arsip kartu."
      >
        <div className="flex flex-wrap items-center gap-2">
          <FileButton
            onPick={onCardFile}
            accept=".xlsx,.xls"
            busy={cardBusy}
            label="Pilih File Kartu"
            icon={FileSpreadsheet}
          />
          <span className="text-[10px] text-slate-400">
            Format: satu sheet per anggota, header TANGGAL · URAIAN, NIK/NAMA di atas.
          </span>
        </div>

        {cards && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Baris</div>
                <div className="text-sm font-black text-slate-900">{cards.stats.rows}</div>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Siap dibuat</div>
                <div className="text-sm font-black text-emerald-700">{cards.fresh.length}</div>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Anggota</div>
                <div className="text-sm font-black text-slate-900">{cards.stats.members}</div>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Harga part</div>
                <div className="text-sm font-black text-slate-900">{rp(cards.stats.partPrice)}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <Badge tone="slate">{cards.fileName}</Badge>
              {cards.already > 0 && <Badge tone="amber">{cards.already} sudah ada</Badge>}
              {cards.unresolved.length > 0 && (
                <Badge tone="rose">{cards.unresolved.length} kartu belum cocok</Badge>
              )}
              {cards.skipped.length > 0 && (
                <Badge tone="rose">{cards.skipped.length} baris dilewati</Badge>
              )}
            </div>

            {cards.unresolved.length > 0 && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-[11px] text-rose-800">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Kartu tanpa anggota — tidak akan diimpor
                </div>
                <ul className="space-y-0.5 font-mono">
                  {cards.unresolved.map((u, i) => (
                    <li key={`${u.sheet}-${i}`}>
                      {u.nik || '(tanpa NIK)'} · {u.name || u.sheet} · {u.rows} baris
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 font-sans text-rose-700">
                  Tambahkan pramudi ini dulu lewat panel di atas, lalu impor ulang.
                </p>
              </div>
            )}

            {cards.skipped.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11px] text-amber-800">
                <div className="font-bold mb-1">Baris dilewati (tanggal tidak terbaca)</div>
                <ul className="space-y-0.5 font-mono">
                  {cards.skipped.map((s, i) => (
                    <li key={`${s.sheet}-${s.row}-${i}`}>
                      {s.sheet} #{s.row} · {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={() => setCards(null)}
                className="text-[11px] text-slate-500 underline hover:text-slate-700"
              >
                Batal
              </button>
              <button
                onClick={runCards}
                disabled={cardBusy || cards.fresh.length === 0}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                {cardBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Impor {cards.fresh.length} Kartu
              </button>
            </div>
          </div>
        )}

        {cardResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {cardResult.created} kartu ditambahkan ke Logbook Armada
            {cardResult.skipped ? ` · ${cardResult.skipped} sudah ada` : ''}.
          </div>
        )}
      </Card>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Impor buku kas (LP) belum tersedia: model kas BSI vs kas kecil masih diputuskan,
        dan memasukkan rupiah ke buku yang bentuknya belum final akan mengunci jawaban
        yang salah. Iuran dan pengeluaran tetap diisi lewat layar masing-masing.
      </p>
    </div>
  );
};
