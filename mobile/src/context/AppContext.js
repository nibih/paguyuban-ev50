import React, { createContext, useContext, useState, useEffect } from 'react';
import seedData from '../data/seedData.json';
import { db } from '../services/firebase';
import { collection, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Authentication & active driver
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState('member'); // 'member' or 'admin'
  const [activeNik, setActiveNik] = useState('17001137'); // A Sutriadi default
  const [users, setUsers] = useState(seedData.users);
  const [debts, setDebts] = useState(seedData.debts);
  const [expenses, setExpenses] = useState(seedData.expenses);
  const [vault, setVault] = useState(seedData.vault);
  
  // Iuran Records (Month tracking for 126 drivers)
  const [iuranRecords, setIuranRecords] = useState({
    "17001137": {
      Mei: { status: "lunas", nominal: 100000, date: "02/05/2026", method: "Transfer BSI" },
      Juni: { status: "lunas", nominal: 100000, date: "03/06/2026", method: "Transfer BSI" },
      Juli: { status: "lunas", nominal: 100000, date: "01/07/2026", method: "Transfer BSI" },
      Agustus: { status: "lunas", nominal: 100000, date: "05/08/2026", method: "Transfer BSI" },
      September: { status: "lunas", nominal: 100000, date: "02/09/2026", method: "Midtrans QRIS" }
    },
    "17001504": {
      Mei: { status: "unpaid", nominal: 0 },
      Juni: { status: "unpaid", nominal: 0 },
      Juli: { status: "unpaid", nominal: 0 },
      Agustus: { status: "unpaid", nominal: 0 },
      September: { status: "unpaid", nominal: 0 }
    }
  });

  // Incidents & Damage Logbook
  const [incidents, setIncidents] = useState([
    {
      id: "INC-01",
      body: "Body 248",
      driver: "A Sutriadi",
      nik: "17001137",
      damage: "Bemper kanan baret kena trotoar",
      date: "02/09/2026",
      status: "Selesai",
      mechanic: "Mekanik KLI",
      suketStatus: "Tidak Perlu Suket",
      notes: "Sudah diperbaiki stiker biru KLI."
    },
    {
      id: "INC-02",
      body: "Body 270",
      driver: "M. Hasan",
      nik: "17001109",
      damage: "Serempetan laka lantas Tol JORR",
      date: "04/09/2026",
      status: "Sedang Dikerjakan Mekanik",
      mechanic: "Mekanik KLI",
      suketStatus: "Suket Selesai (Biaya Rp500.000)",
      notes: "Klaim laka Polres proses."
    }
  ]);

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
  const payIuran = (nik, months, method = 'Midtrans QRIS') => {
    const total = months.length * 100000;
    const today = new Date().toLocaleDateString('id-ID');
    setIuranRecords(prev => {
      const userRec = { ...(prev[nik] || {}) };
      months.forEach(m => {
        userRec[m] = { status: 'lunas', nominal: 100000, date: today, method };
      });
      return { ...prev, [nik]: userRec };
    });
    setVault(v => ({ ...v, bsiBalance: v.bsiBalance + total }));
    showToast(`Pembayaran iuran ${months.join(', ')} berhasil disinkronisasi ke Kas BSI!`);
  };

  // Record Installment
  const repayDebt = (debtId, amount, method = 'Cash ke Admin') => {
    const amt = Number(amount);
    setDebts(prev => prev.map(d => {
      if (d.id === debtId) {
        const newPaid = d.paid + amt;
        const newRemaining = Math.max(0, d.amount - newPaid);
        return {
          ...d,
          paid: newPaid,
          status: newRemaining === 0 ? 'Lunas' : 'Sedang Mengangsur'
        };
      }
      return d;
    }));

    if (method.includes('Cash')) {
      setVault(v => ({ ...v, pettyCash: v.pettyCash + amt }));
    } else {
      setVault(v => ({ ...v, bsiBalance: v.bsiBalance + amt }));
    }
    showToast(`Setoran cicilan Rp${amt.toLocaleString('id-ID')} berhasil dicatat!`);
  };

  // Submit Damage Report
  const addIncident = (newInc) => {
    const item = {
      ...newInc,
      id: `INC-${Date.now().toString().slice(-4)}`,
      date: new Date().toLocaleDateString('id-ID'),
      status: 'Laporan Baru Masuk',
      mechanic: newInc.needMechanic ? 'Mekanik KLI' : 'Belum Ditugaskan'
    };
    setIncidents(prev => [item, ...prev]);
    showToast('Laporan perbaikan berhasil dikirim ke Pengurus & Mekanik!');
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
