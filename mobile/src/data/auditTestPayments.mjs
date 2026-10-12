// Audit live Firestore for test-only payment activity.
//
// nibih confirmed on 2026-10-12 that every payment recorded through the app
// so far was a test, and none has been verified against the bank. This lists
// every place live state has drifted from seedData because of in-app writes,
// so the drift can be cleared in one deliberate pass. Writes nothing.
//
//   node src/data/auditTestPayments.mjs

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, doc, getDoc
} from 'firebase/firestore';
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
const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

// ---- vault -------------------------------------------------------------
const vSnap = await getDoc(doc(db, 'system', 'vault'));
const V = vSnap.data();
const S = seedData.vault;
console.log('=== VAULT (live vs seed) ===');
console.log(`  BSI        seed ${rp(S.bsiBalance).padStart(14)}   live ${rp(V.bsiBalance).padStart(14)}   delta ${rp(V.bsiBalance - S.bsiBalance)}`);
console.log(`  pettyCash  seed ${rp(S.pettyCash).padStart(14)}   live ${rp(V.pettyCash).padStart(14)}   delta ${rp(V.pettyCash - S.pettyCash)}`);
console.log('  Every in-app payment moves pettyCash, so these deltas are test residue.');

// ---- debts -------------------------------------------------------------
const seedDebt = new Map(seedData.debts.map((d) => [d.id, d]));
const dSnap = await getDocs(collection(db, 'debts'));
console.log('\n=== DEBT CARDS ===');
const debtRows = [];
dSnap.forEach((d) => {
  const L = d.data();
  const SD = seedDebt.get(L.id);
  if (!SD) {
    debtRows.push(`  ${L.id.padEnd(20)} created in app — paid ${rp(L.paid)} of ${rp(L.amount)} (${L.status})`);
    return;
  }
  const bits = [];
  if ((L.paid || 0) > (SD.paid || 0)) bits.push(`paid ${SD.paid}->${L.paid}  [test]`);
  if ((L.paid || 0) < (SD.paid || 0)) bits.push(`paid ${SD.paid}->${L.paid}  [corrupt]`);
  if (L.nik !== SD.nik) bits.push(`nik ${SD.nik}->${L.nik}  [corrupt]`);
  if (L.amount !== SD.amount) bits.push(`amount ${SD.amount}->${L.amount}  [corrupt]`);
  if (bits.length) debtRows.push(`  ${L.id.padEnd(20)} ${bits.join('   ')}`);
});
console.log(debtRows.length ? debtRows.join('\n') : '  none');

// ---- iuran -------------------------------------------------------------
const seedIuran = new Map(seedData.iuran.map((r) => [String(r.nik), r]));
const iSnap = await getDocs(collection(db, 'iuran'));
console.log('\n=== IURAN MONTHS FLIPPED TO LUNAS IN-APP ===');
const iuranRows = [];
let totalNominal = 0;
iSnap.forEach((d) => {
  const L = d.data();
  const SD = seedIuran.get(String(L.nik));
  if (!SD) return;
  for (const [m, e] of Object.entries(L.months || {})) {
    if (e && e.status === 'lunas' && (!SD.months[m] || SD.months[m].status !== 'lunas')) {
      totalNominal += e.nominal || 0;
      iuranRows.push(`  NIK ${L.nik}  ${String(m).padEnd(10)} ${rp(e.nominal).padStart(11)}  ${e.method || '—'}  ${e.date || ''}${e.markedBy ? '  by ' + e.markedBy : ''}`);
    }
  }
});
console.log(iuranRows.slice(0, 12).join('\n') || '  none');
if (iuranRows.length > 12) console.log(`  ... and ${iuranRows.length - 12} more`);
console.log(`\n  total: ${iuranRows.length} month(s), ${rp(totalNominal)} recorded as paid but unverified`);

console.log('\nNothing was written.\n');
