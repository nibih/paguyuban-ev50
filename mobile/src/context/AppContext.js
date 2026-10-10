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

      return () => {
        unsubVault();
        unsubDebts();
        unsubExpenses();
        unsubIuran();
        unsubIncidents();
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

  const loginWithNik = (nik) => {
    const user = users.find(u => u.nik === nik);
    if (!user) return false;
    setActiveNik(nik);
    setRole(user.role === 'admin' ? 'admin' : 'member');
    setIsAuthenticated(true);
    showToast(`Selamat datang, ${user.name}! (${user.position || user.role})`);
    return true;
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
  const payIuran = async (nik, months, method = 'Midtrans QRIS', receipt = null) => {
    if (!months?.length) return false;

    const total = months.length * IURAN_FEE;
    const today = todayId();
    // `receipt` is an optional base64 thumbnail of the bank transfer proof,
    // stored inline because the project has no Cloud Storage bucket.
    const payment = {
      status: 'lunas',
      nominal: IURAN_FEE,
      date: today,
      method,
      ...(receipt?.base64 ? { receipt: receipt.base64 } : {})
    };

    const prevForNik = iuranRecords[nik] || {};

    // Optimistic update
    setIuranRecords(prev => {
      const userRec = { ...(prev[nik] || {}) };
      months.forEach(m => { userRec[m] = payment; });
      return { ...prev, [nik]: userRec };
    });
    setVault(v => ({ ...v, bsiBalance: v.bsiBalance + total }));

    try {
      await runTransaction(db, async (tx) => {
        const iuranRef = doc(db, 'iuran', nik);
        const vaultRef = doc(db, 'system', 'vault');

        const [iuranSnap, vaultSnap] = await Promise.all([
          tx.get(iuranRef), tx.get(vaultRef)
        ]);

        const monthsMap = { ...(iuranSnap.exists() ? iuranSnap.data().months : {}) };
        months.forEach(m => { monthsMap[m] = payment; });
        tx.set(iuranRef, { nik, months: monthsMap }, { merge: true });

        const currentBsi = vaultSnap.exists() ? (vaultSnap.data().bsiBalance || 0) : 0;
        tx.set(vaultRef, { bsiBalance: currentBsi + total }, { merge: true });
      });

      showToast(`Pembayaran iuran ${months.join(', ')} berhasil disinkronisasi ke Kas BSI!`);
      return true;
    } catch (e) {
      // Roll back the optimistic write so state matches the server again.
      setIuranRecords(prev => ({ ...prev, [nik]: prevForNik }));
      setVault(v => ({ ...v, bsiBalance: v.bsiBalance - total }));
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

    // Guard against overpayment before touching anything.
    const outstanding = before.amount - before.paid;
    if (amt > outstanding) {
      showToast(`Setoran melebihi sisa hutang (Rp${outstanding.toLocaleString('id-ID')}).`, 'error');
      return false;
    }

    // Optimistic update
    setDebts(prev => prev.map(d => {
      if (d.id !== debtId) return d;
      const newPaid = d.paid + amt;
      const newRemaining = Math.max(0, d.amount - newPaid);
      return {
        ...d,
        paid: newPaid,
        status: newRemaining === 0 ? 'Lunas' : 'Sedang Mengangsur'
      };
    }));
    setVault(v => ({ ...v, [vaultKey]: v[vaultKey] + amt }));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', debtId);
        const vaultRef = doc(db, 'system', 'vault');

        const [debtSnap, vaultSnap] = await Promise.all([
          tx.get(debtRef), tx.get(vaultRef)
        ]);
        if (!debtSnap.exists()) throw { code: 'not-found' };

        const d = debtSnap.data();
        const newPaid = (d.paid || 0) + amt;
        const newRemaining = Math.max(0, d.amount - newPaid);

        tx.update(debtRef, {
          paid: newPaid,
          status: newRemaining === 0 ? 'Lunas' : 'Sedang Mengangsur'
        });

        const currentVault = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        tx.set(vaultRef, { [vaultKey]: currentVault + amt }, { merge: true });
      });

      showToast(`Setoran cicilan Rp${amt.toLocaleString('id-ID')} berhasil dicatat!`);
      return true;
    } catch (e) {
      // Roll back so the progress bar doesn't show a payment that failed.
      setDebts(prev => prev.map(d => (d.id === debtId ? before : d)));
      setVault(v => ({ ...v, [vaultKey]: v[vaultKey] - amt }));
      showToast(`Cicilan TIDAK tersimpan. ${fsError(e)}`, 'error');
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
  const markIuranPaidCash = async (nik, month) => {
    const fee = IURAN_FEE;
    const payment = {
      status: 'lunas',
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
    setVault(v => ({ ...v, pettyCash: v.pettyCash + fee }));

    try {
      await runTransaction(db, async (tx) => {
        const iuranRef = doc(db, 'iuran', nik);
        const vaultRef = doc(db, 'system', 'vault');
        const [iuranSnap, vaultSnap] = await Promise.all([tx.get(iuranRef), tx.get(vaultRef)]);

        const months = { ...(iuranSnap.exists() ? iuranSnap.data().months : {}) };
        // Refuse to double-count: if already lunas on the server, stop.
        if (months[month]?.status === 'lunas') throw { code: 'already-paid' };

        months[month] = payment;
        tx.set(iuranRef, { nik, months }, { merge: true });

        const cash = vaultSnap.exists() ? (vaultSnap.data().pettyCash || 0) : 0;
        tx.set(vaultRef, { pettyCash: cash + fee }, { merge: true });
      });

      const name = users.find(u => u.nik === nik)?.name || nik;
      showToast(`Iuran ${month} a.n ${name} ditandai Lunas Tunai (+Rp${fee.toLocaleString('id-ID')})`);
      return true;
    } catch (e) {
      setIuranRecords(prev => {
        const months = { ...(prev[nik] || {}) };
        if (before) months[month] = before; else delete months[month];
        return { ...prev, [nik]: months };
      });
      setVault(v => ({ ...v, pettyCash: v.pettyCash - fee }));
      showToast(
        e?.code === 'already-paid'
          ? `Iuran ${month} sudah lunas tercatat di server.`
          : `Iuran TIDAK tersimpan. ${fsError(e)}`,
        'error'
      );
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
      addExpense,
      deleteExpense,
      addDebt,
      deleteDebt,
      updateIncidentStatus,
      deleteIncident
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
