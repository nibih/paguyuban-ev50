// Repair live debt cards corrupted by the pre-a77bde6 parser bug.
//
// THAT BUG: unmatched debt cards were assigned a RANDOM NIK —
//     `users.find(...) || \`1700${Math.floor(1000 + Math.random() * 9000)}\``
// The same parser also took `amount` from the card's JUMLAH header (the
// OUTSTANDING figure) and threw away the SETORAN column, so installments
// were never recorded. a77bde6 fixed all of that in seedData.json, but the
// corrected data was never pushed to live Firestore, and the additive
// seeder deliberately skips existing docs — so the bad rows survived.
//
// Result on live: 8 cards point at NIKs with no member document, which makes
// them invisible in MemberTalangan (debts.filter(d => d.nik === currentUser.nik)),
// and 4 cards lost their payment history.
//
// This restores the 12 seeded cards from the corrected seedData.json.
// It does NOT touch:
//   - DEBT-657796, DEBT-918342  (created through the app, absent from seed)
//   - the vault                 (balances are owned by the app)
//
// App-recorded payments are REVERTED, not preserved. nibih confirmed on
// 2026-10-12 that every in-app payment so far was a test, and none has been
// verified against the bank. Restoring seed paid/status clears them rather
// than letting test taps stand as financial history.
//
//   node src/data/repairDebtCards.mjs --dry-run   # report only
//   node src/data/repairDebtCards.mjs             # write

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, doc, updateDoc
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

const DRY = process.argv.includes('--dry-run');
const db = getFirestore(initializeApp(firebaseConfig));

// `status` is deliberately absent: it is a pure function of paid/amount and
// is always derived below. Copying it from the seed let a card with a real
// app-recorded payment get relabelled "Belum Mengangsur".
const FIELDS = ['nik', 'name', 'incident', 'startDate', 'tenor', 'amount', 'paid', 'body'];

function statusFor(paid, amount) {
  if (paid >= amount) return 'Lunas';
  if (paid > 0) return 'Sedang Mengangsur';
  return 'Belum Mengangsur';
}

const seedById = new Map(seedData.debts.map(d => [d.id, d]));
const snap = await getDocs(collection(db, 'debts'));
const live = new Map();
snap.forEach(d => live.set(d.id, d.data()));

console.log(`${DRY ? 'DRY RUN — nothing will be written' : 'REPAIRING'} live debt cards\n`);

let planned = 0;
let skipped = 0;

for (const [id, L] of [...live.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const S = seedById.get(id);

  // Not in seed: created through the app. Untouched by design.
  if (!S) {
    console.log(`  = ${id.padEnd(20)} app-created, left alone (paid ${L.paid}/${L.amount})`);
    skipped++;
    continue;
  }

  const patch = {};
  for (const f of FIELDS) {
    if (JSON.stringify(S[f]) !== JSON.stringify(L[f])) patch[f] = S[f];
  }

  // Status is always derived, never copied from the seed: it must agree with
  // the paid/amount that will actually be stored.
  const finalStatus = statusFor(S.paid ?? 0, S.amount);
  if (L.status !== finalStatus) patch.status = finalStatus;

  if (Object.keys(patch).length === 0) {
    console.log(`  ✓ ${id.padEnd(20)} already correct`);
    continue;
  }

  planned++;
  const changes = Object.entries(patch).map(([k, v]) => `${k}=${JSON.stringify(L[k])}->${JSON.stringify(v)}`).join('  ');
  console.log(`  ${DRY ? '~' : '…'} ${id.padEnd(20)} ${changes}`);

  if (!DRY) await updateDoc(doc(db, 'debts', id), patch);
}

console.log(`\n${DRY ? 'Would repair' : 'Repaired'} ${planned} card(s); ${skipped} app-created card(s) skipped.`);

const orphans = [...live.entries()].filter(([, L]) => L.nik && !seedData.users.some(u => u.nik === L.nik));
console.log(`\nCards still pointing at a non-existent member after repair: ` +
  (DRY ? 'run without --dry-run to see' : `${[...live.entries()].filter(([, L]) => L.nik && !seedData.users.some(u => u.nik === L.nik)).length}`));
if (!DRY && orphans.length) {
  orphans.forEach(([id, L]) => console.log(`  ${id} -> ${L.nik}`));
}
