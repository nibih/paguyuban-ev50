// Parses the official reference documents in /reference into seedData.json.
//
// Sources:
//   laporan teknik 1.xlsx                    -> 126-driver roster (NIK + name)
//   DATA HUTANG ANGGOTA.xlsx                 -> 13 debt cards, incl. ledger rows
//   Laporan Uang Masuk per agustus rev.pdf   -> real per-month iuran payments
//   05. Laporan Pengeluaran Bulann Sept.pdf  -> 15 September expenses (manual, below)
//
// IMPORTANT: this parser must never invent an identifier. An earlier revision
// generated a random NIK when name-matching failed, which silently attached
// real debt balances to the wrong drivers (or to nobody). Any person we cannot
// resolve is emitted with nik: null and flagged for manual review instead.

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const refDir = path.join(__dirname, '../../../reference');

/* ------------------------------------------------------------------ *
 * Text helpers for fuzzy name matching
 * ------------------------------------------------------------------ */
const norm = (s) => String(s || '')
  .toLowerCase()
  .replace(/[^a-z ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokens = (s) => norm(s).split(' ').filter((t) => t.length > 1);

// Normalised Levenshtein distance, 0..1
function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return d[m][n];
}

// Worst-case per-token similarity between two names, 0 = identical.
function nameDistance(a, b) {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length || !tb.length) return 1;
  let worst = 0;
  for (const t of ta) {
    let best = 1;
    for (const v of tb) best = Math.min(best, lev(t, v) / Math.max(t.length, v.length));
    worst = Math.max(worst, best);
  }
  return worst;
}

// Confidence threshold. 0.34 accepts "BAYU DYAN SUKMNA" -> "Bayu Dyan Sukmana"
// (0.14) but rejects "AGUS TRIONO" against unrelated "Agus Hariyanto" (0.56).
const FUZZY_THRESHOLD = 0.34;

/**
 * Resolve a debt-card name to a roster member.
 * Returns { nik, name, confidence } or null. Never guesses.
 */
function matchMember(users, name) {
  const n = norm(name);
  if (!n) return null;

  // 1. exact
  let hit = users.find((u) => norm(u.name) === n);
  if (hit) return { ...hit, confidence: 'exact' };

  // 2. one contains the other
  hit = users.find((u) => {
    const un = norm(u.name);
    return un.includes(n) || n.includes(un);
  });
  if (hit) return { ...hit, confidence: 'substring' };

  // 3. all search tokens present
  const nt = tokens(name);
  hit = users.find((u) => {
    const ut = tokens(u.name);
    return nt.length > 0 && nt.every((t) => ut.includes(t));
  });
  if (hit) return { ...hit, confidence: 'tokens' };

  // 4. fuzzy, only above threshold
  let best = null, bestScore = Infinity;
  for (const u of users) {
    const score = nameDistance(name, u.name);
    if (score < bestScore) { bestScore = score; best = u; }
  }
  if (best && bestScore <= FUZZY_THRESHOLD) {
    return { ...best, confidence: `fuzzy(${bestScore.toFixed(2)})` };
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * 1. Driver roster
 * ------------------------------------------------------------------ */
const wbTeknik = xlsx.readFile(path.join(refDir, 'laporan teknik 1.xlsx'));
const pramudiRows = xlsx.utils.sheet_to_json(wbTeknik.Sheets['DAFTAR NAMA PRAMUDI'], { header: 1 });
const users = [];

pramudiRows.slice(2).forEach((row) => {
  if (row[1] && row[2]) {
    const nik = String(row[1]).trim();
    const name = String(row[2]).trim();
    const isAdmin = nik === '17001589' || nik === '17000699';
    users.push({
      nik,
      name,
      role: isAdmin ? 'admin' : 'member',
      position: nik === '17001589'
        ? 'Ketua/Admin Kas'
        : (nik === '17000699' ? 'Bendahara Kas Kecil' : 'Pramudi EV 50 Cawang'),
      status: 'active'
    });
  }
});

/* ------------------------------------------------------------------ *
 * 2. Debt cards — read the NIK field AND the repayment ledger
 * ------------------------------------------------------------------ */
const wbHutang = xlsx.readFile(path.join(refDir, 'DATA HUTANG ANGGOTA.xlsx'));
const debts = [];
const unmatched = [];

wbHutang.SheetNames.forEach((sheetName) => {
  if (sheetName.startsWith('Sheet')) return;
  const rows = xlsx.utils.sheet_to_json(wbHutang.Sheets[sheetName], { header: 1 });

  let name = sheetName.trim();
  let explicitNik = null;
  let incident = '';
  let tenor = '1 Bulan';
  let borrowed = 0;
  let paid = 0;

  rows.forEach((r) => {
    if (r[0] && String(r[0]).includes('NAMA') && r[2]) name = String(r[2]).trim();
    // The NIK line is blank on most cards but populated on some — read it.
    if (r[0] && String(r[0]).includes('NIK') && r[2]) {
      const v = String(r[2]).trim();
      if (/^\d{6,}$/.test(v)) explicitNik = v;
    }
    if (r[0] && String(r[0]).includes('JUMLAH')) {
      if (r[3]) tenor = String(r[3]).trim();
    }
    // Ledger row: [no, tanggal, uraiann, _, Hutang, SETORAN, SISA]
    if (typeof r[4] === 'number') borrowed += r[4];
    if (typeof r[5] === 'number') paid += r[5];
    // The incident is the first substantive URAIAN entry on a *ledger* row
    // (col 0 is the row number). Header rows carry the member name in col 2,
    // and later ledger rows are installment notes like "Angsuran Pertama".
    const isLedgerRow = typeof r[0] === 'number';
    if (isLedgerRow && !incident && r[2] && typeof r[2] === 'string' && r[2].trim().length > 5) {
      incident = r[2].trim();
    }
  });

  if (borrowed === 0 && !incident) return; // blank template sheet

  // NIK resolution: explicit field wins, then name match. Never invent.
  let nik = null;
  let matchConfidence = null;

  if (explicitNik && users.some((u) => u.nik === explicitNik)) {
    nik = explicitNik;
    matchConfidence = 'explicit-field';
  } else if (explicitNik) {
    // Real NIK from the card, but the driver is absent from the roster.
    nik = explicitNik;
    matchConfidence = 'explicit-field(not-in-roster)';
  } else {
    const m = matchMember(users, name);
    if (m) { nik = m.nik; matchConfidence = m.confidence; }
  }

  if (!nik) unmatched.push({ sheet: sheetName.trim(), name });

  const outstanding = Math.max(0, borrowed - paid);
  const id = `DEBT-${sheetName.replace(/\s+/g, '_')}`;

  debts.push({
    id,
    nik,
    name,
    incident: incident || 'Talangan Insiden Operasional Jalur',
    startDate: '2026-09-01',
    tenor: tenor || '1 Bulan',
    amount: borrowed,
    paid,
    status: outstanding === 0 ? 'Lunas' : (paid > 0 ? 'Sedang Mengangsur' : 'Belum Mengangsur'),
    body: 'Armada EV Cawang',
    disbursedBy: 'Bendahara Kholiq / Afrizal',
    ...(nik ? {} : { needsReview: true }),
    ...(matchConfidence ? { matchConfidence } : {})
  });
});

/* ------------------------------------------------------------------ *
 * 3. Iuran — parse the real payment PDF (never previously read)
 * ------------------------------------------------------------------ */
const IURAN_PDF = path.join(refDir, 'Laporan Uang Masuk per agustus rev.pdf');
const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];

function parseIuran() {
  const txt = execSync(`pdftotext -layout "${IURAN_PDF}" -`, { encoding: 'utf8' });
  const lines = txt.split('\n');

  // pdftotext collapses empty cells, so column identity has to come from the
  // horizontal position of each token rather than its ordinal index.
  // Boundaries are the observed end-offsets of the rendered columns.
  const bounds = [
    ['Mei', 40, 64],
    ['Juni', 65, 83],
    ['Juli', 84, 100],
    ['Agustus', 101, 112],
    ['September', 113, 130]
  ];

  const out = {};
  const re = /Rp[\d,]+|\-/g;

  lines.forEach((line) => {
    if (!/^\s*\d+\s+/.test(line)) return;
    const nikMatch = line.match(/^\s*\d+\s+(\d{6,}|-)\s+/);
    if (!nikMatch) return;
    const nik = nikMatch[1];
    if (nik === '-') return; // no NIK printed on that row

    const months = {};
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line))) {
      const end = m.index + m[0].length;
      const value = m[0] === '-' ? 0 : Number(m[0].replace(/[^\d]/g, ''));
      const col = bounds.find(([, lo, hi]) => end >= lo && end <= hi);
      if (col && value > 0) months[col[0]] = value;
    }

    // One doc per NIK; merge if a NIK somehow repeats across pages.
    out[nik] = { ...(out[nik] || {}), ...months };
  });

  return out;
}

const rawIuran = parseIuran();

// Amounts >= the Rp100.000 obligation count as settled; smaller payments are
// partial (pengurus pay at concessionary rates, so keep the nominal either way).
const iuran = Object.entries(rawIuran).map(([nik, months]) => {
  const record = {};
  MONTHS.forEach((mo) => {
    const nominal = months[mo] || 0;
    record[mo] = nominal >= 100000
      ? { status: 'lunas', nominal, method: 'Transfer BSI', source: 'Laporan Uang Masuk' }
      : (nominal > 0
        ? { status: 'partial', nominal, method: 'Transfer BSI', source: 'Laporan Uang Masuk' }
        : { status: 'unpaid', nominal: 0 });
  });
  return { nik, months: record };
});

/* ------------------------------------------------------------------ *
 * 4. People who hold debt but are absent from the roster
 *
 * Nicholas (17002197) is an intentional test account added by hand in
 * commit 0f05625 and carries the documented Rp910.000 laka case. LUTFI
 * (17002176) appears only on his debt card. Both get roster entries so
 * their debt records resolve instead of orphaning.
 * ------------------------------------------------------------------ */
const knownExtra = {
  '17002197': { position: 'Pramudi EV 50 Cawang (Akun Demo)' }
};
debts.forEach((d) => {
  if (!d.nik || users.some((u) => u.nik === d.nik)) return;
  users.push({
    nik: d.nik,
    name: d.name,
    role: 'member',
    position: (knownExtra[d.nik] || {}).position || 'Pramudi EV 50 Cawang',
    status: 'active'
  });
});

// Every roster member needs an iuran document, or the app has nothing to
// render for them. Runs after the debt-derived additions above so those
// drivers are covered too.
const iuranNiks = new Set(iuran.map((r) => r.nik));
users.forEach((u) => {
  if (iuranNiks.has(u.nik)) return;
  const months = {};
  MONTHS.forEach((mo) => { months[mo] = { status: 'unpaid', nominal: 0 }; });
  iuran.push({ nik: u.nik, months });
});

/* ------------------------------------------------------------------ *
 * 5. September expenses (transcribed from the official PDF)
 * ------------------------------------------------------------------ */
const expenses = [
  { id: 'EXP-01', date: '2026-09-01', title: 'Dana Talangan Bayu (koordinasi)', category: 'Talangan', amount: 300000, pic: 'Bayu Dyan', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-02', date: '2026-09-04', title: 'Suket M. Hasan Body 270', category: 'Bantuan Laka / Suket', amount: 500000, pic: 'M. Hasan', source: 'Kas Kecil Tunai (Kholiq)', body: 'Body 270' },
  { id: 'EXP-03', date: '2026-09-04', title: 'Penggantian Mekanik KLI (Tol & Makan)', category: 'Konsumsi & Atensi', amount: 151000, pic: 'Mekanik KLI', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-04', date: '2026-09-04', title: 'Biaya Konsumsi Perbaikan Body 242 oleh Mekanik Uday', category: 'Konsumsi & Atensi', amount: 200000, pic: 'Mekanik Uday', source: 'Kas Kecil Tunai (Kholiq)', body: 'Body 242' },
  { id: 'EXP-05', date: '2026-09-05', title: 'Pembelian Sparepart KLI Dorris Mandela (Cicilan 1)', category: 'Sparepart', amount: 502500, pic: 'Dorris Mandela', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-06', date: '2026-09-05', title: 'Penggantian Pembelian Sticker Warna Biru (Mekanik KLI)', category: 'Belanja Teknik', amount: 91000, pic: 'Mekanik KLI', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-07', date: '2026-09-05', title: 'Dana Talangan OPS Sandi', category: 'Talangan', amount: 1000000, pic: 'Sandi', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-08', date: '2026-09-06', title: 'Pembelian Cat, Tinner, dll + Transport', category: 'Belanja Teknik', amount: 965500, pic: 'Teknik Depo', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-09', date: '2026-09-08', title: 'Bansos an. Effendi Laka Pulang Kerja', category: 'Bansos', amount: 302500, pic: 'Effendi', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-10', date: '2026-09-10', title: 'Bansos an. Jonaemson G (Sakit)', category: 'Bansos', amount: 300000, pic: 'Jonaemson Gultom', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-11', date: '2026-09-11', title: 'Dana Talangan Laka an. Zeva', category: 'Talangan', amount: 300000, pic: 'Zeva Welian', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-12', date: '2026-09-11', title: 'Pembayaran Spare Part KLI bln Mei #via Afrizal', category: 'Sparepart', amount: 500000, pic: 'Afrizal Firmansyah', source: 'Debet Rekening BSI Paguyuban', body: '-' },
  { id: 'EXP-13', date: '2026-09-15', title: 'Dana Talangan Laka M. Sapli', category: 'Talangan', amount: 200000, pic: 'M. Sapli (Body 6H Tol JORR)', source: 'Kas Kecil Tunai (Kholiq)', body: 'Body 270' },
  { id: 'EXP-14', date: '2026-09-16', title: 'Bansos Muflih (Sakit)', category: 'Bansos', amount: 302500, pic: 'Muflih', source: 'Kas Kecil Tunai (Kholiq)', body: '-' },
  { id: 'EXP-15', date: '2026-09-19', title: 'Attensi Mekanik KLI & Afrizal', category: 'Konsumsi & Atensi', amount: 50000, pic: 'Mekanik KLI', source: 'Kas Kecil Tunai (Kholiq)', body: '-' }
];

/* ------------------------------------------------------------------ *
 * 6. Incidents already known to the app
 * ------------------------------------------------------------------ */
const incidents = [
  {
    id: 'INC-01', body: 'Body 248', driver: 'A Sutriadi', nik: '17001137',
    damage: 'Bemper kanan baret kena trotoar', location: 'Halte Bulungan',
    date: '02/09/2026', status: 'Selesai', mechanic: 'Mekanik KLI',
    suketStatus: 'Tidak Perlu Suket', needMechanic: true,
    notes: 'Sudah diperbaiki stiker biru KLI.'
  },
  {
    id: 'INC-02', body: 'Body 270', driver: 'M. Hasan', nik: '17001109',
    damage: 'Serempetan laka lantas Tol JORR', location: 'Tol JORR',
    date: '04/09/2026', status: 'Sedang Dikerjakan Mekanik', mechanic: 'Mekanik KLI',
    suketStatus: 'Suket Selesai (Biaya Rp500.000)', needMechanic: true,
    notes: 'Klaim laka Polres proses.'
  }
];

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */
const seedData = {
  users,
  debts,
  expenses,
  iuran,
  incidents,
  vault: {
    bsiBalance: 12450000,
    pettyCash: 131500,
    accountNo: '720510945',
    bankName: 'Bank Syariah Indonesia (BSI)',
    accountHolder: 'PAGUYUBAN EV 50 CAWANG'
  }
};

fs.writeFileSync(path.join(__dirname, 'seedData.json'), JSON.stringify(seedData, null, 2));

console.log(`Parsed:`);
console.log(`  ${users.length} members`);
console.log(`  ${debts.length} debt cards`);
console.log(`  ${iuran.length} iuran records`);
console.log(`  ${expenses.length} expenses`);
console.log(`  ${incidents.length} incidents`);

const withNik = debts.filter((d) => d.nik).length;
console.log(`  debts resolved to a NIK: ${withNik}/${debts.length}`);
if (unmatched.length) {
  console.log(`\nUNRESOLVED (emitted with nik:null, needsReview:true):`);
  unmatched.forEach((u) => console.log(`  - ${u.sheet} / "${u.name}"`));
  console.log(`  -> resolve these manually against the roster before production use.`);
}
