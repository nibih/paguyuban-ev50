// Imports the official "Kartu Pengawasan Perbaikan" workbook into `incidents`.
//
// Kartu perbaikan and laporan bodi are the same object: a member's body-repair
// record. The card is the paper version, the incident board is the digital one,
// so the cards belong in `incidents` rather than in a parallel collection.
//
// Three things the paper has that the app does not, added as optional fields:
//   kind      PERAWATAN / GANTI / ASURANSI / BODY REPAIR
//   part      spare part named on the card
//   partPrice rupiah, only on 11 of 80 rows
//
// Every imported row is marked `source: 'kartu-perbaikan'`. Without it the
// board cannot tell a 2026 archive entry from a driver's report filed this
// morning, and the "Selesai" column becomes unusable the moment 80 rows land.
//
//   node src/data/importRepairCards.mjs            # dry run, writes nothing
//   node src/data/importRepairCards.mjs --write    # create the missing docs
//
// Idempotent: ids are derived from NIK + row number, so a second run reports
// "already present" instead of duplicating the archive.

import { createRequire } from 'module';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, setDoc, getDoc, collection, getDocs
} from 'firebase/firestore';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const here = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(here, '../../../reference/newdocs', 'DATA PERBAIKAN ANGGOTA.xlsx');
const WRITE = process.argv.includes('--write');

const app = initializeApp({
  apiKey: 'AIzaSyCoSD8l_fMvvky7q9bMTHyEwWDY9eE2G68',
  authDomain: 'paguyuban-ev50.firebaseapp.com',
  projectId: 'paguyuban-ev50',
  storageBucket: 'paguyuban-ev50.firebasestorage.app',
  messagingSenderId: '207640068252',
  appId: '1:207640068252:web:50b9c9bdd77a3974892d59'
});
const db = getFirestore(app);

/* ---------------- parse ---------------- */

const clean = (v) => (v === undefined || v === null ? '' : String(v).replace(/\s+/g, ' ').trim());

// Card dates come out of Excel as m/d/yy. The app stores dd/mm/yyyy.
// One card holds the malformed "03/062026" (missing slash) — parsed, and
// reported, because guessing silently would hide a bad source row.
const toAppDate = (raw) => {
  const s = clean(raw);
  if (!s) return '';

  const broken = s.match(/^(\d{1,2})\/(\d{2})(\d{4})$/); // 03/062026
  if (broken) {
    const [, a, b, y] = broken;
    return `${b}/${a}/${y}`; // m/d -> d/m
  }

  const parts = s.split(/[\/-]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 3) return '';

  let [a, b, c] = parts.map(Number);
  if (!a || !b || !c) return '';
  const year = c < 100 ? 2000 + c : c;
  // Excel wrote these as month/day; a value above 12 in the first slot would
  // mean the sheet is already day-first, which it is not.
  const month = a;
  const day = b;
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

const toBody = (cardBody, desc) => {
  // "250-267" inside the damage text is a unit reference
  const inline = String(desc || '').match(/\b250\s*-\s*(\d{3})\b/);
  if (inline) return `Body ${inline[1]}`;
  // the card's own BODY column: 250233 -> Body 233
  const own = String(cardBody || '').match(/^250(\d{3})$/);
  if (own) return `Body ${own[1]}`;
  return '';
};

const toPrice = (raw) => {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
};

const cards = [];
{
  const wb = XLSX.readFile(REF, { cellDates: true });
  for (const sheet of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], {
      header: 1, raw: false, defval: '', blankrows: true
    });

    const field = (label) => {
      for (let i = 0; i < rows.length; i++) {
        const a = clean(rows[i]?.[0]).toUpperCase();
        if (a === label || a.startsWith(`${label} `) || a.startsWith(`${label}:`)) {
          for (let c = 1; c < (rows[i] || []).length; c++) {
            const v = clean(rows[i][c]);
            if (v && !/^[;:.,\-–—]+$/.test(v)) return v;
          }
        }
      }
      return '';
    };

    let header = -1;
    for (let i = 0; i < rows.length; i++) {
      const t = (rows[i] || []).map(clean).join('|').toUpperCase();
      if (t.includes('TANGGAL') && t.includes('URAIAN')) { header = i; break; }
    }

    const repairs = [];
    for (let i = header + 1; i >= 0 && i < rows.length; i++) {
      const no = clean(rows[i]?.[0]);
      const date = clean(rows[i]?.[1]);
      const desc = clean(rows[i]?.[2]);
      if (!/^\d+$/.test(no) || (!date && !desc)) continue;
      repairs.push({
        no,
        date,
        desc,
        kind: clean(rows[i]?.[4]),
        part: clean(rows[i]?.[5]),
        partPrice: clean(rows[i]?.[6]),
        cardNote: clean(rows[i]?.[7])
      });
    }

    cards.push({
      sheet: sheet.trim(),
      name: field('NAMA'),
      nik: field('NIK'),
      body: field('BODY'),
      crew: field('PRAMUDI'),
      repairs
    });
  }
}

/* ---------------- resolve members ---------------- */

const userSnap = await getDocs(collection(db, 'users'));
const users = [];
userSnap.forEach((d) => users.push({ ...d.data(), nik: d.data().nik || d.id }));

const byNik = new Map(users.map((u) => [u.nik, u]));
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const byName = new Map();
users.forEach((u) => {
  const key = norm(u.name);
  if (key && !byName.has(key)) byName.set(key, u);
});

// NIKs typed one digit wrong on the card. Each was checked against the name and
// the roster; none of them is a guess about which person is meant.
const NIK_FIX = {
  '170000778': '17000778',  // MUFLIH — one extra zero
  '170011011': '17001101',  // AGUS SUKMANA — one extra digit
  '831111896': '831111895'  // NOFRIAL — last digit
};

// Cards with no NIK at all, matched on the name printed on them.
const NAME_FIX = {
  LUTFI: '17002176',
  NICOLAS: '17002197',
  'M FAIZAL A': '17001552',
  NUROHIM: '820811526'
};

const resolve = (card) => {
  const direct = byNik.get(card.nik);
  if (direct) return { user: direct, via: 'nik' };

  const fixed = NIK_FIX[card.nik];
  if (fixed && byNik.get(fixed)) return { user: byNik.get(fixed), via: `nik-fix(${card.nik}->${fixed})` };

  const alias = NAME_FIX[card.sheet.toUpperCase()] || NAME_FIX[card.name.toUpperCase()];
  if (alias && byNik.get(alias)) return { user: byNik.get(alias), via: `name-fix(${alias})` };

  const exact = byName.get(norm(card.name));
  if (exact) return { user: exact, via: 'name' };

  return { user: null, via: null };
};

/* ---------------- build documents ---------------- */

const planned = [];
const unresolved = [];
const skippedRows = [];

for (const card of cards) {
  const { user, via } = resolve(card);
  if (!user) {
    unresolved.push({ card, rows: card.repairs.length });
    continue;
  }

  for (const r of card.repairs) {
    const date = toAppDate(r.date);
    if (!date) {
      skippedRows.push({ card: card.sheet, row: r.no, reason: `unreadable date "${r.date}"`, desc: r.desc });
      continue;
    }

    const id = `INC-KRT-${user.nik}-${String(r.no).padStart(2, '0')}`;
    const doc_ = {
      id,
      nik: user.nik,
      driver: user.name,
      body: toBody(card.body, r.desc),
      damage: r.desc || 'Perbaikan (kartu)',
      location: '',
      date,
      status: 'Selesai',
      mechanic: '',
      suketStatus: '',
      needMechanic: false,
      notes: '',
      source: 'kartu-perbaikan',
      kind: r.kind,
      part: r.part,
      partPrice: toPrice(r.partPrice),
      cardNote: r.cardNote
    };

    planned.push({ doc: doc_, via, card: card.sheet, rawDate: r.date });
  }
}

/* ---------------- existing ---------------- */

const existing = new Set();
{
  const snap = await getDocs(collection(db, 'incidents'));
  snap.forEach((d) => existing.add(d.id));
}
const fresh = planned.filter((p) => !existing.has(p.doc.id));
const already = planned.length - fresh.length;

/* ---------------- report ---------------- */

const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
const bySource = {};
planned.forEach((p) => { bySource[p.doc.nik] = (bySource[p.doc.nik] || 0) + 1; });

console.log(`${WRITE ? 'IMPORTING' : 'DRY RUN — nothing will be written'}`);
console.log(`cards read: ${cards.length} · repair rows: ${cards.reduce((s, c) => s + c.repairs.length, 0)}`);
console.log(`documents planned: ${planned.length} · already present: ${already} · to create: ${fresh.length}`);
console.log(`members covered: ${Object.keys(bySource).length}`);
console.log(`part price total: ${rp(planned.reduce((s, p) => s + p.doc.partPrice, 0))}`);

const vias = {};
planned.forEach((p) => { vias[p.via] = (vias[p.via] || 0) + 1; });
console.log(`resolved by: ${JSON.stringify(vias)}`);

if (unresolved.length) {
  console.log(`\nUNRESOLVED CARDS (${unresolved.length}) — rows not imported:`);
  unresolved.forEach((u) => console.log(`   ${u.card.nik || '(no nik)'}  ${u.card.name}  · ${u.rows} rows`));
}

if (skippedRows.length) {
  console.log(`\nSKIPPED ROWS (${skippedRows.length}):`);
  skippedRows.forEach((s) => console.log(`   ${s.card} #${s.row} · ${s.reason} · ${s.desc}`));
}

const noBody = planned.filter((p) => !p.doc.body).length;
console.log(`\nrows without a body number: ${noBody}/${planned.length}`);
const byStatus = {};
planned.forEach((p) => { byStatus[p.doc.status] = (byStatus[p.doc.status] || 0) + 1; });
console.log(`status: ${JSON.stringify(byStatus)}`);

console.log('\nfirst five documents:');
planned.slice(0, 5).forEach((p) => console.log(`  ${JSON.stringify(p.doc)}`));

if (!WRITE) {
  console.log('\nRe-run with --write to create these documents.');
  process.exit(0);
}

let done = 0;
for (const p of fresh) {
  await setDoc(doc(db, 'incidents', p.doc.id), p.doc);
  done++;
  if (done % 20 === 0) process.stdout.write(`\r  written ${done}/${fresh.length}`);
}
process.stdout.write(`\r  written ${done}/${fresh.length}\n`);
console.log('Done.');
process.exit(0);
