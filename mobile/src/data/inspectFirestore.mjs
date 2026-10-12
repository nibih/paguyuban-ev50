// Read-only inspection of live Firestore.
//
// Reports what is actually stored per collection and diffs it against
// seedData.json, so a reseed can be judged before it runs. Writes nothing.
// Safe to run at any time — it only reads.
//
//   node src/data/inspectFirestore.mjs

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = ['users', 'debts', 'expenses', 'iuran', 'incidents'];

async function snapshot() {
  const out = {};
  for (const name of COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, name));
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      out[name] = docs;
    } catch (e) {
      out[name] = { error: e.code || e.message };
    }
  }
  try {
    const v = await getDoc(doc(db, 'system', 'vault'));
    out.vault = v.exists() ? v.data() : null;
  } catch (e) {
    out.vault = { error: e.code || e.message };
  }
  return out;
}

const live = await snapshot();

console.log('=== LIVE FIRESTORE STATE (read-only) ===\n');
for (const name of COLLECTIONS) {
  const v = live[name];
  if (v && v.error) console.log(`  ${name.padEnd(10)} ERROR  ${v.error}`);
  else console.log(`  ${name.padEnd(10)} ${String(v.length).padStart(4)} docs`);
}
console.log(`  ${'vault'.padEnd(10)} ${live.vault && !live.vault.error ? JSON.stringify(live.vault) : (live.vault?.error || 'MISSING')}`);

console.log('\n=== DIFF vs seedData.json ===\n');

// Vault: is the live balance the same as what the seeder would write?
if (live.vault && !live.vault.error) {
  const s = seedData.vault;
  const same = ['bsiBalance', 'pettyCash'].every(k => live.vault[k] === s[k]);
  console.log(`  vault balances: live bsi=${live.vault.bsiBalance} petty=${live.vault.pettyCash}`);
  console.log(`                 seed bsi=${s.bsiBalance} petty=${s.pettyCash}`);
  console.log(`                 ${same ? 'IDENTICAL — matches seedData'
    : 'DIVERGED — live has moved since seedData was written (expected once the app is in use)'}`);
  console.log('                 The additive seeder leaves the vault alone either way.');
} else {
  console.log('  vault: no live doc — reseed would create it fresh');
}

for (const name of COLLECTIONS) {
  const v = live[name];
  if (!Array.isArray(v)) { console.log(`\n  ${name}: skipped (unreadable)`); continue; }
  const seedLen = (seedData[name] || []).length;
  console.log(`\n  ${name}: live=${v.length}  seed=${seedLen}`);

  // Key field used to identify a record in each collection.
  const keyOf = { users: 'nik', iuran: 'nik', debts: 'id', expenses: 'id', incidents: 'id' }[name];
  const liveKeys = new Set(v.map(r => String(r[keyOf])));
  const seedKeys = new Set((seedData[name] || []).map(r => String(r[keyOf])));

  const missing = [...seedKeys].filter(k => !liveKeys.has(k));
  const extra = [...liveKeys].filter(k => !seedKeys.has(k));
  console.log(`    would ADD ${missing.length} new, keep ${v.length - extra.length} existing, leave ${extra.length} live-only untouched`);
  if (missing.length && missing.length <= 6) console.log(`    missing: ${missing.join(', ')}`);
  if (extra.length && extra.length <= 6) console.log(`    live-only: ${extra.join(', ')}`);
}

console.log('\nDone. Nothing was written.\n');
process.exit(0);
