import React, { createContext, useContext, useState, useEffect } from 'react';
import seedData from '../data/seedData.json';
import { db } from '../services/firebase';
import { collection, doc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';

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
  const payIuran = async (nik, months, method = 'Midtrans QRIS') => {
    if (!months?.length) return false;

    const total = months.length * IURAN_FEE;
    const today = todayId();
    const payment = { status: 'lunas', nominal: IURAN_FEE, date: today, method };

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
      addIncident
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
