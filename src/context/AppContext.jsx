import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  INITIAL_USERS, 
  INITIAL_IURAN, 
  INITIAL_EXPENSES, 
  INITIAL_DEBTS, 
  INITIAL_INCIDENTS,
  MONTHS
} from '../data/initialData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Role & current user: 'member' or 'admin'
  const [role, setRole] = useState('member'); // default member
  const [activeNik, setActiveNik] = useState('17001137'); // A Sutriadi by default
  const [isMobileFrame, setIsMobileFrame] = useState(true); // for member view frame
  const [memberTab, setMemberTab] = useState('M1'); // M1, M2, M3, M4, M5
  const [adminTab, setAdminTab] = useState('A1'); // A1, A2, A3, A4, A5
  const [toast, setToast] = useState(null);

  // Core Data Stores
  const [users, setUsers] = useState(INITIAL_USERS);
  const [iuranRecords, setIuranRecords] = useState(INITIAL_IURAN);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [debts, setDebts] = useState(INITIAL_DEBTS);
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);

  // Vault Cash Accounts
  // Petty cash balance: Rp131.500 calculated from formula or state
  const [bsiBalance, setBsiBalance] = useState(12450000);
  const [pettyCash, setPettyCash] = useState(131500);

  const currentUser = users.find(u => u.nik === (role === 'admin' ? '17001589' : activeNik)) || users[0];

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Pay Iuran (Instant Midtrans simulation or Manual)
  const payIuranMonths = (nik, selectedMonths, method = 'Midtrans QRIS', ref = `MDT-${Math.floor(10000 + Math.random() * 90000)}`) => {
    const totalAmount = selectedMonths.length * 100000;
    const today = new Date().toISOString().split('T')[0];

    setIuranRecords(prev => {
      const userIuran = { ...(prev[nik] || {}) };
      selectedMonths.forEach(month => {
        userIuran[month] = {
          status: 'lunas',
          nominal: 100000,
          date: today,
          method: method,
          ref: ref
        };
      });
      return { ...prev, [nik]: userIuran };
    });

    // Add to BSI balance
    setBsiBalance(b => b + totalAmount);

    const userName = users.find(u => u.nik === nik)?.name || nik;
    showToast(`Pembayaran ${selectedMonths.join(', ')} (Rp${totalAmount.toLocaleString('id-ID')}) a.n ${userName} berhasil diverifikasi!`);
  };

  // Mark single month paid by Admin Cashier
  const markIuranPaidCash = (nik, month) => {
    const today = new Date().toISOString().split('T')[0];
    setIuranRecords(prev => {
      const userIuran = { ...(prev[nik] || {}) };
      userIuran[month] = {
        status: 'lunas',
        nominal: 100000,
        date: today,
        method: 'Tunai Kasir',
        ref: `CASH-${Math.floor(1000 + Math.random() * 9000)}`
      };
      return { ...prev, [nik]: userIuran };
    });

    // Add to petty cash
    setPettyCash(p => p + 100000);
    const userName = users.find(u => u.nik === nik)?.name || nik;
    showToast(`Iuran ${month} a.n ${userName} ditandai Lunas Tunai (+Rp100.000 ke Kas Kecil)`);
  };

  // Add new expense
  const addExpense = (newExpense) => {
    const amount = Number(newExpense.amount);
    if (newExpense.source.includes('Kas Kecil') && amount > pettyCash) {
      // Overdraft warning confirmation can still allow or warn
    }

    const item = {
      ...newExpense,
      id: Date.now(),
      amount: amount
    };

    setExpenses(prev => [item, ...prev]);

    if (newExpense.source.includes('Kas Kecil')) {
      setPettyCash(p => Math.max(0, p - amount));
    } else {
      setBsiBalance(b => Math.max(0, b - amount));
    }

    // If it's a debt/talangan, also sync with debts list
    if (newExpense.category === 'Talangan') {
      const relatedUser = users.find(u => u.name.toLowerCase().includes(newExpense.pic.toLowerCase()));
      if (relatedUser) {
        setDebts(prev => {
          const existing = prev.find(d => d.nik === relatedUser.nik);
          if (existing) {
            return prev.map(d => d.nik === relatedUser.nik ? {
              ...d,
              amount: d.amount + amount,
              mutations: [
                ...d.mutations,
                {
                  id: Date.now(),
                  date: newExpense.date,
                  desc: newExpense.title,
                  debit: amount,
                  credit: 0,
                  balance: (d.amount - d.paid) + amount
                }
              ]
            } : d);
          } else {
            return [
              ...prev,
              {
                id: `DEBT-${Date.now().toString().slice(-4)}`,
                nik: relatedUser.nik,
                name: relatedUser.name,
                incident: newExpense.title,
                startDate: newExpense.date,
                body: newExpense.body || 'Armada EV',
                disbursedBy: 'Admin Kas Paguyuban',
                tenor: '1 Bulan',
                amount: amount,
                paid: 0,
                status: 'Belum Mengangsur',
                mutations: [
                  { id: Date.now(), date: newExpense.date, desc: newExpense.title, debit: amount, credit: 0, balance: amount }
                ]
              }
            ];
          }
        });
      }
    }

    showToast(`Pengeluaran Rp${amount.toLocaleString('id-ID')} (${newExpense.title}) berhasil dicatat!`);
  };

  // Repay Debt (Member/Admin)
  const repayDebt = (debtId, installmentAmount, paymentMethod = 'Cash ke Admin') => {
    const amt = Number(installmentAmount);
    const today = new Date().toLocaleDateString('id-ID');

    setDebts(prev => prev.map(d => {
      if (d.id === debtId) {
        const newPaid = d.paid + amt;
        const newRemaining = Math.max(0, d.amount - newPaid);
        const newStatus = newRemaining === 0 ? 'Lunas' : 'Sedang Mengangsur';

        return {
          ...d,
          paid: newPaid,
          status: newStatus,
          mutations: [
            ...d.mutations,
            {
              id: Date.now(),
              date: today,
              desc: `Setoran Angsuran (${paymentMethod})`,
              debit: 0,
              credit: amt,
              balance: newRemaining
            }
          ]
        };
      }
      return d;
    }));

    if (paymentMethod.includes('Cash')) {
      setPettyCash(p => p + amt);
    } else {
      setBsiBalance(b => b + amt);
    }

    showToast(`Setoran cicilan Rp${amt.toLocaleString('id-ID')} berhasil dibukukan!`);
  };

  // Submit Damage Report
  const addIncidentReport = (report) => {
    const newInc = {
      ...report,
      id: `INC-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      status: 'Laporan Baru Masuk',
      mechanic: report.needMechanic ? 'Mekanik KLI (Menunggu Penugasan)' : 'Belum Ditugaskan',
      expenseRef: '-',
      suketStatus: report.suketNeeded ? 'Pengurusan Suket Diproses' : 'Tidak Perlu Suket'
    };

    setIncidents(prev => [newInc, ...prev]);
    showToast('Laporan kerusakan berhasil dikirim ke Korlap & Tim Mekanik!');
  };

  // Update Incident Status
  const updateIncidentStatus = (incidentId, newStatus, newMechanic) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          status: newStatus || inc.status,
          mechanic: newMechanic || inc.mechanic
        };
      }
      return inc;
    }));
    showToast('Status logbook armada diperbarui!');
  };

  return (
    <AppContext.Provider value={{
      role, setRole,
      activeNik, setActiveNik,
      isMobileFrame, setIsMobileFrame,
      memberTab, setMemberTab,
      adminTab, setAdminTab,
      currentUser,
      users,
      iuranRecords,
      expenses,
      debts,
      incidents,
      bsiBalance,
      pettyCash,
      toast,
      showToast,
      payIuranMonths,
      markIuranPaidCash,
      addExpense,
      repayDebt,
      addIncidentReport,
      updateIncidentStatus,
      MONTHS
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
