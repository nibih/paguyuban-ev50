// Rule probe: writes throwaway documents, checks that the deployed rules
// accept what the app writes and refuse what they must, then removes them.
//
// Firestore has no dry run, so the only honest way to know a rule still
// permits production writes is to attempt one. That matters here more than it
// sounds: on 2026-10-23 every `create` in the database was being denied
// because selfKeyed() looked for a field NAMED AFTER the document id
// ("DEBT-AGUS_TRIONO": "DEBT-AGUS_TRIONO") instead of checking the `id` field.
// Nothing surfaced server-side; the app just showed a failure toast. Reads and
// updates kept working, so the panel looked healthy.
//
//   node src/data/probeRules.mjs
//
// Exit code 0 means every expectation held. Any other exit means a rule has
// drifted from what the app actually writes.
//
// This writes two documents and deletes both. It does NOT touch the vault:
// a probe expense is a document, not a transaction, so no balance moves.

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCoSD8l_fMvvky7q9bMTHyEwWDY9eE2G68',
  authDomain: 'paguyuban-ev50.firebaseapp.com',
  projectId: 'paguyuban-ev50',
  storageBucket: 'paguyuban-ev50.firebasestorage.app',
  messagingSenderId: '207640068252',
  appId: '1:207640068252:web:50b9c9bdd77a3974892d59'
});

const db = getFirestore(app);
const STAMP = Date.now();
const results = [];

// suppress the write-stream noise Firestore prints on an intentional denial
const quietly = async (fn) => {
  const orig = console.error;
  console.error = () => {};
  try { return await fn(); } finally { console.error = orig; }
};

async function probe(label, coll, pathId, data, expectOk) {
  let ok = true;
  await quietly(async () => {
    try {
      await setDoc(doc(db, coll, pathId), data);
    } catch {
      ok = false;
    }
  });

  const pass = ok === expectOk;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(42)} wrote=${ok} expected=${expectOk}`);
  results.push(pass);

  if (ok) await quietly(() => deleteDoc(doc(db, coll, pathId)));
  return pass;
}

// ---- emergencyContacts -------------------------------------------------
// Shape mirrors addContact(): normalised phone, route key, four keys only.
const contact = (id, extra = {}) => ({
  id, name: 'Probe', route: 'senen-balkot', phone: '', ...extra
});

console.log('emergencyContacts');
await probe('valid normalised number', 'emergencyContacts',
  `CONTACT-PROBE-${STAMP}`, contact(`CONTACT-PROBE-${STAMP}`, { phone: '6281319206080' }), true);
await probe('deliberately blank number', 'emergencyContacts',
  `CONTACT-PROBE-${STAMP}-B`, contact(`CONTACT-PROBE-${STAMP}-B`), true);
await probe('short number (10 digits)', 'emergencyContacts',
  `CONTACT-PROBE-${STAMP}-C`, contact(`CONTACT-PROBE-${STAMP}-C`, { phone: '62895340134' }), false);
await probe('un-normalised number (0812…)', 'emergencyContacts',
  `CONTACT-PROBE-${STAMP}-D`, contact(`CONTACT-PROBE-${STAMP}-D`, { phone: '081319206080' }), false);
await probe('unexpected field', 'emergencyContacts',
  `CONTACT-PROBE-${STAMP}-E`, contact(`CONTACT-PROBE-${STAMP}-E`, { note: 'x' }), false);
// Written to a path its own `id` field does not name: must be refused, or a
// copied document could pose as a real one.
await probe('field id does not match path', 'emergencyContacts',
  `CONTACT-PROBE-${STAMP}-F`, contact('SOMEONE-ELSE'), false);

// ---- expenses ----------------------------------------------------------
// The same selfKeyed() helper guards this collection, so this probe covers
// the four older collections too. A document, not a transaction: no vault.
console.log('\nexpenses');
const exp = (id) => ({
  id,
  date: '23/10/2026',
  title: 'Probe rules',
  category: 'Lainnya',
  amount: 1000,
  pic: 'Sistem',
  source: 'Kas Kecil',
  body: 'rule probe'
});

await probe('valid expense document', 'expenses', `EXP-PROBE-${STAMP}`, exp(`EXP-PROBE-${STAMP}`), true);
await probe('field id does not match path', 'expenses',
  `EXP-PROBE-${STAMP}-X`, exp('SOMEONE-ELSE'), false);

const all = results.every(Boolean);
console.log(all ? '\nALL PROBES PASSED' : '\nSOME PROBES FAILED — deployed rules do not match the app');
process.exit(all ? 0 : 1);
