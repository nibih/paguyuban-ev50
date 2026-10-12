// Read-only: diff live iuran against seedData.json to find month entries the
// APP added (seed has `source: "Laporan Uang Masuk"`, app writes `date`/`method`).
// This is the reliable test — the earlier audit's 12-entry figure came from here,
// while scanTestIuran.mjs matches a raw date string that also hits real payments.
// Never writes.
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import seedData from './seedData.json' with { type: 'json' };

const firebaseConfig = {
  apiKey: "AIzaSyCoSD8l_fMvvky7q9bMTHyEwWDY9eE2G68",
  authDomain: "paguyuban-ev50.firebaseapp.com",
  projectId: "paguyuban-ev50",
  storageBucket: "paguyuban-ev50.firebasestorage.app",
  messagingSenderId: "207640068252",
  appId: "1:207640068252:web:50b9c9bdd77a3974892d59",
};

const db = getFirestore(initializeApp(firebaseConfig));

const users = new Map();
(await getDocs(collection(db, 'users'))).forEach(s => users.set(s.id, s.data().name));

const seed = new Map(seedData.iuran.map(r => [r.nik, r]));
const live = [];
(await getDocs(collection(db, 'iuran'))).forEach(s => live.push({ nik: s.id, ...s.data() }));

const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];
// Semantic compare: Firestore returns keys in whatever order it stored them,
// so JSON.stringify would flag every single entry as "changed". Compare the
// fields that actually mean something.
const MEANING = ['status', 'nominal', 'method', 'source', 'markedBy', 'date', 'verifiedBy'];
const canon = (e) => {
  if (!e) return null;
  const o = {};
  MEANING.forEach(k => { if (e[k] !== undefined) o[k] = e[k]; });
  return JSON.stringify(o);
};

const added = [];   // in live, not in seed -> written by the app
const changed = []; // in both, but materially different
const missing = [];

for (const r of live) {
  const sr = seed.get(r.nik);
  for (const m of MONTHS) {
    const L = r.months?.[m];
    const S = sr?.months?.[m];
    if (L && !S) {
      added.push({ nik: r.nik, month: m, ...L, seedStatus: null });
    } else if (L && S && canon(L) !== canon(S)) {
      changed.push({ nik: r.nik, month: m, live: L, seed: S });
    } else if (!L && S) {
      missing.push({ nik: r.nik, month: m, seed: S });
    }
  }
}

const show = (x) => `${x.nik} ${(users.get(x.nik) || '?').padEnd(24)} ${x.month.padEnd(10)} ` +
  `Rp${String(x.nominal ?? '-').padStart(7)} ${String(x.method || '-').padEnd(16)} ${x.date || '-'}`;

console.log(`MONTH ENTRIES ADDED BY THE APP (not in seed): ${added.length}\n`);
let tot = 0;
for (const a of added.sort((a, b) => a.nik.localeCompare(b.nik) || a.month.localeCompare(b.month))) {
  tot += Number(a.nominal) || 0;
  console.log('  ' + show(a) + `  status=${a.status}  ${a.markedBy ? 'oleh ' + a.markedBy : ''}`);
}
console.log(`  total Rp${tot.toLocaleString('id-ID')}`);

console.log(`\nMONTH ENTRIES THAT DIFFER FROM SEED: ${changed.length}\n`);
let tot2 = 0;
for (const c of changed.sort((a, b) => a.nik.localeCompare(b.nik))) {
  tot2 += Number(c.live.nominal) || 0;
  console.log(`  ${c.nik} ${(users.get(c.nik) || '?').padEnd(24)} ${c.month.padEnd(10)} ` +
    `live=${JSON.stringify(c.live)}\n  ${' '.repeat(40)}seed=${JSON.stringify(c.seed)}`);
}
console.log(`  live nominal total Rp${tot2.toLocaleString('id-ID')}`);

console.log(`\nSEED MONTHS MISSING FROM LIVE: ${missing.length}`);
for (const m of missing) console.log('  ' + show(m));
