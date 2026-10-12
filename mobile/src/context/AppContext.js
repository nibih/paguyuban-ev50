import React, { createContext, useContext, useState, useEffect } from 'react';
import seedData from '../data/seedData.json';
import { db } from '../services/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, runTransaction } from 'firebase/firestore';

const AppContext = createContext();

// Human-readable messages for the Firestore codes we actually hit in the field.
const FS_MESSAGES = {
  'permission-denied': 'Server menolak tulisan (cek Security Rules).',
  'unavailable': 'Server tidak terjangkau. Coba lagi saat sinyal kembali.',
  'cancelled': 'Permintaan dibatalkan.',
  'deadline-exceeded': 'Koneksi terlalu lambat, transaksi dibatalkan.',
};

const fsError = (e) => FS_MESSAGES[e?.code] || e?.message || 'Gagal menyinkronkan ke server.';

// Iuran fee per driver per month; single source of truth for the record shape.
const IURAN_FEE = 100000;

const todayId = () => new Date().toLocaleDateString('id-ID');

// Loose name normalisation for matching a free-text PIC field to a driver.
const normName = (s) => String(s || '')
  .toLowerCase()
  .replace(/[^a-z ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const AppProvider = ({ children }) => {
  // Authentication & active driver
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState('member'); // 'member' or 'admin'
  const [activeNik, setActiveNik] = useState('17001137'); // A Sutriadi default
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
      };
    } catch (e) {
      console.log('Using local state cache');
    }
  }, []);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
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
    if (pin !== undefined && pin !== null && String(pin) !== expected) {
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

  const currentUser = users.find(u => u.nik === (role === 'admin' ? '17001589' : activeNik)) || users[0];

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
      ...(receipt?.base64 ? { receipt: receipt.base64 } : {})
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
        months.forEach(m => { monthsMap[m] = payment; });
        tx.set(iuranRef, { nik, months: monthsMap }, { merge: true });
      });

      showToast(`Iuran ${months.join(', ')} dicatat menunggu verifikasi bendahara.`);
      return true;
    } catch (e) {
      // Roll back the optimistic write so state matches the server again.
      setIuranRecords(prev => ({ ...prev, [nik]: prevForNik }));
      showToast(`Iuran TIDAK tersimpan. ${fsError(e)}`, 'error');
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

    const vaultKey = method.includes('Cash') ? 'pettyCash' : 'bsiBalance';
    const before = debts.find(d => d.id === debtId);
    if (!before) {
      showToast('Kartu utang tidak ditemukan.', 'error');
      return false;
    }

    // Guard against overpayment against the CONFIRMED total. Pending
    // installments are excluded: unverified claims must not reserve money.
    const outstanding = before.amount - before.paid;
    if (amt > outstanding) {
      showToast(`Setoran melebihi sisa hutang (Rp${outstanding.toLocaleString('id-ID')}).`, 'error');
      return false;
    }

    const entry = {
      id: `INS-${Date.now().toString().slice(-6)}`,
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

      showToast(`Cicilan Rp${amt.toLocaleString('id-ID')} menunggu verifikasi bendahara.`);
      return true;
    } catch (e) {
      setDebts(prev => prev.map(d => (d.id === debtId ? { ...d, pendingInstallments: pendingBefore } : d)));
      showToast(
        e?.code === 'overpaid'
          ? 'Sisa hutang berubah — muat ulang dan periksa kembali.'
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
      id: `INC-${Date.now().toString().slice(-4)}`,
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

  const vaultKeyFor = (source) => (source.includes('Kas Kecil') ? 'pettyCash' : 'bsiBalance');

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
        // Refuse to queue twice, and never touch a month already confirmed.
        if (months[month]?.status === 'lunas') throw { code: 'already-paid' };
        if (months[month]?.status === 'pending') throw { code: 'already-pending' };

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
            : `Iuran TIDAK tersimpan. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // ---------------------------------------------------------------- *
   * PAYMENT VERIFICATION
   *
   * These are now the ONLY functions that move money into the vault from
   * a payment. Nothing else credits it: `payIuran`, `repayDebt` and
   * `markIuranPaidCash` all stop at `pending`.
   *
   * Why this exists: every payment made through the app before 12 Oct 2026
   * was a test tap, none was checked against the bank, and the taps had
   * already become financial history — Rp1.200.000 of iuran marked lunas
   * and a vault that no longer matched the BSI statement. A button press is
   * a claim about money, not proof of it.
   * ---------------------------------------------------------------- */

  // Which vault a confirmed payment belongs to. Cash handed to the cashier
  // lives in the tin; anything arriving through the bank lives in BSI.
  const vaultKeyForMethod = (method) => (
    (method || '').includes('Tunai') ? 'pettyCash' : 'bsiBalance'
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
    setVault(v => ({ ...v, [vaultKey]: v[vaultKey] + nominal }));

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

        const cash = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        tx.set(vaultRef, { [vaultKey]: cash + nominal }, { merge: true });
      });

      const name = users.find(u => u.nik === nik)?.name || nik;
      showToast(`Iuran ${month} a.n ${name} terverifikasi (+Rp${nominal.toLocaleString('id-ID')}).`);
      return true;
    } catch (e) {
      setIuranRecords(prev => {
        const months = { ...(prev[nik] || {}) };
        if (before) months[month] = before;
        return { ...prev, [nik]: months };
      });
      setVault(v => ({ ...v, [vaultKey]: v[vaultKey] - nominal }));
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
    const amt = Number(entry.amount);
    const name = debt.name || debtId;

    const before = debt;

    // Optimistic update
    setDebts(prev => prev.map(d => {
      if (d.id !== debtId) return d;
      const newPaid = (d.paid || 0) + amt;
      const remaining = Math.max(0, d.amount - newPaid);
      return {
        ...d,
        paid: newPaid,
        status: remaining === 0 ? 'Lunas' : 'Sedang Mengangsur',
        pendingInstallments: (d.pendingInstallments || []).filter(p => p.id !== entryId)
      };
    }));
    setVault(v => ({ ...v, [vaultKey]: v[vaultKey] + amt }));

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

        const newPaid = (d.paid || 0) + found.amount;
        const remaining = Math.max(0, d.amount - newPaid);

        tx.update(debtRef, {
          paid: newPaid,
          status: remaining === 0 ? 'Lunas' : 'Sedang Mengangsur',
          pendingInstallments: queue.filter(p => p.id !== entryId)
        });

        const cash = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        tx.set(vaultRef, { [vaultKey]: cash + found.amount }, { merge: true });
      });

      showToast(`Angsuran ${name} Rp${amt.toLocaleString('id-ID')} terverifikasi.`);
      return true;
    } catch (e) {
      setDebts(prev => prev.map(d => (d.id === debtId ? before : d)));
      setVault(v => ({ ...v, [vaultKey]: v[vaultKey] - amt }));
      showToast(
        e?.code === 'not-found'
          ? 'Angsuran sudah diproses pengurus lain. Muat ulang.'
          : `Verifikasi GAGAL. ${fsError(e)}`,
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

    const vaultKey = vaultKeyFor(newExpense.source || 'Kas Kecil');
    const id = `EXP-${Date.now().toString().slice(-6)}`;
    const item = { ...newExpense, id, amount };

    // Find a debtor when this is a talangan, so the debt card grows with it.
    const relatedNik = newExpense.relatedNik
      || users.find(u => normName(u.name).includes(normName(newExpense.pic || '')))?.nik;
    const relatedDebt = relatedNik ? debts.find(d => d.nik === relatedNik) : null;

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

      showToast(`Pengeluaran Rp${amount.toLocaleString('id-ID')} (${newExpense.title}) berhasil dicatat!`);
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
    const vaultKey = vaultKeyFor(expense.source || 'Kas Kecil');
    const amount = Number(expense.amount) || 0;

    setExpenses(prev => prev.filter(x => x.id !== expense.id));
    setVault(v => ({ ...v, [vaultKey]: v[vaultKey] + amount }));

    try {
      await runTransaction(db, async (tx) => {
        const vaultRef = doc(db, 'system', 'vault');
        const vaultSnap = await tx.get(vaultRef);
        const current = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        tx.delete(doc(db, 'expenses', expense.id));
        tx.set(vaultRef, { [vaultKey]: current + amount }, { merge: true });
      });
      showToast(`Pengeluaran dihapus, Rp${amount.toLocaleString('id-ID')} dikembalikan ke kas.`);
      return true;
    } catch (e) {
      setExpenses(prev => [expense, ...prev]);
      setVault(v => ({ ...v, [vaultKey]: v[vaultKey] - amount }));
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

    const id = `DEBT-${Date.now().toString().slice(-6)}`;
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
    setVault(v => ({ ...v, pettyCash: v.pettyCash - nominal }));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', id);
        const vaultRef = doc(db, 'system', 'vault');
        const vaultSnap = await tx.get(vaultRef);
        const cash = vaultSnap.exists() ? (vaultSnap.data().pettyCash || 0) : 0;
        tx.set(debtRef, item);
        tx.set(vaultRef, { pettyCash: cash - nominal }, { merge: true });
      });
      showToast(`Talangan Rp${nominal.toLocaleString('id-ID')} untuk ${user.name} dicatat.`);
      return true;
    } catch (e) {
      setDebts(prev => prev.filter(d => d.id !== id));
      setVault(v => ({ ...v, pettyCash: v.pettyCash + nominal }));
      showToast(`Talangan TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A4: discard a receivable card entirely (admin correction only).
  const deleteDebt = async (debtId) => {
    const before = debts.find(d => d.id === debtId);
    if (!before) return false;

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
    const patch = {
      name: v.name,
      position: String(fields.position ?? before.position ?? '').trim(),
      role: (fields.role ?? before.role) === 'admin' ? 'admin' : 'member',
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
      verifyInstallment,
      rejectInstallment,
      addExpense,
      deleteExpense,
      addDebt,
      deleteDebt,
      updateIncidentStatus,
      deleteIncident,
      // Member / roster management
      addMember,
      updateMember,
      setMemberActive
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
