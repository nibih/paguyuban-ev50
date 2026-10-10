import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

// Write a list in bounded batches so 128 members don't stall on one
// connection. Firestore caps us at 500 writes per batch anyway.
const BATCH = 200;

async function writeAll(label, items, makeRef) {
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    await Promise.all(chunk.map((item) => setDoc(makeRef(item), item)));
    process.stdout.write(`\r  ${label}: ${Math.min(i + BATCH, items.length)}/${items.length}`);
  }
  process.stdout.write('\n');
}

async function seedFirestore() {
  console.log('Seeding operational data to Firestore paguyuban-ev50...\n');

  // 1. Vault (single doc)
  await setDoc(doc(db, 'system', 'vault'), seedData.vault);
  console.log('  ✓ system/vault');

  // 2. ALL members — the previous revision sliced to 15, which silently
  //    dropped the three documented test drivers (Nicholas, M. Sapli,
  //    Muhamad Hasan) because the roster is alphabetical and they sort late.
  await writeAll('users', seedData.users, (u) => doc(db, 'users', u.nik));
  console.log(`  ✓ users (${seedData.users.length})`);

  // 3. Debts
  await writeAll('debts', seedData.debts, (d) => doc(db, 'debts', d.id));
  console.log(`  ✓ debts (${seedData.debts.length})`);

  // 4. Expenses
  await writeAll('expenses', seedData.expenses, (e) => doc(db, 'expenses', e.id));
  console.log(`  ✓ expenses (${seedData.expenses.length})`);

  // 5. Iuran — one doc per NIK holding a month -> payment map. Absent until
  //    now, so every payment the app recorded evaporated on reload.
  await writeAll('iuran', seedData.iuran, (r) => doc(db, 'iuran', r.nik));
  console.log(`  ✓ iuran (${seedData.iuran.length})`);

  // 6. Incidents / damage logbook
  await writeAll('incidents', seedData.incidents, (i) => doc(db, 'incidents', i.id));
  console.log(`  ✓ incidents (${seedData.incidents.length})`);

  console.log('\nAll Firestore collections seeded.');

  const unresolved = seedData.debts.filter((d) => !d.nik);
  if (unresolved.length) {
    console.log(`\n${unresolved.length} debt card(s) have no resolved NIK and were`);
    console.log('written with nik:null + needsReview:true. Assign them manually:');
    unresolved.forEach((d) => console.log(`  - ${d.id}  "${d.name}"  Rp${d.amount.toLocaleString('id-ID')}`));
  }
}

seedFirestore().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exitCode = 1;
});
