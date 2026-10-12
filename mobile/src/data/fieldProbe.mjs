// Read-only: dump the field names actually present in each collection so the
// web screens can be checked against reality, not against assumption.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const cfg = {
  apiKey: "AIzaSyCoSD8l_fMvvky7q9bMTHyEwWDY9eE2G68",
  authDomain: "paguyuban-ev50.firebaseapp.com",
  projectId: "paguyuban-ev50",
  storageBucket: "paguyuban-ev50.firebasestorage.app",
  messagingSenderId: "207640068252",
  appId: "1:207640068252:web:50b9c9bdd77a3974892d59"
};
const app = getApps().length === 0 ? initializeApp(cfg) : getApp();
const db = getFirestore(app);

const shape = (o, depth = 0) => {
  if (depth > 3 || o === null || typeof o !== 'object') return typeof o;
  if (Array.isArray(o)) return o.length ? [shape(o[0], depth + 1)] : [];
  const out = {};
  for (const k of Object.keys(o)) out[k] = shape(o[k], depth + 1);
  return out;
};

for (const name of ['users', 'iuran', 'debts', 'expenses', 'incidents']) {
  try {
    const snap = await getDocs(collection(db, name));
    if (snap.empty) { console.log(`\n### ${name}: EMPTY`); continue; }
    const docs = snap.docs;
    // Union of field names across every doc, since schemas drift.
    const union = new Set();
    docs.forEach(d => Object.keys(d.data()).forEach(k => union.add(k)));
    console.log(`\n### ${name}  (${docs.length} docs)`);
    console.log('field union:', [...union].sort().join(', '));
    console.log('sample:', JSON.stringify(shape(docs[0].data()), null, 0).slice(0, 600));
    // A few records with nested shape (iuran months, debt installments)
    if (name === 'iuran') {
      const d = docs[0].data();
      const m = Object.entries(d.months || {});
      if (m.length) console.log('  month entry:', JSON.stringify(shape(m[0][1])));
      const pend = docs.map(x => Object.values(x.data().months || {})).flat().filter(x => x.status === 'pending');
      console.log('  pending entries found:', pend.length, pend[0] ? JSON.stringify(shape(pend[0])) : '');
    }
    if (name === 'debts') {
      const withP = docs.filter(d => (d.data().pendingInstallments || []).length);
      console.log('  cards with pendingInstallments:', withP.length);
      if (withP[0]) console.log('  installment shape:', JSON.stringify(shape(withP[0].data().pendingInstallments[0])));
    }
  } catch (e) {
    console.log(`\n### ${name}: ERROR ${e.code || e.message}`);
  }
}

try {
  const v = await getDoc(doc(db, 'system', 'vault'));
  console.log('\n### system/vault:', v.exists() ? JSON.stringify(v.data()) : 'MISSING');
} catch (e) { console.log('\n### vault ERROR', e.code || e.message); }

process.exit(0);
