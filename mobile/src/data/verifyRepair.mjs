// Read-only: confirm the debt repair actually landed, and report any card
// whose NIK has no matching user document. Never writes.
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
(await getDocs(collection(db, 'users'))).forEach(s => users.set(s.id, s.data()));

const debts = [];
(await getDocs(collection(db, 'debts'))).forEach(s => debts.push({ id: s.id, ...s.data() }));

let orphans = 0;
console.log('LIVE DEBT CARDS\n');
for (const d of debts.sort((a, b) => a.id.localeCompare(b.id))) {
  const resolved = d.nik && users.has(d.nik);
  if (d.nik && !resolved) orphans++;
  const sisa = (d.amount || 0) - (d.paid || 0);
  const derived = sisa === 0 ? 'Lunas' : (d.paid > 0 ? 'Sedang Mengangsur' : 'Belum Mengangsur');
  const statusOk = d.status === derived;
  const q = (d.pendingInstallments || []).length;
  console.log(
    `${resolved ? 'OK ' : d.nik ? 'BAD' : '???'} ${d.id.padEnd(20)} nik=${String(d.nik).padEnd(9)} ` +
    `paid=${String(d.paid).padEnd(8)} amt=${String(d.amount).padEnd(8)} ` +
    `status=${String(d.status).padEnd(19)}${statusOk ? '' : `<-- EXPECTED ${derived}`} queued=${q}`
  );
}

console.log(`\nCards with a NIK having no user doc: ${orphans}`);

// Cross-check every NIK against the roster.
const badNik = debts.filter(d => d.nik && !users.has(d.nik));
if (badNik.length === 0) console.log('Every non-null debt NIK resolves to a real member.');
