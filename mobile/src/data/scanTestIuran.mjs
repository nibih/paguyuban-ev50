// Read-only: list iuran month entries that match the known test fingerprints.
// Never writes. Run this before revertTestIuran.mjs.
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
(await getDocs(collection(db, 'users'))).forEach(s => users.set(s.id, s.data().name));

const recs = [];
(await getDocs(collection(db, 'iuran'))).forEach(s => recs.push({ nik: s.id, ...s.data() }));

// Known test fingerprints from the 10-11 Oct 2026 session:
//   5 x Midtrans QRIS on 10/10, all NIK 17002197
//   7 x "Tunai Kasir" on 11/10, marked by Afrizal
const METHOD_QRIS = 'Midtrans QRIS';
const METHOD_TUNAI = 'Tunai Kasir';
const D1 = '10/10/2026';
const D2 = '11/10/2026';

const hits = [];
const other = [];

for (const r of recs) {
  for (const [month, d] of Object.entries(r.months || {})) {
    if (!d || typeof d !== 'object') continue;
    const isQrisTest = d.method === METHOD_QRIS && d.date === D1;
    const isTunaiTest = d.method === METHOD_TUNAI && d.date === D2;
    if (isQrisTest || isTunaiTest) {
      hits.push({ nik: r.nik, month, ...d, tag: isQrisTest ? 'QRIS 10/10' : 'TUNAI 11/10' });
    } else if (d.status === 'lunas' || d.status === 'pending') {
      other.push({ nik: r.nik, month, ...d });
    }
  }
}

console.log('TEST-FINGERPRINT PAYMENTS (candidates for revert):\n');
let total = 0;
for (const h of hits.sort((a, b) => a.nik.localeCompare(b.nik) || a.month.localeCompare(b.month))) {
  total += Number(h.nominal) || 0;
  console.log(
    `  [${h.tag}] ${h.nik} ${(users.get(h.nik) || '?').padEnd(24)} ${h.month.padEnd(10)} ` +
    `Rp${String(h.nominal).padStart(7)}  ${h.method}${h.markedBy ? ` (oleh ${h.markedBy})` : ''}`
  );
}
console.log(`\n  ${hits.length} month entries, total Rp${total.toLocaleString('id-ID')}`);

console.log('\nALL OTHER lunas/pending ENTRIES (left alone):\n');
let otherTotal = 0;
for (const o of other.sort((a, b) => a.nik.localeCompare(b.nik))) {
  otherTotal += Number(o.nominal) || 0;
  console.log(
    `  ${o.nik} ${(users.get(o.nik) || '?').padEnd(24)} ${o.month.padEnd(10)} ` +
    `Rp${String(o.nominal).padStart(7)}  ${o.method || '-'}  ${o.date || '-'}  ${o.status}`
  );
}
console.log(`\n  ${other.length} entries, total Rp${otherTotal.toLocaleString('id-ID')}`);
