// Resolve DEBT-Afrizal_p against NIK 17001589 in live Firestore.
//
// Confirmed by nibih on 2026-10-12 after the identity chain in seedData's
// matchNote was laid out. Safe to re-run: the write is idempotent and it
// refuses to touch a card that already carries a different NIK.
//
//   node src/data/linkAfrizalDebt.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCoSD8l_fMvvky7q9bMTHyEwWDY9eE2G68",
  authDomain: "paguyuban-ev50.firebaseapp.com",
  projectId: "paguyuban-ev50",
  storageBucket: "paguyuban-ev50.firebasestorage.app",
  messagingSenderId: "207640068252",
  appId: "1:207640068252:web:50b9c9bdd77a3974892d59",
};

const DEBT_ID = 'DEBT-Afrizal_p';
const NIK = '17001589';
const CONFIDENCE = 'manual(ketua-identity-chain)';

const db = getFirestore(initializeApp(firebaseConfig));

const ref = doc(db, 'debts', DEBT_ID);
const snap = await getDoc(ref);

if (!snap.exists()) {
  console.error(`✗ ${DEBT_ID} does not exist in Firestore.`);
  process.exit(1);
}

const current = snap.data();

if (current.nik && current.nik !== NIK) {
  console.error(`✗ ${DEBT_ID} already carries NIK ${current.nik}, not ${NIK}.`);
  console.error('  Refusing to overwrite. Unlink it in the A4 tab first.');
  process.exit(1);
}

if (current.nik === NIK) {
  console.log(`✓ ${DEBT_ID} already linked to ${NIK} — nothing to do.`);
  process.exit(0);
}

await updateDoc(ref, { nik: NIK, matchConfidence: CONFIDENCE });

const after = await getDoc(ref);
console.log(`✓ ${DEBT_ID} "${after.data().name}" -> NIK ${NIK}`);
console.log(`  Rp${after.data().amount.toLocaleString('id-ID')} · ${after.data().status} · paid ${after.data().paid}/${after.data().amount}`);

const stillOpen = ['DEBT-AGUS_TRIONO', 'DEBT-SHANDY'];
console.log(`\nStill unresolved (not in the 126-name roster): ${stillOpen.join(', ')}`);
console.log('Assign them in the A4 tab once a paguyuban officer identifies them.');
