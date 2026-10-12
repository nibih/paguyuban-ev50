// Additive Firestore seeder.
//
// Creates documents that do not already exist. It never overwrites an
// existing document and never touches the vault balances.
//
// The original version called setDoc unconditionally, which is destructive
// once the app is live: the vault had moved to Rp12.850.000 / Rp281.500 from
// the Rp12.450.000 / Rp131.500 in seedData, and drivers had created debts,
// expenses and an incident through the app. Re-running that version would
// have silently reset real money to stale figures and clobbered live records.
//
//   node src/data/seedFirestore.mjs           # seed missing docs only
//   node src/data/seedFirestore.mjs --dry-run # report, write nothing

import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, setDoc, getDoc, getDocs, collection
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DRY = process.argv.includes('--dry-run');
const BATCH = 40; // concurrent reads/writes; keeps the socket healthy

async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
    const done = Math.min(i + size, items.length);
    process.stdout.write(`\r  scanning ${done}/${items.length}`);
  }
  process.stdout.write('\r');
  return out;
}

// Additive write: only create what is genuinely absent.
async function seedCollection(label, items, makeRef, keyOf) {
  const existing = new Set();
  const snap = await getDocs(collection(db, label));
  snap.forEach((d) => existing.add(d.id));

  const todo = items.filter((item) => !existing.has(String(keyOf(item))));
  const skipped = items.length - todo.length;

  if (todo.length === 0) {
    console.log(`  ✓ ${label.padEnd(10)} nothing to do (${items.length} already present)`);
    return 0;
  }

  if (DRY) {
    console.log(`  ~ ${label.padEnd(10)} would create ${todo.length}, skip ${skipped}`);
    return todo.length;
  }

  await inBatches(todo, BATCH, async (item) => {
    await setDoc(makeRef(item), item);
  });
  console.log(`  ✓ ${label.padEnd(10)} created ${todo.length}, skipped ${skipped} existing`);
  return todo.length;
}

async function seedFirestore() {
  console.log(`${DRY ? 'DRY RUN — nothing will be written' : 'Seeding'} paguyuban-ev50 (additive only)\n`);

  // The vault is deliberately NOT written. Balances track live money and are
  // owned by the app, not by this script.
  const vaultSnap = await getDoc(doc(db, 'system', 'vault'));
  if (vaultSnap.exists()) {
    const v = vaultSnap.data();
    console.log(`  - vault left untouched: BSI Rp${(v.bsiBalance || 0).toLocaleString('id-ID')} · Kas Kecil Rp${(v.pettyCash || 0).toLocaleString('id-ID')}`);
  } else if (DRY) {
    console.log(`  ~ vault missing — would create with seed values`);
  } else {
    await setDoc(doc(db, 'system', 'vault'), seedData.vault);
    console.log(`  ✓ vault created (no existing doc): BSI Rp${seedData.vault.bsiBalance.toLocaleString('id-ID')}`);
  }

  let created = 0;
  created += await seedCollection('users', seedData.users, (u) => doc(db, 'users', u.nik), (u) => u.nik);
  created += await seedCollection('iuran', seedData.iuran, (r) => doc(db, 'iuran', r.nik), (r) => r.nik);
  created += await seedCollection('debts', seedData.debts, (d) => doc(db, 'debts', d.id), (d) => d.id);
  created += await seedCollection('expenses', seedData.expenses, (e) => doc(db, 'expenses', e.id), (e) => e.id);
  created += await seedCollection('incidents', seedData.incidents, (i) => doc(db, 'incidents', i.id), (i) => i.id);

  console.log(`\n${DRY ? 'Dry run complete' : 'Done'} — ${created} document(s) ${DRY ? 'would be' : ''} created. Existing documents were not modified.`);

  const unresolved = seedData.debts.filter((d) => !d.nik);
  if (unresolved.length) {
    console.log(`\n${unresolved.length} debt card(s) still have no resolved NIK:`);
    unresolved.forEach((d) => console.log(`  - ${d.id}  "${d.name}"  Rp${d.amount.toLocaleString('id-ID')}`));
    console.log('Assign them in the A4 tab once you know the real NIK.');
  }
}

seedFirestore().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exitCode = 1;
});
