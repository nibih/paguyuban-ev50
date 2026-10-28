import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import seedData from '../data/seedData.json';
import { db } from '../services/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { rp, normalizePhone } from '../utils/format';
import { IURAN_FEE, VAULT_FOR_METHOD } from '../constants';

const AppContext = createContext();

// Human-readable messages for the Firestore codes we actually hit in the field.
const FS_MESSAGES = {
  'permission-denied': 'Server menolak tulisan (cek Security Rules).',
  'unavailable': 'Server tidak terjangkau. Coba lagi saat sinyal kembali.',
  'cancelled': 'Permintaan dibatalkan.',
  'deadline-exceeded': 'Koneksi terlalu lambat, transaksi dibatalkan.',
};

const fsError = (e) => FS_MESSAGES[e?.code] || e?.message || 'Gagal menyinkronkan ke server.';

const todayId = () => new Date().toLocaleDateString('id-ID');

export const AppProvider = ({ children }) => {
  // Authentication & active driver
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState('member'); // 'member' or 'admin'
  // Empty until loginWithNik sets it. It used to be seeded with a real
  // driver's NIK, which baked a specific person in as the app's default
  // identity for no benefit — while unauthenticated nothing reads this, and
  // after login loginWithNik overwrites it.
  const [activeNik, setActiveNik] = useState('');
  const [users, setUsers] = useState(seedData.users);
  const [debts, setDebts] = useState(seedData.debts);
  const [expenses, setExpenses] = useState(seedData.expenses);
  const [vault, setVault] = useState(seedData.vault);
  
  // Iuran records for all 128 drivers, parsed from the official
  // "Laporan Uang Masuk" reference PDF rather than hand-written here.
  const [iuranRecords, setIuranRecords] = useState(() =>
    (seedData.iuran || []).reduce((acc, r) => {
      acc[r.nik] = r.months || {};
      return acc;
    }, {})
  );

  // Incidents & Damage Logbook, from the parsed reference data.
  const [incidents, setIncidents] = useState(() => seedData.incidents || []);

  // Emergency contacts — the route dispatch list.
  //
  // Deliberately NOT seeded from seedData.json. A bundled copy would give the
  // phone a second, silently stale set of numbers, and calling a number that
  // was right three months ago is precisely the failure this feature exists
  // to prevent. Firestore is the single source; if it cannot be reached the
  // screen says so instead of showing something that may be wrong.
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  // Sync real-time with Firestore if connected
  useEffect(() => {
    try {
      const unsubVault = onSnapshot(doc(db, 'system', 'vault'), (snap) => {
        if (snap.exists()) setVault(snap.data());
      }, () => {});

      const unsubDebts = onSnapshot(collection(db, 'debts'), (snap) => {
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push(d.data()));
          // Merge rather than replace: a backend seeded with only some
          // cards must not make the others vanish from the UI.
          setDebts(prev => {
            const remoteIds = new Set(list.map(d => d.id));
            return [...list, ...prev.filter(d => !remoteIds.has(d.id))];
          });
        }
      }, () => {});

      const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push(d.data()));
          setExpenses(list);
        }
      }, () => {});

      // Iuran: one doc per NIK holding a month -> payment map.
      //
      // Merge per driver rather than replacing the whole map. A replace
      // means that as soon as ANYONE pays, every other driver's history
      // disappears from the UI on a partially-seeded backend.
      const unsubIuran = onSnapshot(collection(db, 'iuran'), (snap) => {
        if (!snap.empty) {
          const incoming = {};
          snap.forEach(d => {
            const data = d.data();
            incoming[data.nik || d.id] = data.months || {};
          });
          setIuranRecords(prev => ({ ...prev, ...incoming }));
        }
      }, () => {});

      const unsubIncidents = onSnapshot(collection(db, 'incidents'), (snap) => {
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push(d.data()));
          list.sort((a, b) => (b.id > a.id) - (b.id < a.id));
          setIncidents(list);
        }
      }, () => {});

      const unsubContacts = onSnapshot(collection(db, 'emergencyContacts'), (snap) => {
        // No `!snap.empty` guard here, unlike the money collections: an empty
        // dispatch list is a legitimate state, and a roster the admin just
        // cleared must not linger on the phone.
        const list = [];
        snap.forEach(d => list.push(d.data()));
        list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id'));
        setEmergencyContacts(list);
      }, () => {});

      // Roster. Merge per NIK like the debts listener: a backend seeded with
      // only some drivers must not erase the rest from the login screen.
      const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push({ ...d.data(), nik: d.data().nik || d.id }));
          setUsers(prev => {
            const remoteNiks = new Set(list.map(u => u.nik));
            return [...list, ...prev.filter(u => !remoteNiks.has(u.nik))];
          });
        }
      }, () => {});

      return () => {
        unsubVault();
        unsubDebts();
        unsubExpenses();
        unsubIuran();
        unsubIncidents();
        unsubUsers();
        unsubContacts();
      };
    } catch (e) {
      console.warn('Firestore unreachable — falling back to the bundled seed data.');
    }
  }, []);

  const [toast, setToast] = useState(null);

  // Each call replaces the previous toast AND takes over its dismissal
  // timer. Without clearing the old timer, two messages in quick succession
  // — a failed write followed by a listener refresh, for instance — would
  // leave the first call's timeout to wipe the second message early.
  const toastTimer = useRef(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // Login by NIK + PIN.
  //
  // Returns null on success, or a human-readable reason on failure so the
  // login screen can tell "unknown NIK" apart from "wrong PIN" — collapsing
  // them into one message would tell an attacker which NIKs exist.
  //
  // The PIN defaults to the last 4 digits of the NIK for accounts that have
  // never set one, which is what the seed roster and the demo cards assume.
  const loginWithNik = (nik, pin) => {
    const user = users.find(u => u.nik === nik);
    if (!user) return 'NIK tidak terdaftar dalam paguyuban';

    if (String(user.status || 'active') === 'inactive') {
      return 'Akun ini dinonaktifkan. Hubungi pengurus kas.';
    }

    const expected = String(user.pin || nik.slice(-4));
    // The PIN check is not optional. This used to be skipped whenever `pin`
    // was undefined, which meant any caller — or anyone who could reach the
    // context — could sign in as an admin with the NIK alone.
    if (!pin || String(pin) !== expected) {
      return 'PIN salah. Coba lagi.';
    }

    setActiveNik(nik);
    setRole(user.role === 'admin' ? 'admin' : 'member');
    setIsAuthenticated(true);
    showToast(`Selamat datang, ${user.name}! (${user.position || user.role})`);
    return null;
  };

  const logout = () => {
    setIsAuthenticated(false);
    showToast('Berhasil keluar dari akun.');
  };

  // Identity is the NIK that logged in, and nothing else.
  //
  // This line used to read
  //   users.find(u => u.nik === (role === 'admin' ? '17001589' : activeNik))
  // which forced every admin to resolve to Afrizal Firmansyah. With two admins
  // on the roster that meant Moh. Abdul Kholiq signed in, was welcomed by his
  // own name, and then spent the rest of the session as Afrizal — his iuran,
  // debt installments and incident reports all filed under another person.
  // Role is a permission, not an identity.
  //
  // `|| users[0]` stays as a crash-safety net: every screen reads
  // currentUser.nik without a guard, so null here would blank the app. After a
  // successful login, loginWithNik has already proved activeNik exists in
  // `users`, so that branch should not be reachable in practice.
  const currentUser = users.find(u => u.nik === activeNik) || users[0];

  // Pay Iuran
  //
  // Writes to the `iuran` collection (one doc per NIK) and credits the BSI
  // balance in the same transaction, so a payment can never be recorded
  // without the matching cash actually landing in the vault.
  //
  // Optimistic local update keeps the UI snappy; on a failed write we roll
  // back and tell the driver the payment did NOT sync, rather than letting
  // them believe money was recorded when it wasn't.
  // No Midtrans/QRIS: the gateway was never live, so a QR "payment" could
  // only ever fake a success. Every real payment is a BSI transfer with a
  // receipt, which is the one thing a cashier can verify.
  const payIuran = async (nik, months, method = 'Transfer BSI', receipt = null) => {
    if (!months?.length) return false;

    const today = todayId();
    // `receipt` is an optional base64 thumbnail of the bank transfer proof,
    // stored inline because the project has no Cloud Storage bucket.
    //
    // The payment lands as `pending`, NOT `lunas`, and the vault is left
    // alone. A driver tapping "pay" has made a claim about money, not proof
    // of it — until a cashier matches it against the BSI statement the
    // paguyuban cannot know the cash arrived. Confirming on tap is what let
    // test payments become financial history.
    const payment = {
      status: 'pending',
      nominal: IURAN_FEE,
      date: today,
      method,
      // `proof` is the same key the web panel writes, so a cashier can open a
      // driver's transfer receipt from either client. Older builds wrote
      // `receipt` for this image; the panel still reads that as a fallback.
      ...(receipt?.base64 ? { proof: receipt.base64 } : {})
    };

    const prevForNik = iuranRecords[nik] || {};

    // Optimistic update — no vault change, nothing to roll back there.
    setIuranRecords(prev => {
      const userRec = { ...(prev[nik] || {}) };
      months.forEach(m => { userRec[m] = payment; });
      return { ...prev, [nik]: userRec };
    });

    try {
      await runTransaction(db, async (tx) => {
        const iuranRef = doc(db, 'iuran', nik);
        const iuranSnap = await tx.get(iuranRef);

        const monthsMap = { ...(iuranSnap.exists() ? iuranSnap.data().months : {}) };
        // Never overwrite a month that already holds money. The picker hides
        // `lunas`, but a stale build or a re-tap must not push a paid month
        // back to `pending`: verifying it again would credit the vault twice.
        const blocked = months.find(m => {
          const status = monthsMap[m]?.status;
          return status && status !== 'unpaid';
        });
        if (blocked) throw { code: 'already-paid', month: blocked };
        months.forEach(m => { monthsMap[m] = payment; });
        tx.set(iuranRef, { nik, months: monthsMap }, { merge: true });
      });

      showToast(`Iuran ${months.join(', ')} dicatat menunggu verifikasi bendahara.`);
      return true;
    } catch (e) {
      // Roll back the optimistic write so state matches the server again.
      setIuranRecords(prev => ({ ...prev, [nik]: prevForNik }));
      showToast(
        e?.code === 'already-paid'
          ? `Iuran ${e.month} sudah tercatat. Muat ulang data.`
          : `Iuran TIDAK tersimpan. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // Record Installment
  //
  // Atomic across the debt card and the cash vault: the driver's "sisa
  // hutang" and the paguyuban's cash are two views of the same money, so
  // they are updated in one transaction or not at all.
  //
  // The installment is queued in `pendingInstallments` rather than added to
  // `paid`, and the vault is untouched. It only counts once a bendahara
  // confirms the money actually exists — see `verifyInstallment`.
  //
  // `paid` is recomputed from the server document inside the transaction
  // rather than from React state, so two drivers depositing at once cannot
  // overwrite each other's contribution.
  const repayDebt = async (debtId, amount, method = 'Cash ke Admin') => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      showToast('Nominal cicilan tidak valid.', 'error');
      return false;
    }

    const before = debts.find(d => d.id === debtId);
    if (!before) {
      showToast('Kartu utang tidak ditemukan.', 'error');
      return false;
    }

    // Guard against overpayment against the CONFIRMED total. Pending
    // installments are excluded: unverified claims must not reserve money.
    const outstanding = before.amount - before.paid;
    if (amt > outstanding) {
      showToast(`Setoran melebihi sisa utang (${rp(outstanding)}).`, 'error');
      return false;
    }

    const entry = {
      id: `INS-${Date.now()}`,
      amount: amt,
      method,
      date: todayId(),
      requestedBy: currentUser?.name || 'Pramudi'
    };
    const pendingBefore = before.pendingInstallments || [];

    // Optimistic update — `paid` and status do not move yet.
    setDebts(prev => prev.map(d => (d.id === debtId
      ? { ...d, pendingInstallments: [...(d.pendingInstallments || []), entry] }
      : d)));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', debtId);
        const debtSnap = await tx.get(debtRef);
        if (!debtSnap.exists()) throw { code: 'not-found' };

        const d = debtSnap.data();
        // Re-check against the server's confirmed figure, not React state.
        const serverOutstanding = (d.amount || 0) - (d.paid || 0);
        if (amt > serverOutstanding) throw { code: 'overpaid' };

        tx.update(debtRef, {
          pendingInstallments: [...(d.pendingInstallments || []), entry]
        });
      });

      showToast(`Cicilan ${rp(amt)} menunggu verifikasi bendahara.`);
      return true;
    } catch (e) {
      setDebts(prev => prev.map(d => (d.id === debtId ? { ...d, pendingInstallments: pendingBefore } : d)));
      showToast(
        e?.code === 'overpaid'
          ? 'Sisa utang berubah — muat ulang dan periksa kembali.'
          : `Cicilan TIDAK tersimpan. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // Submit Damage Report
  const addIncident = async (newInc) => {
    const item = {
      ...newInc,
      id: `INC-${Date.now()}`,
      // Full millisecond stamp: `slice(-4)` repeated every 10 seconds, so two
      // reports filed 10s apart became the same document and the first lost
      // its photos and damage description.
      date: todayId(),
      status: 'Laporan Baru Masuk',
      mechanic: newInc.needMechanic ? 'Mekanik KLI' : 'Belum Ditugaskan'
    };

    setIncidents(prev => [item, ...prev]);

    try {
      await setDoc(doc(db, 'incidents', item.id), item);
      showToast('Laporan perbaikan berhasil dikirim ke Pengurus & Mekanik!');
      return true;
    } catch (e) {
      setIncidents(prev => prev.filter(i => i.id !== item.id));
      showToast(`Laporan TIDAK terkirim. ${fsError(e)}`, 'error');
      return false;
    }
  };

  /* ---------------------------------------------------------------- *
   * ADMIN / KASIR MUTATIONS
   *
   * Every one of these moves real money, so each is wrapped in a
   * transaction against `system/vault` and the target document. The
   * optimistic local update is always rolled back if the write fails —
   * a cashier must never see a success state that Firestore rejected.
   * ---------------------------------------------------------------- */

  // One balance: cash and bank money are the same pot, so the expense source no
// longer picks an account.
const vaultKeyFor = () => 'bsiBalance';

  // A2: cashier ticks a driver's month as paid in cash.
  //
  // The tick records a CLAIM that cash changed hands. It does not move the
  // tin — `verifyIuran` does that, once a bendahara has counted it against
  // the physical kas kecil. A tap is not evidence of money.
  const markIuranPaidCash = async (nik, month) => {
    const fee = IURAN_FEE;
    const payment = {
      status: 'pending',
      nominal: fee,
      date: todayId(),
      method: 'Tunai Kasir',
      markedBy: currentUser?.name || 'Kasir'
    };

    const before = iuranRecords[nik]?.[month];

    setIuranRecords(prev => ({
      ...prev,
      [nik]: { ...(prev[nik] || {}), [month]: payment }
    }));

    try {
      await runTransaction(db, async (tx) => {
        const iuranRef = doc(db, 'iuran', nik);
        const iuranSnap = await tx.get(iuranRef);

        const months = { ...(iuranSnap.exists() ? iuranSnap.data().months : {}) };
        // Refuse to queue twice, and never overwrite a month that already
        // holds money. `partial` is the case that bit: a 50k transfer from the
        // bank report was replaced by a fresh 100k cash claim, so verifying it
        // credited 100k while the 50k already received vanished from the books.
        const status = months[month]?.status;
        if (status === 'lunas') throw { code: 'already-paid' };
        if (status === 'pending') throw { code: 'already-pending' };
        if (status && status !== 'unpaid') throw { code: 'partial' };

        months[month] = payment;
        tx.set(iuranRef, { nik, months }, { merge: true });
      });

      const name = users.find(u => u.nik === nik)?.name || nik;
      showToast(`Iuran ${month} a.n ${name} masuk antrean verifikasi.`);
      return true;
    } catch (e) {
      setIuranRecords(prev => {
        const months = { ...(prev[nik] || {}) };
        if (before) months[month] = before; else delete months[month];
        return { ...prev, [nik]: months };
      });
      showToast(
        e?.code === 'already-paid'
          ? `Iuran ${month} sudah lunas tercatat di server.`
          : e?.code === 'already-pending'
            ? `Iuran ${month} sudah menunggu verifikasi.`
            : e?.code === 'partial'
              ? `Iuran ${month} sudah punya pembayaran tercatat. Periksa di buku iuran, jangan ditandai tunai lagi.`
              : `Iuran TIDAK tersimpan. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // ------------------------------------------------------------------
  // PAYMENT VERIFICATION
  //
  // These are now the ONLY functions that move money into the vault from
  // a payment. Nothing else credits it: `payIuran`, `repayDebt` and
  // `markIuranPaidCash` all stop at `pending`.
  //
  // Why this exists: every payment made through the app before 12 Oct 2026
  // was a test tap, none was checked against the bank, and the taps had
  // already become financial history — Rp1.200.000 of iuran marked lunas
  // and a vault that no longer matched the BSI statement. A button press is
  // a claim about money, not proof of it.
  // ------------------------------------------------------------------

  // Which vault a confirmed payment belongs to, by exact method — see
  // ../constants. `null` means the payment moved no cash between accounts.
  const vaultKeyForMethod = (method) => (
    method in VAULT_FOR_METHOD ? VAULT_FOR_METHOD[method] : null
  );

  // A bendahara confirms one pending iuran month. Credits the matching vault.
  const verifyIuran = async (nik, month) => {
    const entry = iuranRecords[nik]?.[month];
    if (!entry) {
      showToast('Tidak ada pembayaran untuk bulan ini.', 'error');
      return false;
    }
    if (entry.status === 'lunas') {
      showToast(`Iuran ${month} sudah lunas.`, 'error');
      return false;
    }
    if (entry.status !== 'pending') {
      showToast(`Iuran ${month} bukan status tertunda.`, 'error');
      return false;
    }

    const vaultKey = vaultKeyForMethod(entry.method);
    const nominal = Number(entry.nominal) || IURAN_FEE;
    const confirmed = {
      ...entry,
      status: 'lunas',
      verifiedBy: currentUser?.name || 'Bendahara',
      verifiedAt: todayId()
    };

    const before = iuranRecords[nik]?.[month];

    // Optimistic update
    setIuranRecords(prev => ({
      ...prev,
      [nik]: { ...(prev[nik] || {}), [month]: confirmed }
    }));
    if (vaultKey) setVault(v => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + nominal }));

    try {
      await runTransaction(db, async (tx) => {
        const iuranRef = doc(db, 'iuran', nik);
        const vaultRef = doc(db, 'system', 'vault');
        const [iuranSnap, vaultSnap] = await Promise.all([tx.get(iuranRef), tx.get(vaultRef)]);

        const months = { ...(iuranSnap.exists() ? iuranSnap.data().months : {}) };
        const current = months[month];
        // Re-read inside the transaction: a second cashier may have already
        // confirmed or rejected it since this screen loaded.
        if (!current || current.status !== 'pending') throw { code: 'not-pending' };

        months[month] = { ...current, status: 'lunas', verifiedBy: confirmed.verifiedBy, verifiedAt: confirmed.verifiedAt };
        tx.set(iuranRef, { nik, months }, { merge: true });

        if (vaultKey) {
          const cash = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
          tx.set(vaultRef, { [vaultKey]: cash + nominal }, { merge: true });
        }
      });

      const name = users.find(u => u.nik === nik)?.name || nik;
      showToast(`Iuran ${month} a.n ${name} terverifikasi (+${rp(nominal)}).`);
      return true;
    } catch (e) {
      setIuranRecords(prev => {
        const months = { ...(prev[nik] || {}) };
        if (before) months[month] = before;
        return { ...prev, [nik]: months };
      });
      if (vaultKey) setVault(v => ({ ...v, [vaultKey]: v[vaultKey] - nominal }));
      showToast(
        e?.code === 'not-pending'
          ? `Iuran ${month} sudah diproses pengurus lain. Muat ulang.`
          : `Verifikasi GAGAL. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // A bendahara rejects a pending iuran month. The claim is dropped; no
  // money moves in either direction.
  const rejectIuran = async (nik, month, note = '') => {
    const before = iuranRecords[nik]?.[month];
    if (!before || before.status !== 'pending') {
      showToast('Hanya pembayaran tertunda yang bisa ditolak.', 'error');
      return false;
    }

    setIuranRecords(prev => {
      const months = { ...(prev[nik] || {}) };
      delete months[month];
      return { ...prev, [nik]: months };
    });

    try {
      await runTransaction(db, async (tx) => {
        const iuranRef = doc(db, 'iuran', nik);
        const snap = await tx.get(iuranRef);
        const months = { ...(snap.exists() ? snap.data().months : {}) };
        if (months[month]?.status !== 'pending') throw { code: 'not-pending' };
        delete months[month];
        tx.set(iuranRef, { nik, months }, { merge: true });
      });

      showToast(note ? `Pembayaran ${month} ditolak: ${note}` : `Pembayaran ${month} ditolak.`);
      return true;
    } catch (e) {
      setIuranRecords(prev => ({ ...prev, [nik]: { ...(prev[nik] || {}), [month]: before } }));
      showToast(`Tolak GAGAL. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A bendahara undoes a confirmed iuran month. Exact inverse of verifyIuran:
  // the month returns to `unpaid` and the vault it credited is debited.
  //
  // Bank-sourced rows are refused — that money never entered the vault through
  // this app, so debiting it here would invent a refund nobody paid out.
  const unverifyIuran = async (nik, month) => {
    const entry = iuranRecords[nik]?.[month];
    if (!entry || entry.status !== 'lunas') {
      showToast('Hanya iuran yang sudah lunas yang bisa dibatalkan.', 'error');
      return false;
    }
    if (entry.source === 'Laporan Uang Masuk') {
      showToast('Data ini dari laporan bank, bukan verifikasi aplikasi.', 'error');
      return false;
    }

    const vaultKey = entry.vault ?? vaultKeyForMethod(entry.method);
    const nominal = Number(entry.nominal) || 0;
    const before = entry;
    const reverted = {
      status: 'unpaid',
      nominal: 0,
      method: entry.method || '',
      date: entry.date || '',
      revertedBy: currentUser?.name || 'Bendahara',
      revertedAt: todayId(),
      revertedFrom: {
        status: entry.status,
        nominal: entry.nominal,
        method: entry.method || '',
        date: entry.date || '',
        verifiedBy: entry.verifiedBy || entry.markedBy || ''
      }
    };

    if (vaultKey && (vault[vaultKey] || 0) < nominal) {
      showToast(
        `Saldo kas tidak cukup untuk membatalkan ${rp(nominal)}.`,
        'error'
      );
      return false;
    }

    setIuranRecords(prev => ({
      ...prev,
      [nik]: { ...(prev[nik] || {}), [month]: reverted }
    }));
    if (vaultKey) setVault(v => ({ ...v, [vaultKey]: (v[vaultKey] || 0) - nominal }));

    try {
      await runTransaction(db, async (tx) => {
        const iuranRef = doc(db, 'iuran', nik);
        const vaultRef = doc(db, 'system', 'vault');
        const [iuranSnap, vaultSnap] = await Promise.all([tx.get(iuranRef), tx.get(vaultRef)]);

        const months = { ...(iuranSnap.exists() ? iuranSnap.data().months : {}) };
        const current = months[month];
        if (!current || current.status !== 'lunas') throw { code: 'not-lunas' };
        if (current.source === 'Laporan Uang Masuk') throw { code: 'bank' };

        const amount = Number(current.nominal) || 0;
        const cash = vaultKey && vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        if (vaultKey && cash < amount) throw { code: 'insufficient' };

        months[month] = {
          ...reverted,
          revertedFrom: { ...reverted.revertedFrom, nominal: current.nominal }
        };
        tx.set(iuranRef, { nik, months }, { merge: true });
        if (vaultKey) tx.set(vaultRef, { [vaultKey]: cash - amount }, { merge: true });
      });

      const name = users.find(u => u.nik === nik)?.name || nik;
      showToast(`Iuran ${month} a.n ${name} dibatalkan. Kas dikurangi ${rp(nominal)}.`);
      return true;
    } catch (e) {
      setIuranRecords(prev => ({ ...prev, [nik]: { ...(prev[nik] || {}), [month]: before } }));
      if (vaultKey) setVault(v => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + nominal }));
      showToast(
        e?.code === 'not-lunas'
          ? `Iuran ${month} sudah diubah pengurus lain. Muat ulang.`
          : `Pembatalan GAGAL. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // A bendahara confirms one queued installment: it moves into `paid`, the
  // card's status is recomputed, and the cash lands in the matching vault.
  const verifyInstallment = async (debtId, entryId) => {
    const debt = debts.find(d => d.id === debtId);
    const entry = debt?.pendingInstallments?.find(p => p.id === entryId);
    if (!entry) {
      showToast('Angsuran tidak ditemukan.', 'error');
      return false;
    }

    const vaultKey = vaultKeyForMethod(entry.method);
    const claimed = Number(entry.amount) || 0;
    if (claimed <= 0) {
      showToast('Nominal angsuran tidak valid. Tolak angsuran ini.', 'error');
      return false;
    }
    // Two queued claims can each fit inside the outstanding balance and still
    // total more than it, so the second verify would write `paid > amount` —
    // a shape the rules reject, leaving the entry unverifiable forever. Book
    // only what is still owed and report the excess; `applied` is what the
    // undo path reverses.
    const applied = Math.min(claimed, Math.max(0, Number(debt.amount || 0) - Number(debt.paid || 0)));
    if (applied <= 0) {
      showToast(`Kartu ${debt.name || debtId} sudah lunas. Tolak angsuran ini.`, 'error');
      return false;
    }
    const amt = applied;
    const name = debt.name || debtId;

    const before = debt;
    const verifiedBy = currentUser?.name || 'Bendahara';
    const verifiedAt = todayId();
    const record = { ...entry, verifiedBy, verifiedAt, vault: vaultKey, applied };

    // Optimistic update
    setDebts(prev => prev.map(d => {
      if (d.id !== debtId) return d;
      const newPaid = (d.paid || 0) + amt;
      const remaining = Math.max(0, d.amount - newPaid);
      return {
        ...d,
        paid: newPaid,
        status: remaining === 0 ? 'Lunas' : 'Sedang Mengangsur',
        pendingInstallments: (d.pendingInstallments || []).filter(p => p.id !== entryId),
        verifiedInstallments: [...(d.verifiedInstallments || []), record]
      };
    }));
    if (vaultKey) setVault(v => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + amt }));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', debtId);
        const vaultRef = doc(db, 'system', 'vault');
        const [debtSnap, vaultSnap] = await Promise.all([tx.get(debtRef), tx.get(vaultRef)]);
        if (!debtSnap.exists()) throw { code: 'not-found' };

        const d = debtSnap.data();
        const queue = d.pendingInstallments || [];
        const found = queue.find(p => p.id === entryId);
        if (!found) throw { code: 'not-found' };

        const booked = Math.min(Number(found.amount) || 0, Math.max(0, Number(d.amount || 0) - Number(d.paid || 0)));
        if (booked <= 0) throw { code: 'settled' };
        const newPaid = (d.paid || 0) + booked;
        const remaining = Math.max(0, d.amount - newPaid);

        tx.update(debtRef, {
          paid: newPaid,
          status: remaining === 0 ? 'Lunas' : 'Sedang Mengangsur',
          pendingInstallments: queue.filter(p => p.id !== entryId),
          verifiedInstallments: [...(d.verifiedInstallments || []), { ...found, verifiedBy, verifiedAt, vault: vaultKey, applied: booked }]
        });

        if (vaultKey) {
          const cash = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
          tx.set(vaultRef, { [vaultKey]: cash + booked }, { merge: true });
        }
      });

      showToast(
        claimed > amt
          ? `Angsuran ${name} ${rp(amt)} terverifikasi. Klaim ${rp(claimed)} melebihi sisa — ${rp(claimed - amt)} tidak dibukukan, kembalikan ke pramudi.`
          : `Angsuran ${name} ${rp(amt)} terverifikasi.`
      );
      return true;
    } catch (e) {
      setDebts(prev => prev.map(d => (d.id === debtId ? before : d)));
      if (vaultKey) setVault(v => ({ ...v, [vaultKey]: v[vaultKey] - amt }));
      showToast(
        e?.code === 'not-found'
          ? 'Angsuran sudah diproses pengurus lain. Muat ulang.'
          : e?.code === 'settled'
            ? 'Kartu ini sudah lunas di server. Tolak angsuran ini.'
            : `Verifikasi GAGAL. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // A bendahara undoes a confirmation this app recorded. Exact inverse of
  // verifyInstallment: the entry leaves the audit trail, `paid` falls back,
  // and the vault is debited by the same amount.
  const unverifyInstallment = async (debtId, entryId) => {
    const debt = debts.find(d => d.id === debtId);
    const entry = (debt?.verifiedInstallments || []).find(p => p.id === entryId);
    if (!entry) {
      showToast('Angsuran ini tidak punya riwayat verifikasi di aplikasi.', 'error');
      return false;
    }

    // `applied` is what the verify path actually booked; older records carry
    // only `amount`, which is the same figure for them.
    const vaultKey = entry.vault ?? vaultKeyForMethod(entry.method);
    const amt = Number(entry.applied ?? entry.amount) || 0;
    const before = debt;
    const statusFor = (amount, paid) => {
      if (paid >= amount) return 'Lunas';
      if (paid <= 0) return 'Belum Mengangsur';
      return 'Sedang Mengangsur';
    };

    if (vaultKey && (vault[vaultKey] || 0) < amt) {
      showToast(
        `Saldo kas tidak cukup untuk membatalkan ${rp(amt)}.`,
        'error'
      );
      return false;
    }

    setDebts(prev => prev.map(d => {
      if (d.id !== debtId) return d;
      const newPaid = Math.max(0, (d.paid || 0) - amt);
      return {
        ...d,
        paid: newPaid,
        status: statusFor(d.amount, newPaid),
        verifiedInstallments: (d.verifiedInstallments || []).filter(p => p.id !== entryId)
      };
    }));
    if (vaultKey) setVault(v => ({ ...v, [vaultKey]: (v[vaultKey] || 0) - amt }));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', debtId);
        const vaultRef = doc(db, 'system', 'vault');
        const [debtSnap, vaultSnap] = await Promise.all([tx.get(debtRef), tx.get(vaultRef)]);
        if (!debtSnap.exists()) throw { code: 'not-found' };

        const d = debtSnap.data();
        const list = d.verifiedInstallments || [];
        const found = list.find(p => p.id === entryId);
        if (!found) throw { code: 'not-recorded' };

        const booked = Number(found.applied ?? found.amount) || 0;
        const cash = vaultKey && vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        if (vaultKey && cash < booked) throw { code: 'insufficient' };

        const newPaid = Math.max(0, (d.paid || 0) - booked);
        tx.update(debtRef, {
          paid: newPaid,
          status: statusFor(d.amount, newPaid),
          verifiedInstallments: list.filter(p => p.id !== entryId)
        });
        if (vaultKey) tx.set(vaultRef, { [vaultKey]: cash - booked }, { merge: true });
      });

      showToast(`Verifikasi angsuran ${debt.name || debtId} ${rp(amt)} dibatalkan. Kas dikurangi.`);
      return true;
    } catch (e) {
      setDebts(prev => prev.map(d => (d.id === debtId ? before : d)));
      if (vaultKey) setVault(v => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + amt }));
      showToast(
        e?.code === 'not-recorded'
          ? 'Angsuran sudah dibatalkan pengurus lain. Muat ulang.'
          : `Pembatalan GAGAL. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // A bendahara rejects a queued installment. No money moves.
  const rejectInstallment = async (debtId, entryId) => {
    const debt = debts.find(d => d.id === debtId);
    const entry = debt?.pendingInstallments?.find(p => p.id === entryId);
    if (!entry) {
      showToast('Angsuran tidak ditemukan.', 'error');
      return false;
    }
    const before = debt;

    setDebts(prev => prev.map(d => (d.id === debtId
      ? { ...d, pendingInstallments: (d.pendingInstallments || []).filter(p => p.id !== entryId) }
      : d)));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', debtId);
        const snap = await tx.get(debtRef);
        if (!snap.exists()) throw { code: 'not-found' };
        const queue = snap.data().pendingInstallments || [];
        if (!queue.some(p => p.id === entryId)) throw { code: 'not-found' };
        tx.update(debtRef, { pendingInstallments: queue.filter(p => p.id !== entryId) });
      });

      showToast('Angsuran ditolak. Uang tidak dicatat.');
      return true;
    } catch (e) {
      setDebts(prev => prev.map(d => (d.id === debtId ? before : d)));
      showToast(`Tolak GAGAL. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A3: record an outgoing expense, debiting the chosen cash account.
  const addExpense = async (newExpense) => {
    const amount = Number(newExpense.amount);
    if (!amount || amount <= 0) {
      showToast('Nominal pengeluaran tidak valid.', 'error');
      return false;
    }

    const vaultKey = vaultKeyFor(newExpense.source);
    const id = `EXP-${Date.now()}`;

    // A talangan grows the card the cashier picked, never a name match. The
    // old heuristic attached the amount to the first driver whose name
    // contained the PIC text — and to `users[0]` whenever the PIC was blank,
    // because every string contains ''. The card id rides on the expense so
    // deleting it can take the amount back off.
    const relatedNik = newExpense.relatedNik || null;
    const relatedDebt = relatedNik
      ? debts.find(d => d.nik === relatedNik && d.amount - (d.paid || 0) > 0)
        || debts.find(d => d.nik === relatedNik)
      : null;
    const item = {
      ...newExpense,
      id,
      amount,
      ...(relatedDebt ? { relatedDebtId: relatedDebt.id } : {})
    };

    setExpenses(prev => [item, ...prev]);
    setVault(v => ({ ...v, [vaultKey]: v[vaultKey] - amount }));
    if (relatedDebt) {
      setDebts(prev => prev.map(d => (d.id === relatedDebt.id
        ? { ...d, amount: d.amount + amount, status: 'Sedang Mengangsur' }
        : d)));
    }

    try {
      await runTransaction(db, async (tx) => {
        const expRef = doc(db, 'expenses', id);
        const vaultRef = doc(db, 'system', 'vault');
        const vaultSnap = await tx.get(vaultRef);
        const current = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;

        tx.set(expRef, item);

        if (relatedDebt) {
          const debtRef = doc(db, 'debts', relatedDebt.id);
          const debtSnap = await tx.get(debtRef);
          if (debtSnap.exists()) {
            const d = debtSnap.data();
            const newAmount = (d.amount || 0) + amount;
            tx.update(debtRef, {
              amount: newAmount,
              status: newAmount - (d.paid || 0) <= 0 ? 'Lunas' : 'Sedang Mengangsur'
            });
          }
        }

        // Deliberately NOT clamped to zero: a real overdraft should show as a
        // negative balance rather than silently swallowing the difference.
        tx.set(vaultRef, { [vaultKey]: current - amount }, { merge: true });
      });

      showToast(`Pengeluaran ${rp(amount)} (${newExpense.title}) berhasil dicatat!`);
      return true;
    } catch (e) {
      setExpenses(prev => prev.filter(x => x.id !== id));
      setVault(v => ({ ...v, [vaultKey]: v[vaultKey] + amount }));
      if (relatedDebt) {
        setDebts(prev => prev.map(d => (d.id === relatedDebt.id
          ? { ...d, amount: d.amount - amount }
          : d)));
      }
      showToast(`Pengeluaran TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A3: delete an expense and refund the cash account it was drawn from.
  const deleteExpense = async (expense) => {
    const vaultKey = vaultKeyFor(expense.source);
    const amount = Number(expense.amount) || 0;

    // If this expense grew a talangan card, take the amount back off it in the
    // same transaction — otherwise the card keeps a debt the paguyuban has
    // already been paid back for.
    const linked = expense.relatedDebtId
      ? debts.find(d => d.id === expense.relatedDebtId)
      : null;

    // The card cannot end up smaller than the money already paid against it —
    // the rules refuse `paid > amount`. Refuse here with a reason instead of
    // letting the transaction fail after the cash refund was staged.
    if (linked && Number(linked.paid || 0) > Math.max(0, Number(linked.amount || 0) - amount)) {
      showToast(
        `Kartu ${linked.name} sudah dibayar ${rp(linked.paid)}. Hapus pengeluaran ini akan membuat sisa kartu lebih kecil dari pembayaran.`,
        'error'
      );
      return false;
    }

    const statusFor = (card) => {
      const paid = Number(card.paid) || 0;
      const left = Number(card.amount) || 0;
      if (left <= paid) return 'Lunas';
      if (paid <= 0) return 'Belum Mengangsur';
      return 'Sedang Mengangsur';
    };

    setExpenses(prev => prev.filter(x => x.id !== expense.id));
    setVault(v => ({ ...v, [vaultKey]: v[vaultKey] + amount }));
    if (linked) {
      setDebts(prev => prev.map(d => {
        if (d.id !== linked.id) return d;
        const next = { ...d, amount: Math.max(0, (d.amount || 0) - amount) };
        return { ...next, status: statusFor(next) };
      }));
    }

    try {
      await runTransaction(db, async (tx) => {
        const vaultRef = doc(db, 'system', 'vault');
        const vaultSnap = await tx.get(vaultRef);
        const current = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        tx.delete(doc(db, 'expenses', expense.id));

        if (linked) {
          const debtRef = doc(db, 'debts', linked.id);
          const debtSnap = await tx.get(debtRef);
          if (debtSnap.exists()) {
            const d = debtSnap.data();
            const next = { ...d, amount: Math.max(0, (d.amount || 0) - amount) };
            tx.update(debtRef, { amount: next.amount, status: statusFor(next) });
          }
        }

        tx.set(vaultRef, { [vaultKey]: current + amount }, { merge: true });
      });
      showToast(
        linked
          ? `Pengeluaran dihapus, ${rp(amount)} kembali ke kas dan kartu ${linked.name} disesuaikan.`
          : `Pengeluaran dihapus, ${rp(amount)} dikembalikan ke kas.`
      );
      return true;
    } catch (e) {
      setExpenses(prev => [expense, ...prev]);
      setVault(v => ({ ...v, [vaultKey]: v[vaultKey] - amount }));
      if (linked) setDebts(prev => prev.map(d => (d.id === linked.id ? linked : d)));
      showToast(`Gagal menghapus. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A4: admin records a new talangan / loan.
  const addDebt = async ({ nik, incident, amount, tenor = '1 BULAN', body = 'Armada EV Cawang' }) => {
    const nominal = Number(amount);
    const user = users.find(u => u.nik === nik);
    if (!user) {
      showToast('Pramudi tidak ditemukan.', 'error');
      return false;
    }
    if (!nominal || nominal <= 0) {
      showToast('Nominal talangan tidak valid.', 'error');
      return false;
    }

    const id = `DEBT-${Date.now()}`;
    const item = {
      id,
      nik,
      name: user.name,
      incident: incident || 'Talangan Operasional Jalur',
      startDate: todayId(),
      tenor,
      amount: nominal,
      paid: 0,
      status: 'Belum Mengangsur',
      body,
      disbursedBy: currentUser?.name || 'Bendahara'
    };

    setDebts(prev => [item, ...prev]);
    setVault(v => ({ ...v, bsiBalance: (v.bsiBalance || 0) - nominal }));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', id);
        const vaultRef = doc(db, 'system', 'vault');
        const vaultSnap = await tx.get(vaultRef);
        const cash = vaultSnap.exists() ? (vaultSnap.data().bsiBalance || 0) : 0;
        tx.set(debtRef, item);
        tx.set(vaultRef, { bsiBalance: cash - nominal }, { merge: true });
      });
      showToast(`Talangan ${rp(nominal)} untuk ${user.name} dicatat.`);
      return true;
    } catch (e) {
      setDebts(prev => prev.filter(d => d.id !== id));
      setVault(v => ({ ...v, bsiBalance: (v.bsiBalance || 0) + nominal }));
      showToast(`Talangan TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A4: discard a receivable card entirely (admin correction only).
  const deleteDebt = async (debtId) => {
    const before = debts.find(d => d.id === debtId);
    if (!before) return false;

    // A card with money against it is a financial record, not a typo: verified
    // installments have already credited the vault, and a queued entry is
    // someone's receipt. Deleting either erases the only trace of the money.
    const paid = Number(before.paid) || 0;
    const hasInstallments = (before.verifiedInstallments || []).length > 0
      || (before.pendingInstallments || []).length > 0;
    if (paid > 0 || hasInstallments) {
      showToast('Kartu ini sudah ada angsuran. Batalkan verifikasinya dulu, kartu tidak bisa dihapus.', 'error');
      return false;
    }

    setDebts(prev => prev.filter(d => d.id !== debtId));
    try {
      await deleteDoc(doc(db, 'debts', debtId));
      showToast(`Kartu piutang ${before.name} dihapus.`);
      return true;
    } catch (e) {
      setDebts(prev => [before, ...prev]);
      showToast(`Gagal menghapus kartu piutang. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A5: move a report between board columns / reassign the mechanic.
  const updateIncidentStatus = async (incidentId, newStatus, newMechanic) => {
    const before = incidents.find(i => i.id === incidentId);
    if (!before) return false;

    const status = newStatus || before.status;
    const mechanic = newMechanic || before.mechanic;
    if (status === before.status && mechanic === before.mechanic) return true;

    setIncidents(prev => prev.map(i => (i.id === incidentId ? { ...i, status, mechanic } : i)));

    try {
      await setDoc(doc(db, 'incidents', incidentId), { ...before, status, mechanic }, { merge: true });
      showToast('Status logbook armada diperbarui!');
      return true;
    } catch (e) {
      setIncidents(prev => prev.map(i => (i.id === incidentId ? before : i)));
      showToast(`Status TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A5: discard a report entirely.
  const deleteIncident = async (incidentId) => {
    const before = incidents.find(i => i.id === incidentId);
    if (!before) return false;

    setIncidents(prev => prev.filter(i => i.id !== incidentId));
    try {
      await deleteDoc(doc(db, 'incidents', incidentId));
      showToast(`Laporan ${before.id} dihapus.`);
      return true;
    } catch (e) {
      setIncidents(prev => [before, ...prev]);
      showToast(`Gagal menghapus laporan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  /* ---------------------------------------------------------------- *
   * MEMBER / ROSTER MANAGEMENT
   *
   * Members are never hard-deleted. A driver with a debt card or a
   * settled iuran history is part of the paguyuban's financial record,
   * and removing the roster entry would orphan that money. Deactivation
   * is the only "delete" this app performs.
   * ---------------------------------------------------------------- */

  const PIN_DIGITS = 4;

  // Normalise and validate a roster entry. Returns { ok } or { ok:false, error }.
  const validateMember = (fields, { isEdit = false, ignoreNik = null } = {}) => {
    const nik = String(fields.nik || '').trim();
    const name = String(fields.name || '').trim();
    const pin = fields.pin === undefined || fields.pin === null ? '' : String(fields.pin).trim();

    if (!nik) return { ok: false, error: 'NIK wajib diisi.' };
    if (!/^\d+$/.test(nik)) return { ok: false, error: 'NIK hanya boleh berisi angka.' };
    if (nik.length < 6 || nik.length > 16) return { ok: false, error: 'NIK harus 6–16 digit.' };
    if (!name) return { ok: false, error: 'Nama pramudi wajib diisi.' };
    if (name.length < 2) return { ok: false, error: 'Nama terlalu pendek.' };
    if (pin && !new RegExp(`^\\d{${PIN_DIGITS}}$`).test(pin)) {
      return { ok: false, error: `PIN harus tepat ${PIN_DIGITS} angka.` };
    }

    if (!isEdit) {
      const taken = users.some(u => u.nik === nik && u.nik !== ignoreNik);
      if (taken) return { ok: false, error: `NIK ${nik} sudah terdaftar.` };
    }

    return { ok: true, nik, name, pin };
  };

  // A6: register a new pramudi.
  const addMember = async (fields) => {
    const v = validateMember(fields);
    if (!v.ok) {
      showToast(v.error, 'error');
      return false;
    }

    const item = {
      nik: v.nik,
      name: v.name,
      role: fields.role === 'admin' ? 'admin' : 'member',
      position: String(fields.position || '').trim() || 'Pramudi EV 50 Cawang',
      status: 'active',
      // Only persist an explicit PIN. Leaving it empty keeps the documented
      // last-4-of-NIK default so existing accounts are unaffected.
      ...(v.pin ? { pin: v.pin } : {}),
      createdAt: todayId(),
      createdBy: currentUser?.name || 'Pengurus'
    };

    // Optimistic insert at the top so the roster reflects the tap at once.
    setUsers(prev => [item, ...prev]);

    try {
      await setDoc(doc(db, 'users', item.nik), item);
      showToast(`${item.name} ditambahkan ke daftar pramudi (NIK ${item.nik}).`);
      return true;
    } catch (e) {
      setUsers(prev => prev.filter(u => u.nik !== item.nik));
      showToast(`Pramudi TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A6: edit name, position, role, or reset the PIN.
  const updateMember = async (nik, fields) => {
    const before = users.find(u => u.nik === nik);
    if (!before) return false;

    const v = validateMember({ ...before, ...fields, nik }, { isEdit: true, ignoreNik: nik });
    if (!v.ok) {
      showToast(v.error, 'error');
      return false;
    }

    // An empty PIN means "leave it as it is", not "clear it".
    const role = (fields.role ?? before.role) === 'admin' ? 'admin' : 'member';
    // Demoting the last admin is the same lockout as deactivating them, and
    // this path never had that guard.
    if (before.role === 'admin' && role !== 'admin' && before.status !== 'inactive') {
      const adminsLeft = users.filter(
        u => u.role === 'admin' && u.status !== 'inactive' && u.nik !== nik
      );
      if (adminsLeft.length === 0) {
        showToast('Tidak bisa menurunkan admin terakhir. Angkat pengurus lain dulu.', 'error');
        return false;
      }
    }
    const patch = {
      name: v.name,
      position: String(fields.position ?? before.position ?? '').trim(),
      role,
      ...(v.pin ? { pin: v.pin } : {})
    };

    const next = { ...before, ...patch };
    setUsers(prev => prev.map(u => (u.nik === nik ? next : u)));

    try {
      await setDoc(doc(db, 'users', nik), patch, { merge: true });
      showToast(`Data ${patch.name} diperbarui.`);
      return true;
    } catch (e) {
      setUsers(prev => prev.map(u => (u.nik === nik ? before : u)));
      showToast(`Perubahan TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A6: deactivate without deleting, preserving the financial history.
  const setMemberActive = async (nik, active) => {
    const before = users.find(u => u.nik === nik);
    if (!before) return false;

    // The last active admin must never be locked out of their own system.
    const adminsLeft = users.filter(
      u => u.role === 'admin' && u.status !== 'inactive' && u.nik !== nik
    );
    if (!active && before.role === 'admin' && adminsLeft.length === 0) {
      showToast('Tidak bisa menonaktifkan admin terakhir.', 'error');
      return false;
    }

    const status = active ? 'active' : 'inactive';
    setUsers(prev => prev.map(u => (u.nik === nik ? { ...u, status } : u)));

    try {
      await setDoc(doc(db, 'users', nik), { status }, { merge: true });
      showToast(
        active
          ? `${before.name} diaktifkan kembali.`
          : `${before.name} dinonaktifkan. Riwayat keuangannya tetap tersimpan.`
      );
      return true;
    } catch (e) {
      setUsers(prev => prev.map(u => (u.nik === nik ? before : u)));
      showToast(`Status TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  /* ---------------------------------------------------------------- *
   * Emergency contacts — the route dispatch list
   * ---------------------------------------------------------------- */

  // Blank is a meaningful state here, not an omission. A contact whose number
  // is still unknown stays on the list (badged in the panel) so the roster
  // stays whole and the gap stays visible. Digits that are typed but do not
  // normalise are REFUSED: a number that looks complete but cannot be dialled
  // is worse than an obvious blank, because nobody finds out until they are
  // standing beside a broken bus.
  const validateContact = ({ name, phone, route }) => {
    const cleanName = String(name || '').trim();
    if (!cleanName) return { ok: false, error: 'Nama kontak wajib diisi.' };

    const routeKey = String(route || '').trim();
    if (!routeKey) return { ok: false, error: 'Pilih rute kontak.' };

    const typed = String(phone || '').trim();
    const normalized = normalizePhone(typed);
    if (typed && !normalized) {
      return {
        ok: false,
        error: 'Nomor tidak lengkap atau tidak valid. Pakai nomor HP Indonesia utuh, mis. 081234567890.'
      };
    }

    return { ok: true, name: cleanName, phone: normalized, route: routeKey };
  };

  const addContact = async (fields) => {
    const v = validateContact(fields);
    if (!v.ok) {
      showToast(v.error, 'error');
      return false;
    }

    const id = `CONTACT-${Date.now()}`;
    const item = { id, name: v.name, phone: v.phone, route: v.route };

    setEmergencyContacts(prev => [...prev, item]);
    try {
      await setDoc(doc(db, 'emergencyContacts', id), item);
      showToast(`${v.name} ditambahkan ke kontak darurat.`);
      return true;
    } catch (e) {
      setEmergencyContacts(prev => prev.filter(c => c.id !== id));
      showToast(`Gagal menyimpan kontak. ${fsError(e)}`, 'error');
      return false;
    }
  };

  const updateContact = async (id, fields) => {
    const before = emergencyContacts.find(c => c.id === id);
    if (!before) return false;

    const v = validateContact({ ...before, ...fields });
    if (!v.ok) {
      showToast(v.error, 'error');
      return false;
    }

    const item = { ...before, name: v.name, phone: v.phone, route: v.route };
    setEmergencyContacts(prev => prev.map(c => (c.id === id ? item : c)));
    try {
      await setDoc(doc(db, 'emergencyContacts', id), item);
      showToast('Kontak diperbarui.');
      return true;
    } catch (e) {
      setEmergencyContacts(prev => prev.map(c => (c.id === id ? before : c)));
      showToast(`Gagal memperbarui kontak. ${fsError(e)}`, 'error');
      return false;
    }
  };

  const deleteContact = async (id) => {
    const before = emergencyContacts.find(c => c.id === id);
    if (!before) return false;

    setEmergencyContacts(prev => prev.filter(c => c.id !== id));
    try {
      await deleteDoc(doc(db, 'emergencyContacts', id));
      showToast(`${before.name} dihapus dari kontak darurat.`);
      return true;
    } catch (e) {
      setEmergencyContacts(prev => [...prev, before]);
      showToast(`Gagal menghapus kontak. ${fsError(e)}`, 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated,
      loginWithNik,
      logout,
      role, setRole,
      activeNik, setActiveNik,
      currentUser,
      users,
      debts,
      expenses,
      vault,
      iuranRecords,
      incidents,
      toast,
      showToast,
      payIuran,
      repayDebt,
      addIncident,
      // Admin / kasir
      markIuranPaidCash,
      // Payment verification — the only paths that credit the vault
      verifyIuran,
      rejectIuran,
      unverifyIuran,
      verifyInstallment,
      rejectInstallment,
      unverifyInstallment,
      addExpense,
      deleteExpense,
      addDebt,
      deleteDebt,
      updateIncidentStatus,
      deleteIncident,
      // Member / roster management
      addMember,
      updateMember,
      setMemberActive,
      // Emergency contacts — route dispatch list
      emergencyContacts,
      addContact,
      updateContact,
      deleteContact
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
