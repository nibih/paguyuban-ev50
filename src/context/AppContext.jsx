import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { rp, normalizePhone } from '../utils/format';
import { IURAN_FEE, MONTHS } from '../constants';
import { db } from '../services/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  writeBatch
} from 'firebase/firestore';

const AppContext = createContext();

// Human-readable messages for the Firestore codes this panel actually hits.
const FS_MESSAGES = {
  'permission-denied': 'Server menolak tulisan (cek Security Rules).',
  'unavailable': 'Server tidak terjangkau. Coba lagi.',
  'cancelled': 'Permintaan dibatalkan.',
  'deadline-exceeded': 'Koneksi terlalu lambat, transaksi dibatalkan.'
};

const fsError = (e) => FS_MESSAGES[e?.code] || e?.message || 'Gagal menyinkronkan ke server.';

// Iuran fee per driver per month, and the fixed collection period — both live in
// ../constants. Re-exported here because MONTHS is handed down through the
// context value below and consumers already reach for it from this module.
export { IURAN_FEE, MONTHS };

const todayId = () => new Date().toLocaleDateString('id-ID');

// Loose name normalisation for matching a free-text PIC field to a driver.
const normName = (s) => String(s || '')
  .toLowerCase()
  .replace(/[^a-z ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Which vault a payment belongs to. Cash handed to the cashier lives in the
// tin; anything arriving through the bank lives in BSI.
const vaultKeyForMethod = (method) => ((method || '').includes('Tunai') ? 'pettyCash' : 'bsiBalance');
const vaultKeyFor = (source) => ((source || '').includes('Kas Kecil') ? 'pettyCash' : 'bsiBalance');

const SESSION_KEY = 'paguyuban.admin.session';

// The shared password the depot has used since day one. It stays the default
// web gate for now, by request — the account login below is available for
// anyone who wants a real identity attached to their actions.
//
// This is a deterrent, not security: the value is compiled into the bundle,
// so anyone with devtools can read it. Firestore rules still have no
// `request.auth` check, so the password protects the screen, not the data.
const LEGACY_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'EV50-Cawang-2026';

// The shared password carries no identity. Actions taken through it are filed
// under the cashier account the panel historically used, so `createdBy` and
// `verifiedBy` still hold a name rather than a blank.
const LEGACY_ADMIN_NIK = '17001589';
const LEGACY_ADMIN = {
  nik: LEGACY_ADMIN_NIK,
  name: 'Afrizal Firmansyah',
  role: 'admin',
  position: 'Admin Kasir & Korlap'
};

// `{ mode: 'password' }` or `{ mode: 'account', nik }`. The old stored value
// was a bare NIK, which is read as an account session.
const readSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.mode === 'password') return { mode: 'password' };
      if (parsed?.mode === 'account' && parsed.nik) return { mode: 'account', nik: String(parsed.nik) };
      return null;
    } catch {
      return { mode: 'account', nik: raw };
    }
  } catch {
    return null;
  }
};

export const AppProvider = ({ children }) => {
  // The panel used to act as Afrizal no matter who opened it, behind a shared
  // password that was compiled into the JavaScript bundle. Both are gone: the
  // gate matches NIK + PIN against `users` and refuses anyone whose role is
  // not `admin`.
  //
  // This is an application-level guard, not authorisation. Firestore rules
  // still accept writes without `request.auth` because the mobile app has no
  // Firebase Auth, so a caller who skips the UI can still reach the data. What
  // this stops is the realistic case: a driver opening the panel and reading
  // the books, or flipping `role` on their own account from the member view.
  const [session, setSession] = useState(readSession);

  const [users, setUsers] = useState([]);
  const [debts, setDebts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  // Route dispatch list for drivers who need a phone number fast.
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [vault, setVault] = useState({ bsiBalance: 0, pettyCash: 0 });
  // iuranRecords: { [nik]: { [month]: { status, nominal, date, method, ... } } }
  const [iuranRecords, setIuranRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [adminTab, setAdminTab] = useState('A1');
  const [toast, setToast] = useState(null);

  // Live sync with Firestore. Every listener tolerates an empty or unreachable
  // backend by simply keeping what it has — a panel that blanks the roster
  // because one collection is slow is worse than one that shows stale numbers.
  useEffect(() => {
    let alive = true;
    const unsubs = [];

    const safe = (fn) => (...args) => {
      if (alive) fn(...args);
    };

    try {
      unsubs.push(onSnapshot(collection(db, 'users'), safe((snap) => {
        if (snap.empty) return;
        const list = [];
        snap.forEach((d) => list.push({ ...d.data(), nik: d.data().nik || d.id }));
        // Merge rather than replace: a partially-seeded backend must not
        // make the other drivers vanish from the roster.
        setUsers((prev) => {
          const remote = new Set(list.map((u) => u.nik));
          return [...list, ...prev.filter((u) => !remote.has(u.nik))];
        });
      }), safe(() => {})));

      unsubs.push(onSnapshot(collection(db, 'debts'), safe((snap) => {
        if (snap.empty) return;
        const list = [];
        snap.forEach((d) => list.push(d.data()));
        setDebts((prev) => {
          const remote = new Set(list.map((d) => d.id));
          return [...list, ...prev.filter((d) => !remote.has(d.id))];
        });
      }), safe(() => {})));

      unsubs.push(onSnapshot(collection(db, 'expenses'), safe((snap) => {
        if (snap.empty) return;
        const list = [];
        snap.forEach((d) => list.push(d.data()));
        list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        setExpenses(list);
      }), safe(() => {})));

      // Iuran: one doc per NIK holding a month -> payment map.
      unsubs.push(onSnapshot(collection(db, 'iuran'), safe((snap) => {
        if (snap.empty) return;
        const incoming = {};
        snap.forEach((d) => {
          const data = d.data();
          incoming[data.nik || d.id] = data.months || {};
        });
        setIuranRecords((prev) => ({ ...prev, ...incoming }));
      }), safe(() => {})));

      unsubs.push(onSnapshot(collection(db, 'incidents'), safe((snap) => {
        if (snap.empty) return;
        const list = [];
        snap.forEach((d) => list.push(d.data()));
        list.sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
        setIncidents(list);
      }), safe(() => {})));

      unsubs.push(onSnapshot(collection(db, 'emergencyContacts'), safe((snap) => {
        // Unlike the money collections, empty is a legitimate answer here:
        // the dispatch list can be cleared entirely, and a stale roster must
        // not linger on the panel after the admin empties it.
        const list = [];
        snap.forEach((d) => list.push(d.data()));
        list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id'));
        setEmergencyContacts(list);
      }), safe(() => {})));

      unsubs.push(onSnapshot(doc(db, 'system', 'vault'), safe((snap) => {
        if (snap.exists()) setVault(snap.data());
      }), safe(() => {})));
    } catch (e) {
      console.warn('Firestore unreachable — falling back to the bundled seed data.', e);
    }

    // Mark the first snapshot round as done whether or not it succeeded, so
    // the panel never hangs on a spinner against an unreachable backend.
    const t = setTimeout(() => alive && setLoading(false), 800);

    return () => {
      alive = false;
      clearTimeout(t);
      unsubs.forEach((u) => { try { u(); } catch { /* already torn down */ } });
    };
  }, []);

  // Persist the session for the life of the tab. sessionStorage (not
  // localStorage) so a shared depot machine re-locks when the tab closes.
  const persistSession = (next) => {
    try {
      if (next) sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* private mode — the session lasts this render only */
    }
    setSession(next);
  };

  // Identity: an account session is checked against the roster; a password
  // session is the shared cashier identity the depot has always used.
  const currentUser = useMemo(() => {
    if (session?.mode === 'password') {
      return users.find((u) => u.nik === LEGACY_ADMIN_NIK) || LEGACY_ADMIN;
    }
    return users.find((u) => u.nik === session?.nik) || null;
  }, [users, session]);

  // Password mode is let through because that is the gate the team uses
  // today; account mode additionally requires an active admin account.
  const isAdmin = session?.mode === 'password'
    ? true
    : !!currentUser && currentUser.role === 'admin' && currentUser.status !== 'inactive';
  const hasSession = !!session;

  // Drop a stored ACCOUNT session that no longer maps to an active admin.
  // Password sessions are left alone — there is no account to validate.
  useEffect(() => {
    if (loading || session?.mode !== 'account' || users.length === 0) return;
    const u = users.find((x) => x.nik === session.nik);
    if (!u || u.role !== 'admin' || u.status === 'inactive') {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* storage unavailable — the in-memory session is cleared below */
      }
      setSession(null);
    }
  }, [loading, users, session]);

  // Open the panel with the shared password. Kept as the default gate while
  // the depot is still used to it; the account form below is the way off it.
  const signInWithPassword = (password) => {
    if (String(password || '') !== LEGACY_PASSWORD) {
      return { ok: false, error: 'Kata sandi salah.' };
    }
    persistSession({ mode: 'password' });
    return { ok: true };
  };

  // Verify NIK + PIN against the roster. The default PIN is the last four
  // digits of the NIK, matching the mobile app; nothing in Firestore stores a
  // PIN yet, so that default — not this form — is what actually raises the bar.
  const signIn = async (nik, pin) => {
    const cleanNik = String(nik || '').trim();
    if (!cleanNik) return { ok: false, error: 'Masukkan NIK.' };

    try {
      const snap = await getDoc(doc(db, 'users', cleanNik));
      if (!snap.exists()) return { ok: false, error: 'NIK tidak terdaftar.' };

      const user = snap.data();
      if (user.status === 'inactive') return { ok: false, error: 'Akun ini dinonaktifkan.' };
      if (user.role !== 'admin') return { ok: false, error: 'Akun ini bukan pengurus.' };

      const expected = String(user.pin || cleanNik.slice(-4));
      if (String(pin || '') !== expected) return { ok: false, error: 'PIN salah.' };

      persistSession({ mode: 'account', nik: cleanNik });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: fsError(e) };
    }
  };

  const signOut = () => {
    persistSession(null);
  };

  // Each call replaces the previous toast AND takes over its dismissal
  // timer. Without clearing the old timer, a burst of messages — exactly
  // what a bulk operation produces — would leave the first call's timeout
  // to fire 3.5s in and wipe the newest message, so the summary the cashier
  // needed most would be the one that vanished first.
  const toastTimer = useRef(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  /* ---------------------------------------------------------------- *
   * PAYMENT VERIFICATION
   *
   * verifyIuran / verifyInstallment are the ONLY functions in this panel
   * that credit the vault. A cashier marking a month paid, or a driver
   * tapping "pay" on the phone, stops at `pending`.
   *
   * Why: every payment made through the app before 12 Oct 2026 was a test
   * tap, none was checked against the bank, and the taps had already become
   * financial history — Rp1.200.000 of iuran marked lunas and a vault that
   * no longer matched the BSI statement. A button press is a claim about
   * money, not proof of it.
   *
   * Both re-read their document inside the transaction, so two cashiers
   * confirming the same claim in the same second cannot credit it twice.
   * ---------------------------------------------------------------- */

  // A cashier ticks a driver's month as paid in cash. Records a CLAIM that
  // cash changed hands; it does not move the tin.
  const markIuranPaidCash = async (nik, month) => {
    const payment = {
      status: 'pending',
      nominal: IURAN_FEE,
      date: todayId(),
      method: 'Tunai Kasir',
      markedBy: currentUser?.name || 'Pengurus'
    };
    const before = iuranRecords[nik]?.[month];

    setIuranRecords((prev) => ({
      ...prev,
      [nik]: { ...(prev[nik] || {}), [month]: payment }
    }));

    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'iuran', nik);
        const snap = await tx.get(ref);
        const months = { ...(snap.exists() ? snap.data().months : {}) };
        // Refuse to queue twice, and never touch a month already confirmed.
        if (months[month]?.status === 'lunas') throw { code: 'already-paid' };
        if (months[month]?.status === 'pending') throw { code: 'already-pending' };
        months[month] = payment;
        tx.set(ref, { nik, months }, { merge: true });
      });

      const name = users.find((u) => u.nik === nik)?.name || nik;
      showToast(`Iuran ${month} a.n ${name} masuk antrean verifikasi.`);
      return true;
    } catch (e) {
      setIuranRecords((prev) => {
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

  // Confirm one pending iuran month. Credits the matching vault.
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
    const verifiedBy = currentUser?.name || 'Pengurus';
    const verifiedAt = todayId();
    const before = entry;

    setIuranRecords((prev) => ({
      ...prev,
      [nik]: { ...(prev[nik] || {}), [month]: { ...entry, status: 'lunas', verifiedBy, verifiedAt } }
    }));
    setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + nominal }));

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

        months[month] = { ...current, status: 'lunas', verifiedBy, verifiedAt };
        tx.set(iuranRef, { nik, months }, { merge: true });

        const cash = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        tx.set(vaultRef, { [vaultKey]: cash + nominal }, { merge: true });
      });

      const name = users.find((u) => u.nik === nik)?.name || nik;
      showToast(`Iuran ${month} a.n ${name} terverifikasi (+${rp(nominal)}).`);
      return true;
    } catch (e) {
      setIuranRecords((prev) => ({
        ...prev,
        [nik]: { ...(prev[nik] || {}), [month]: before }
      }));
      setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) - nominal }));
      showToast(
        e?.code === 'not-pending'
          ? `Iuran ${month} sudah diproses pengurus lain. Muat ulang.`
          : `Verifikasi GAGAL. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // Reject a pending iuran month. The claim is dropped; no money moves.
  const rejectIuran = async (nik, month, note = '') => {
    const before = iuranRecords[nik]?.[month];
    if (!before || before.status !== 'pending') {
      showToast('Hanya pembayaran tertunda yang bisa ditolak.', 'error');
      return false;
    }

    setIuranRecords((prev) => {
      const months = { ...(prev[nik] || {}) };
      delete months[month];
      return { ...prev, [nik]: months };
    });

    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'iuran', nik);
        const snap = await tx.get(ref);
        const months = { ...(snap.exists() ? snap.data().months : {}) };
        if (months[month]?.status !== 'pending') throw { code: 'not-pending' };
        delete months[month];
        tx.set(ref, { nik, months }, { merge: true });
      });

      showToast(note ? `Pembayaran ${month} ditolak: ${note}` : `Pembayaran ${month} ditolak.`);
      return true;
    } catch (e) {
      setIuranRecords((prev) => ({ ...prev, [nik]: { ...(prev[nik] || {}), [month]: before } }));
      showToast(`Tolak GAGAL. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // Undo a confirmed iuran month. Exact inverse of verifyIuran: the month
  // returns to `unpaid` and the vault that was credited is debited.
  //
  // Bank-sourced rows (`source: 'Laporan Uang Masuk'`) are refused. That money
  // never entered the vault through this panel, so debiting it here would
  // invent a refund that nobody paid out. Those are corrected against the
  // statement and the seeder.
  const unverifyIuran = async (nik, month) => {
    const entry = iuranRecords[nik]?.[month];
    if (!entry || entry.status !== 'lunas') {
      showToast('Hanya iuran yang sudah lunas yang bisa dibatalkan.', 'error');
      return false;
    }
    if (entry.source === 'Laporan Uang Masuk') {
      showToast('Data ini dari laporan bank, bukan verifikasi aplikasi. Koreksi lewat laporan aslinya.', 'error');
      return false;
    }

    const vaultKey = entry.vault || vaultKeyForMethod(entry.method);
    const nominal = Number(entry.nominal) || 0;
    const before = entry;
    const reverted = {
      status: 'unpaid',
      nominal: 0,
      method: entry.method || '',
      date: entry.date || '',
      revertedBy: currentUser?.name || 'Pengurus',
      revertedAt: todayId(),
      revertedFrom: {
        status: entry.status,
        nominal: entry.nominal,
        method: entry.method || '',
        date: entry.date || '',
        verifiedBy: entry.verifiedBy || entry.markedBy || ''
      }
    };

    if ((vault[vaultKey] || 0) < nominal) {
      showToast(
        `Kas ${vaultKey === 'pettyCash' ? 'kecil' : 'BSI'} tidak cukup untuk membatalkan ${rp(nominal)}.`,
        'error'
      );
      return false;
    }

    setIuranRecords((prev) => ({
      ...prev,
      [nik]: { ...(prev[nik] || {}), [month]: reverted }
    }));
    setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) - nominal }));

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
        const cash = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        if (cash < amount) throw { code: 'insufficient' };

        months[month] = {
          ...reverted,
          revertedFrom: { ...reverted.revertedFrom, nominal: current.nominal }
        };
        tx.set(iuranRef, { nik, months }, { merge: true });
        tx.set(vaultRef, { [vaultKey]: cash - amount }, { merge: true });
      });

      const name = users.find((u) => u.nik === nik)?.name || nik;
      showToast(`Iuran ${month} a.n ${name} dibatalkan. Kas dikurangi ${rp(nominal)}.`);
      return true;
    } catch (e) {
      setIuranRecords((prev) => ({ ...prev, [nik]: { ...(prev[nik] || {}), [month]: before } }));
      setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + nominal }));
      showToast(
        e?.code === 'not-lunas'
          ? `Iuran ${month} sudah diubah pengurus lain. Muat ulang.`
          : e?.code === 'bank'
            ? 'Data ini dari laporan bank, bukan verifikasi aplikasi.'
            : e?.code === 'insufficient'
              ? `Kas ${vaultKey === 'pettyCash' ? 'kecil' : 'BSI'} tidak cukup untuk membatalkan.`
              : `Pembatalan GAGAL. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // Confirm one queued installment: it moves into `paid`, status is recomputed
  // from paid/amount, and the cash lands in the matching vault.
  const verifyInstallment = async (debtId, entryId) => {
    const debt = debts.find((d) => d.id === debtId);
    const entry = debt?.pendingInstallments?.find((p) => p.id === entryId);
    if (!entry) {
      showToast('Angsuran tidak ditemukan.', 'error');
      return false;
    }

    const vaultKey = vaultKeyForMethod(entry.method);
    const amt = Number(entry.amount);
    const name = debt.name || debtId;
    const before = debt;
    const verifiedBy = currentUser?.name || 'Pengurus';
    const verifiedAt = todayId();
    // Keep the confirmed entry instead of discarding it. `paid` alone cannot
    // be reversed: it holds no amounts, no methods and no vault, so undoing a
    // mistaken confirmation would have to guess. This array is the audit trail
    // `unverifyInstallment` walks.
    const record = { ...entry, verifiedBy, verifiedAt, vault: vaultKey };

    setDebts((prev) => prev.map((d) => {
      if (d.id !== debtId) return d;
      const newPaid = (d.paid || 0) + amt;
      const remaining = Math.max(0, d.amount - newPaid);
      return {
        ...d,
        paid: newPaid,
        status: remaining === 0 ? 'Lunas' : 'Sedang Mengangsur',
        pendingInstallments: (d.pendingInstallments || []).filter((p) => p.id !== entryId),
        verifiedInstallments: [...(d.verifiedInstallments || []), record]
      };
    }));
    setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + amt }));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', debtId);
        const vaultRef = doc(db, 'system', 'vault');
        const [debtSnap, vaultSnap] = await Promise.all([tx.get(debtRef), tx.get(vaultRef)]);
        if (!debtSnap.exists()) throw { code: 'not-found' };

        const d = debtSnap.data();
        const queue = d.pendingInstallments || [];
        const found = queue.find((p) => p.id === entryId);
        if (!found) throw { code: 'not-found' };

        const newPaid = (d.paid || 0) + found.amount;
        const remaining = Math.max(0, d.amount - newPaid);

        tx.update(debtRef, {
          paid: newPaid,
          status: remaining === 0 ? 'Lunas' : 'Sedang Mengangsur',
          pendingInstallments: queue.filter((p) => p.id !== entryId),
          verifiedInstallments: [...(d.verifiedInstallments || []), { ...found, verifiedBy, verifiedAt, vault: vaultKey }]
        });

        const cash = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        tx.set(vaultRef, { [vaultKey]: cash + found.amount }, { merge: true });
      });

      showToast(`Angsuran ${name} ${rp(amt)} terverifikasi.`);
      return true;
    } catch (e) {
      setDebts((prev) => prev.map((d) => (d.id === debtId ? before : d)));
      setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) - amt }));
      showToast(
        e?.code === 'not-found'
          ? 'Angsuran sudah diproses pengurus lain. Muat ulang.'
          : `Verifikasi GAGAL. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // Undo a confirmation the panel recorded. Exact inverse of
  // verifyInstallment: the entry leaves the audit trail, `paid` falls back,
  // and the vault it credited is debited by the same amount.
  //
  // Only entries carrying `verifiedBy` can be undone. The seed's `paid`
  // amounts came from paper cards with no per-installment breakdown and no
  // record of which vault received the money, so the old aggregate is left
  // alone rather than guessed at.
  const unverifyInstallment = async (debtId, entryId) => {
    const debt = debts.find((d) => d.id === debtId);
    const entry = (debt?.verifiedInstallments || []).find((p) => p.id === entryId);
    if (!entry) {
      showToast('Angsuran ini tidak punya riwayat verifikasi di aplikasi.', 'error');
      return false;
    }

    const vaultKey = entry.vault || vaultKeyForMethod(entry.method);
    const amt = Number(entry.amount) || 0;
    const before = debt;
    const statusFor = (amount, paid) => {
      if (paid >= amount) return 'Lunas';
      if (paid <= 0) return 'Belum Mengangsur';
      return 'Sedang Mengangsur';
    };

    // Refuse rather than drive the balance negative: a cash figure below zero
    // is a worse lie than a blocked button.
    if ((vault[vaultKey] || 0) < amt) {
      showToast(
        `Kas ${vaultKey === 'pettyCash' ? 'kecil' : 'BSI'} tidak cukup untuk membatalkan ${rp(amt)}.`,
        'error'
      );
      return false;
    }

    setDebts((prev) => prev.map((d) => {
      if (d.id !== debtId) return d;
      const newPaid = Math.max(0, (d.paid || 0) - amt);
      return {
        ...d,
        paid: newPaid,
        status: statusFor(d.amount, newPaid),
        verifiedInstallments: (d.verifiedInstallments || []).filter((p) => p.id !== entryId)
      };
    }));
    setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) - amt }));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', debtId);
        const vaultRef = doc(db, 'system', 'vault');
        const [debtSnap, vaultSnap] = await Promise.all([tx.get(debtRef), tx.get(vaultRef)]);
        if (!debtSnap.exists()) throw { code: 'not-found' };

        const d = debtSnap.data();
        const list = d.verifiedInstallments || [];
        const found = list.find((p) => p.id === entryId);
        if (!found) throw { code: 'not-recorded' };

        const cash = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        if (cash < found.amount) throw { code: 'insufficient' };

        const newPaid = Math.max(0, (d.paid || 0) - found.amount);
        tx.update(debtRef, {
          paid: newPaid,
          status: statusFor(d.amount, newPaid),
          verifiedInstallments: list.filter((p) => p.id !== entryId)
        });
        tx.set(vaultRef, { [vaultKey]: cash - found.amount }, { merge: true });
      });

      showToast(`Verifikasi angsuran ${debt.name || debtId} ${rp(amt)} dibatalkan. Kas dikurangi.`);
      return true;
    } catch (e) {
      setDebts((prev) => prev.map((d) => (d.id === debtId ? before : d)));
      setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + amt }));
      showToast(
        e?.code === 'not-recorded'
          ? 'Angsuran sudah dibatalkan pengurus lain. Muat ulang.'
          : e?.code === 'insufficient'
            ? `Kas ${vaultKey === 'pettyCash' ? 'kecil' : 'BSI'} tidak cukup untuk membatalkan.`
            : `Pembatalan GAGAL. ${fsError(e)}`,
        'error'
      );
      return false;
    }
  };

  // Reject a queued installment. No money moves.
  const rejectInstallment = async (debtId, entryId) => {
    const debt = debts.find((d) => d.id === debtId);
    const entry = debt?.pendingInstallments?.find((p) => p.id === entryId);
    if (!entry) {
      showToast('Angsuran tidak ditemukan.', 'error');
      return false;
    }
    const before = debt;

    setDebts((prev) => prev.map((d) => (d.id === debtId
      ? { ...d, pendingInstallments: (d.pendingInstallments || []).filter((p) => p.id !== entryId) }
      : d)));

    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'debts', debtId);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw { code: 'not-found' };
        const queue = snap.data().pendingInstallments || [];
        if (!queue.some((p) => p.id === entryId)) throw { code: 'not-found' };
        tx.update(ref, { pendingInstallments: queue.filter((p) => p.id !== entryId) });
      });

      showToast('Angsuran ditolak. Uang tidak dicatat.');
      return true;
    } catch (e) {
      setDebts((prev) => prev.map((d) => (d.id === debtId ? before : d)));
      showToast(`Tolak GAGAL. ${fsError(e)}`, 'error');
      return false;
    }
  };

  /* ---------------------------------------------------------------- *
   * EXPENSES & RECEIVABLES
   * ---------------------------------------------------------------- */

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
      || users.find((u) => normName(u.name).includes(normName(newExpense.pic || '')))?.nik;
    const relatedDebt = relatedNik ? debts.find((d) => d.nik === relatedNik) : null;

    setExpenses((prev) => [item, ...prev]);
    setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) - amount }));
    if (relatedDebt) {
      setDebts((prev) => prev.map((d) => (d.id === relatedDebt.id
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
      setExpenses((prev) => prev.filter((x) => x.id !== id));
      setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + amount }));
      if (relatedDebt) {
        setDebts((prev) => prev.map((d) => (d.id === relatedDebt.id
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

    setExpenses((prev) => prev.filter((x) => x.id !== expense.id));
    setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) + amount }));

    try {
      await runTransaction(db, async (tx) => {
        const vaultRef = doc(db, 'system', 'vault');
        const vaultSnap = await tx.get(vaultRef);
        const current = vaultSnap.exists() ? (vaultSnap.data()[vaultKey] || 0) : 0;
        tx.delete(doc(db, 'expenses', expense.id));
        tx.set(vaultRef, { [vaultKey]: current + amount }, { merge: true });
      });
      showToast(`Pengeluaran dihapus, ${rp(amount)} dikembalikan ke kas.`);
      return true;
    } catch (e) {
      setExpenses((prev) => [expense, ...prev]);
      setVault((v) => ({ ...v, [vaultKey]: (v[vaultKey] || 0) - amount }));
      showToast(`Gagal menghapus. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A4: admin records a new talangan / loan.
  const addDebt = async ({ nik, incident, amount, tenor = '1 BULAN', body = 'Armada EV Cawang' }) => {
    const nominal = Number(amount);
    const user = users.find((u) => u.nik === nik);
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
      disbursedBy: currentUser?.name || 'Pengurus'
    };

    setDebts((prev) => [item, ...prev]);
    setVault((v) => ({ ...v, pettyCash: (v.pettyCash || 0) - nominal }));

    try {
      await runTransaction(db, async (tx) => {
        const debtRef = doc(db, 'debts', id);
        const vaultRef = doc(db, 'system', 'vault');
        const vaultSnap = await tx.get(vaultRef);
        const cash = vaultSnap.exists() ? (vaultSnap.data().pettyCash || 0) : 0;
        tx.set(debtRef, item);
        tx.set(vaultRef, { pettyCash: cash - nominal }, { merge: true });
      });
      showToast(`Talangan ${rp(nominal)} untuk ${user.name} dicatat.`);
      return true;
    } catch (e) {
      setDebts((prev) => prev.filter((d) => d.id !== id));
      setVault((v) => ({ ...v, pettyCash: (v.pettyCash || 0) + nominal }));
      showToast(`Talangan TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A4: discard a receivable card entirely (admin correction only).
  const deleteDebt = async (debtId) => {
    const before = debts.find((d) => d.id === debtId);
    if (!before) return false;

    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    try {
      await deleteDoc(doc(db, 'debts', debtId));
      showToast(`Kartu piutang ${before.name} dihapus.`);
      return true;
    } catch (e) {
      setDebts((prev) => [before, ...prev]);
      showToast(`Gagal menghapus kartu piutang. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A5: move a report between board columns / reassign the mechanic.
  const updateIncidentStatus = async (incidentId, newStatus, newMechanic) => {
    const before = incidents.find((i) => i.id === incidentId);
    if (!before) return false;

    const status = newStatus || before.status;
    const mechanic = newMechanic || before.mechanic;
    if (status === before.status && mechanic === before.mechanic) return true;

    setIncidents((prev) => prev.map((i) => (i.id === incidentId ? { ...i, status, mechanic } : i)));

    try {
      await setDoc(doc(db, 'incidents', incidentId), { ...before, status, mechanic }, { merge: true });
      showToast('Status logbook armada diperbarui!');
      return true;
    } catch (e) {
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? before : i)));
      showToast(`Status TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // A5: discard a report entirely.
  const deleteIncident = async (incidentId) => {
    const before = incidents.find((i) => i.id === incidentId);
    if (!before) return false;

    setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
    try {
      await deleteDoc(doc(db, 'incidents', incidentId));
      showToast(`Laporan ${before.id} dihapus.`);
      return true;
    } catch (e) {
      setIncidents((prev) => [before, ...prev]);
      showToast(`Gagal menghapus laporan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  /* ---------------------------------------------------------------- *
   * UPLOADS
   *
   * Photos and payment proofs ride on the owning document as base64
   * thumbnails — the project has no Cloud Storage bucket. src/utils/image.js
   * enforces the same 400–700px JPEG budget the mobile app uses, so a photo
   * taken at the depot desk costs the same as one taken on a phone.
   * ---------------------------------------------------------------- */

  // Replace an incident's photo list. Capped at 3 to match validPhotos() in
  // firestore.rules and keep the document far from the 1 MiB ceiling.
  const updateIncidentPhotos = async (incidentId, photos) => {
    const before = incidents.find((i) => i.id === incidentId);
    if (!before) return false;

    const list = (photos || []).filter(Boolean).slice(0, 3);
    setIncidents((prev) => prev.map((i) => (i.id === incidentId ? { ...i, photos: list } : i)));

    try {
      await setDoc(doc(db, 'incidents', incidentId), { photos: list }, { merge: true });
      return true;
    } catch (e) {
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? before : i)));
      showToast(`Foto TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // Import a batch of repair cards. The archive is written in chunks of 400
  // (the Firestore batch ceiling is 500) and skips ids that are already in the
  // logbook, so re-running an import after a half-finished attempt tops it up
  // instead of duplicating it.
  const addIncidentsBulk = async (docs) => {
    const known = new Set(incidents.map((i) => i.id));
    const fresh = (docs || []).filter((d) => d?.id && !known.has(d.id));
    const skipped = (docs || []).length - fresh.length;

    if (!fresh.length) {
      showToast('Semua kartu ini sudah ada di logbook.');
      return { created: 0, skipped };
    }

    const written = [];
    const CHUNK = 400;

    for (let i = 0; i < fresh.length; i += CHUNK) {
      const chunk = fresh.slice(i, i + CHUNK);
      try {
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.set(doc(db, 'incidents', d.id), d));
        await batch.commit();
        written.push(...chunk);
      } catch (e) {
        // Keep what landed so the board matches the database, and let the
        // operator retry — the import is idempotent.
        if (written.length) setIncidents((prev) => [...written, ...prev]);
        showToast(
          `${written.length} kartu tersimpan, sisanya GAGAL. ${fsError(e)} Coba impor ulang.`,
          'error'
        );
        return { created: written.length, skipped, failed: true };
      }
    }

    setIncidents((prev) => [...written, ...prev]);
    showToast(`${written.length} kartu perbaikan ditambahkan${skipped ? `, ${skipped} sudah ada` : ''}.`);
    return { created: written.length, skipped };
  };

  // Attach a transfer receipt to a queued iuran month. verifyIuran spreads the
  // current entry into the confirmed one, so the proof survives verification.
  const attachIuranProof = async (nik, month, proof) => {
    const before = iuranRecords[nik]?.[month];
    if (!before) {
      showToast('Pembayaran tidak ditemukan.', 'error');
      return false;
    }

    setIuranRecords((prev) => {
      const next = { ...before };
      if (proof) next.proof = proof; else delete next.proof;
      return { ...prev, [nik]: { ...(prev[nik] || {}), [month]: next } };
    });

    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'iuran', nik);
        const snap = await tx.get(ref);
        const months = { ...(snap.exists() ? snap.data().months : {}) };
        if (!months[month]) throw { code: 'missing' };

        const updated = { ...months[month] };
        if (proof) updated.proof = proof; else delete updated.proof;
        months[month] = updated;
        tx.set(ref, { nik, months }, { merge: true });
      });

      showToast(proof ? 'Bukti transfer dilampirkan.' : 'Bukti transfer dihapus.');
      return true;
    } catch (e) {
      setIuranRecords((prev) => ({ ...prev, [nik]: { ...(prev[nik] || {}), [month]: before } }));
      showToast(`Bukti TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // Same for a queued installment. The proof is copied into
  // verifiedInstallments by verifyInstallment, so it stays with the payment.
  const attachInstallmentProof = async (debtId, entryId, proof) => {
    const debt = debts.find((d) => d.id === debtId);
    const entry = debt?.pendingInstallments?.find((p) => p.id === entryId);
    if (!entry) {
      showToast('Angsuran tidak ditemukan.', 'error');
      return false;
    }
    const before = debt;

    const patch = (list) => list.map((p) => {
      if (p.id !== entryId) return p;
      const next = { ...p };
      if (proof) next.proof = proof; else delete next.proof;
      return next;
    });

    setDebts((prev) => prev.map((d) => (d.id === debtId
      ? { ...d, pendingInstallments: patch(d.pendingInstallments || []) }
      : d)));

    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'debts', debtId);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw { code: 'not-found' };
        const list = snap.data().pendingInstallments || [];
        if (!list.some((p) => p.id === entryId)) throw { code: 'not-found' };
        tx.update(ref, { pendingInstallments: patch(list) });
      });

      showToast(proof ? 'Bukti transfer dilampirkan.' : 'Bukti transfer dihapus.');
      return true;
    } catch (e) {
      setDebts((prev) => prev.map((d) => (d.id === debtId ? before : d)));
      showToast(`Bukti TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  /* ---------------------------------------------------------------- *
   * ROSTER MANAGEMENT
   *
   * Members are never hard-deleted. A driver with a debt card or a settled
   * iuran history is part of the paguyuban's financial record, and removing
   * the roster entry would orphan that money. Deactivation is the only
   * "delete" this panel performs.
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
      const taken = users.some((u) => u.nik === nik && u.nik !== ignoreNik);
      if (taken) return { ok: false, error: `NIK ${nik} sudah terdaftar.` };
    }

    return { ok: true, nik, name, pin };
  };

  // Register a new pramudi.
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

    setUsers((prev) => [item, ...prev]);

    try {
      await setDoc(doc(db, 'users', item.nik), item);
      showToast(`${item.name} ditambahkan ke daftar pramudi (NIK ${item.nik}).`);
      return true;
    } catch (e) {
      setUsers((prev) => prev.filter((u) => u.nik !== item.nik));
      showToast(`Pramudi TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // Batch intake. Drivers arrive in groups — a new depot roster, a transferred
  // crew — and typing twenty rows through the single-entry form is where
  // misspelt NIKs come from. Each row goes through the same validateMember()
  // as the form and is written on its own, so one bad NIK cannot block the
  // other nineteen. A NIK that already exists is skipped, never merged: the
  // NIK is immutable and may already own iuran records and debt cards.
  //
  // Bulk intake never grants admin. Promotion is a deliberate, one-at-a-time
  // decision, not something that rides in on a spreadsheet column.
  const addMembersBulk = async (rows) => {
    const created = [];
    const failed = [];
    const seen = new Set(users.map((u) => u.nik));

    for (const raw of rows || []) {
      const v = validateMember({
        nik: raw?.nik,
        name: raw?.name,
        position: raw?.position,
        pin: raw?.pin
      });

      if (!v.ok) {
        failed.push({ nik: String(raw?.nik || ''), name: String(raw?.name || ''), error: v.error });
        continue;
      }
      if (seen.has(v.nik)) {
        failed.push({ nik: v.nik, name: v.name, error: `NIK ${v.nik} sudah terdaftar.` });
        continue;
      }

      const item = {
        nik: v.nik,
        name: v.name,
        role: 'member',
        position: String(raw?.position || '').trim() || 'Pramudi EV 50 Cawang',
        status: 'active',
        ...(v.pin ? { pin: v.pin } : {}),
        createdAt: todayId(),
        createdBy: currentUser?.name || 'Pengurus'
      };

      try {
        await setDoc(doc(db, 'users', item.nik), item);
        created.push(item);
        seen.add(v.nik);
      } catch (e) {
        failed.push({ nik: v.nik, name: v.name, error: fsError(e) });
      }
    }

    if (created.length) setUsers((prev) => [...created, ...prev]);
    showToast(
      created.length
        ? `${created.length} pramudi ditambahkan${failed.length ? `, ${failed.length} dilewati` : ''}.`
        : 'Tidak ada pramudi yang bisa ditambahkan.',
      created.length ? undefined : 'error'
    );

    return { created, failed };
  };

  // Edit name, position, role, or reset the PIN.
  const updateMember = async (nik, fields) => {
    const before = users.find((u) => u.nik === nik);
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
    setUsers((prev) => prev.map((u) => (u.nik === nik ? next : u)));

    try {
      await setDoc(doc(db, 'users', nik), patch, { merge: true });
      showToast(`Data ${patch.name} diperbarui.`);
      return true;
    } catch (e) {
      setUsers((prev) => prev.map((u) => (u.nik === nik ? before : u)));
      showToast(`Perubahan TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  // Deactivate without deleting, preserving the financial history.
  const setMemberActive = async (nik, active) => {
    const before = users.find((u) => u.nik === nik);
    if (!before) return false;

    // The last active admin must never be locked out of their own system.
    const adminsLeft = users.filter(
      (u) => u.role === 'admin' && u.status !== 'inactive' && u.nik !== nik
    );
    if (!active && before.role === 'admin' && adminsLeft.length === 0) {
      showToast('Tidak bisa menonaktifkan admin terakhir.', 'error');
      return false;
    }

    const status = active ? 'active' : 'inactive';
    setUsers((prev) => prev.map((u) => (u.nik === nik ? { ...u, status } : u)));

    try {
      await setDoc(doc(db, 'users', nik), { status }, { merge: true });
      showToast(
        active
          ? `${before.name} diaktifkan kembali.`
          : `${before.name} dinonaktifkan. Riwayat keuangannya tetap tersimpan.`
      );
      return true;
    } catch (e) {
      setUsers((prev) => prev.map((u) => (u.nik === nik ? before : u)));
      showToast(`Status TIDAK tersimpan. ${fsError(e)}`, 'error');
      return false;
    }
  };

  /* ---------------------------------------------------------------- *
   * Emergency contacts — the route dispatch list
   * ---------------------------------------------------------------- */

  // Blank is a meaningful state here, not an omission.
  //
  // A contact whose number is still unknown stays on the list and is badged
  // in the panel, so the roster stays whole and the gap stays visible. Digits
  // that are typed but do not normalise are REFUSED: a number that looks
  // complete but cannot be dialled is worse than an obvious blank, because
  // nobody finds out until they are standing beside a broken bus.
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

  // Timestamp rather than a sliced one: the seed writes a dozen contacts in a
  // tight loop, and two adds inside the same few milliseconds would otherwise
  // collide onto one document and silently lose a driver.
  const addContact = async (fields) => {
    const v = validateContact(fields);
    if (!v.ok) {
      showToast(v.error, 'error');
      return false;
    }

    const id = `CONTACT-${Date.now()}`;
    const item = { id, name: v.name, phone: v.phone, route: v.route };

    setEmergencyContacts((prev) => [...prev, item]);
    try {
      await setDoc(doc(db, 'emergencyContacts', id), item);
      showToast(`${v.name} ditambahkan ke kontak darurat.`);
      return true;
    } catch (e) {
      setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
      showToast(`Gagal menyimpan kontak. ${fsError(e)}`, 'error');
      return false;
    }
  };

  const updateContact = async (id, fields) => {
    const before = emergencyContacts.find((c) => c.id === id);
    if (!before) return false;

    const v = validateContact({ ...before, ...fields });
    if (!v.ok) {
      showToast(v.error, 'error');
      return false;
    }

    const item = { ...before, name: v.name, phone: v.phone, route: v.route };
    setEmergencyContacts((prev) => prev.map((c) => (c.id === id ? item : c)));
    try {
      await setDoc(doc(db, 'emergencyContacts', id), item);
      showToast('Kontak diperbarui.');
      return true;
    } catch (e) {
      setEmergencyContacts((prev) => prev.map((c) => (c.id === id ? before : c)));
      showToast(`Gagal memperbarui kontak. ${fsError(e)}`, 'error');
      return false;
    }
  };

  const deleteContact = async (id) => {
    const before = emergencyContacts.find((c) => c.id === id);
    if (!before) return false;

    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteDoc(doc(db, 'emergencyContacts', id));
      showToast(`${before.name} dihapus dari kontak darurat.`);
      return true;
    } catch (e) {
      setEmergencyContacts((prev) => [...prev, before]);
      showToast(`Gagal menghapus kontak. ${fsError(e)}`, 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      isAdmin,
      hasSession,
      signIn,
      signInWithPassword,
      signOut,
      loading,
      users,
      debts,
      expenses,
      vault,
      iuranRecords,
      incidents,
      MONTHS,
      toast,
      showToast,
      adminTab,
      setAdminTab,
      // Cashier actions
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
      // Uploads — base64 thumbnails on the owning document
      updateIncidentPhotos,
      attachIuranProof,
      attachInstallmentProof,
      addIncidentsBulk,
      // Roster management
      addMember,
      addMembersBulk,
      updateMember,
      setMemberActive,
      // Emergency contacts — route dispatch list
      emergencyContacts,
      addContact,
      updateContact,
      deleteContact
    }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
