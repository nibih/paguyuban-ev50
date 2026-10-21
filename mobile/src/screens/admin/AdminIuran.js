import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Search, Check, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react-native';
import { rp } from '../../utils/format';
import { MONTHS } from '../../constants';

// A2: the reconciliation matrix.
//
// Ticking a cell does NOT take money into the till — it queues the month as
// `pending`. A bendahara clears the queue at the top of this screen after
// matching each item against the BSI statement or the counted kas kecil.
// Only `verifyIuran` credits the vault.
export default function AdminIuran() {
  const {
    users, iuranRecords, markIuranPaidCash, verifyIuran, rejectIuran,
    expenses, debts, vault
  } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [expandedNik, setExpandedNik] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  // Every month sitting in the queue, newest claim first.
  const queue = useMemo(() => {
    const out = [];
    users.forEach(u => {
      const rec = iuranRecords[u.nik] || {};
      MONTHS.forEach(m => {
        const d = rec[m];
        if (d?.status === 'pending') {
          out.push({ nik: u.nik, name: u.name, month: m, ...d, key: `${u.nik}-${m}` });
        }
      });
    });
    return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [users, iuranRecords]);

  const pendingTotal = queue.reduce((s, q) => s + (Number(q.nominal) || 0), 0);

  const runVerify = async (item) => {
    setBusyKey(item.key);
    await verifyIuran(item.nik, item.month);
    setBusyKey(null);
  };
  const runReject = async (item) => {
    setBusyKey(item.key);
    await rejectIuran(item.nik, item.month);
    setBusyKey(null);
  };

  const rows = useMemo(() => {
    return users
      .map(u => ({ ...u, rec: iuranRecords[u.nik] || {} }))
      .filter(u => {
        const q = search.trim().toLowerCase();
        if (q && !u.name.toLowerCase().includes(q) && !u.nik.includes(q)) return false;

        const sept = u.rec['September']?.status === 'lunas';
        const ags = u.rec['Agustus']?.status === 'lunas';
        const anyPending = MONTHS.some(m => u.rec[m]?.status === 'pending');
        if (filter === 'Lunas') return sept;
        if (filter === 'Menunggu') return anyPending;
        if (filter === 'Tunggak 1') return !sept && ags;
        if (filter === 'Tunggak >2') return !sept && !ags;
        return true;
      });
  }, [users, iuranRecords, search, filter]);

  const counts = useMemo(() => {
    let lunas = 0, t1 = 0, t2 = 0, pending = 0;
    users.forEach(u => {
      const r = iuranRecords[u.nik] || {};
      if (MONTHS.some(m => r[m]?.status === 'pending')) pending++;
      const sept = r['September']?.status === 'lunas';
      const ags = r['Agustus']?.status === 'lunas';
      if (sept) lunas++;
      else if (ags) t1++;
      else t2++;
    });
    return { Lunas: lunas, 'Tunggak 1': t1, 'Tunggak >2': t2, Menunggu: pending };
  }, [users, iuranRecords]);

  const FILTERS = [
    { key: 'Semua', label: 'Semua', count: users.length },
    { key: 'Menunggu', label: 'Menunggu', count: counts.Menunggu },
    { key: 'Lunas', label: 'Lunas', count: counts.Lunas },
    { key: 'Tunggak 1', label: 'Tunggak 1', count: counts['Tunggak 1'] },
    { key: 'Tunggak >2', label: 'Tunggak >2', count: counts['Tunggak >2'] }
  ];

  const paidCount = (rec) => MONTHS.filter(m => rec[m]?.status === 'lunas').length;

  const renderRow = ({ item }) => {
    const isExpanded = expandedNik === item.nik;
    const paid = paidCount(item.rec);
    const septLunas = item.rec['September']?.status === 'lunas';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => setExpandedNik(isExpanded ? null : item.nik)}
      >
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.rowNik}>
              {item.nik} · {paid}/{MONTHS.length} bulan lunas
            </Text>
          </View>
          <View style={[styles.pill, paid === MONTHS.length ? styles.pillGreen : styles.pillRed]}>
            <Text style={[styles.pillText, paid === MONTHS.length ? styles.pillTextGreen : styles.pillTextRed]}>
              {paid === MONTHS.length ? 'LUNAS' : `${paid} LUNAS`}
            </Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.monthGrid}>
            {MONTHS.map(m => {
              const d = item.rec[m] || {};
              const isLunas = d.status === 'lunas';
              const isPending = d.status === 'pending';
              const isPartial = d.status === 'partial';
              return (
                <TouchableOpacity
                  key={m}
                  disabled={isLunas || isPending}
                  style={[styles.monthCell, isLunas && styles.monthCellLunas, isPending && styles.monthCellPending]}
                  onPress={() => markIuranPaidCash(item.nik, m)}
                >
                  <Text style={[styles.monthName, isLunas && styles.monthNameLunas, isPending && styles.monthNamePending]}>
                    {m.slice(0, 3)}
                  </Text>
                  {isLunas ? (
                    <Check size={13} color="#FFFFFF" />
                  ) : isPending ? (
                    <Clock size={12} color="#92400E" />
                  ) : (
                    <Text style={[styles.monthStatus, isPartial && styles.monthStatusPartial]}>
                      {isPartial ? rp(d.nominal || 0) : '—'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={styles.quickRow}>
              <Clock size={13} color="#D97706" />
              <Text style={styles.quickText}>
                Ketuk bulan untuk ANTREKAN verifikasi. Uang baru masuk kas setelah dicocokkan
                dengan mutasi BSI / kas kecil di panel atas.
              </Text>
            </View>
          </View>
        )}

        {!isExpanded && !septLunas && (
          <View style={styles.warnStrip}>
            <AlertTriangle size={11} color="#D97706" />
            <Text style={styles.warnText}>Belum lunas bulan ini</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Pemasukan iuran — the full recorded history, NOT just what flowed through
  // the app. Most of this book predates the app entirely and came from the
  // bank's own money-in report, so the two provenances are kept visibly
  // separate rather than merged into one confident-looking total:
  //
  //   Laporan Uang Masuk  seeded from the BSI statement — pre-app history
  //   Verifikasi Kasir    confirmed in-app by a bendahara
  //   Menunggu            a claim, worth nothing until confirmed
  //
  // Every `lunas` entry counts as income here regardless of provenance, but
  // `vault` is NOT derived from this. The vault is a separate stored balance.
  const income = useMemo(() => {
    const fromBank = (d) => d?.source === 'Laporan Uang Masuk';

    const rows = MONTHS.map(month => {
      let bank = 0;
      let bankCount = 0;
      let cashier = 0;
      let cashierCount = 0;
      let pending = 0;
      let pendingCount = 0;

      users.forEach(u => {
        const d = iuranRecords[u.nik]?.[month];
        if (!d) return;
        const nominal = Number(d.nominal) || 0;
        if (d.status === 'lunas' && fromBank(d)) {
          bank += nominal; bankCount++;
        } else if (d.status === 'lunas') {
          cashier += nominal; cashierCount++;
        } else if (d.status === 'pending') {
          pending += nominal; pendingCount++;
        }
      });

      return { month, bank, bankCount, cashier, cashierCount, pending, pendingCount };
    });

    return {
      rows,
      totalBank: rows.reduce((a, r) => a + r.bank, 0),
      totalCashier: rows.reduce((a, r) => a + r.cashier, 0),
      totalPending: rows.reduce((a, r) => a + r.pending, 0),
      get totalRecorded() { return this.totalBank + this.totalCashier; }
    };
  }, [users, iuranRecords]);

  // Reconciliation of recorded cash movement against the vault.
  //
  // This deliberately does NOT assert that the books balance, because with the
  // data currently held they cannot, and printing a tidy equation that
  // "closes" would be a lie a cashier would eventually discover the hard way.
  // Two concrete gaps are computed and named instead:
  //
  //   1. The expense book only covers September, while iuran spans five
  //      months, so four months of spending are simply absent.
  //   2. Some talangan advances were booked as expenses AND as debt
  //      principal, so subtracting both would double-count them.
  const recon = useMemo(() => {
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // A talangan expense that also has a matching debt card is the same
    // money recorded twice.
    const overlap = expenses
      .filter(e => e.category === 'Talangan')
      .filter(e => debts.some(d => d.amount === e.amount && norm(d.name).includes(norm(e.pic))))
      .reduce((a, e) => a + (e.amount || 0), 0);

    const expenseMonths = [...new Set(expenses.map(e => String(e.date || '').slice(0, 7)))]
      .filter(Boolean).sort();

    return {
      vaultTotal: (vault.bsiBalance || 0) + (vault.pettyCash || 0),
      totalExpense: expenses.reduce((a, e) => a + (e.amount || 0), 0),
      talanganOutstanding: debts.reduce((a, d) => a + (d.amount - d.paid), 0),
      overlap,
      expenseMonths,
      monthsCovered: expenseMonths.length,
      monthsWanted: MONTHS.length
    };
  }, [expenses, debts, vault]);

  return (
    <View style={{ flex: 1 }}>
      {/* Pemasukan iuran — the full history, both provenances kept apart */}
      <View style={styles.incomeCard}>
        <View style={styles.incomeHead}>
          <Text style={styles.incomeTitle}>PEMASUKAN IURAN</Text>
          <Text style={styles.incomeGrand} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{rp(income.totalRecorded)}</Text>
        </View>
        <Text style={styles.incomeNote}>
          Total seluruh riwayat iuran yang tercatat, termasuk data sebelum aplikasi ada.
          Angka ini arus masuk kumulatif, BUKAN saldo kas saat ini — lihat panel Rekonsiliasi
          di bawah untuk hubungannya.
        </Text>

        {/* Provenance legend */}
        <View style={styles.provLegend}>
          <View style={styles.provChip}>
            <View style={[styles.provDot, { backgroundColor: '#0B2F64' }]} />
            <Text style={styles.provChipText}>Laporan Uang Masuk</Text>
          </View>
          <View style={styles.provChip}>
            <View style={[styles.provDot, { backgroundColor: '#059669' }]} />
            <Text style={styles.provChipText}>Verifikasi Kasir</Text>
          </View>
          <View style={styles.provChip}>
            <View style={[styles.provDot, { backgroundColor: '#D97706' }]} />
            <Text style={styles.provChipText}>Menunggu</Text>
          </View>
        </View>

        {income.rows.map(r => (
          <View key={r.month} style={styles.incomeMonthBlock}>
            <View style={styles.incomeRow}>
              <Text style={styles.incomeMonth}>{r.month}</Text>
              <Text style={styles.incomeMonthTotal}>
                {rp(r.bank + r.cashier)}
              </Text>
            </View>

            {r.bank > 0 && (
              <View style={styles.incomeProvRow}>
                <View style={[styles.provDot, { backgroundColor: '#0B2F64' }]} />
                <Text style={styles.incomeProvLabel}>Laporan Uang Masuk</Text>
                <Text style={styles.incomeProvValBank}>{rp(r.bank)}</Text>
              </View>
            )}
            {r.cashier > 0 && (
              <View style={styles.incomeProvRow}>
                <View style={[styles.provDot, { backgroundColor: '#059669' }]} />
                <Text style={styles.incomeProvLabel}>Verifikasi Kasir</Text>
                <Text style={styles.incomeProvValBank}>{rp(r.cashier)}</Text>
              </View>
            )}
            {r.pending > 0 && (
              <View style={styles.incomePendingRow}>
                <Clock size={11} color="#D97706" />
                <Text style={styles.incomePendingLabel}>Menunggu verifikasi</Text>
                <Text style={styles.incomePendingVal}>{rp(r.pending)}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.incomeTotalRow}>
          <Text style={styles.incomeTotalLabel}>DARI LAPORAN BANK (SEBELUM APLIKASI)</Text>
          <Text style={styles.incomeTotalValBank}>{rp(income.totalBank)}</Text>
        </View>
        <View style={styles.incomeTotalRow}>
          <Text style={styles.incomeTotalLabel}>DARI VERIFIKASI KASIR (LEWAT APLIKASI)</Text>
          <Text style={styles.incomeTotalValBank}>{rp(income.totalCashier)}</Text>
        </View>
        {income.totalPending > 0 && (
          <View style={styles.incomeTotalRowPending}>
            <Text style={styles.incomeTotalLabelPending}>MENUNGGU VERIFIKASI</Text>
            <Text style={styles.incomeTotalValPending}>{rp(income.totalPending)}</Text>
          </View>
        )}
      </View>

      {/* Rekonsiliasi — links the ledger to the vault without pretending */}
      <View style={styles.reconCard}>
        <Text style={styles.reconTitle}>REKONSILIASI TERHADAP KAS</Text>
        <Text style={styles.reconNote}>
          Iuran di atas adalah arus masuk sejak data dicatat. Kas adalah saldo yang tersisa
          setelah pengeluaran dan talangan. Keduanya memang angka berbeda.
        </Text>

        <View style={styles.reconRow}>
          <Text style={styles.reconLabel}>Pemasukan iuran tercatat</Text>
          <Text style={styles.reconVal}>{rp(income.totalRecorded)}</Text>
        </View>
        <View style={styles.reconRow}>
          <Text style={styles.reconLabel}>Pengeluaran tercatat</Text>
          <Text style={[styles.reconVal, { color: '#E11D48' }]}>
            −{rp(recon.totalExpense)}
          </Text>
        </View>
        <View style={styles.reconRow}>
          <Text style={styles.reconLabel}>Saldo kas saat ini (BSI + Kas Kecil)</Text>
          <Text style={[styles.reconVal, { fontWeight: '900', color: '#0F172A' }]}>
            {rp(recon.vaultTotal)}
          </Text>
        </View>
        <View style={styles.reconRow}>
          <Text style={styles.reconLabel}>Piutang talangan belum kembali</Text>
          <Text style={[styles.reconVal, { color: '#D97706' }]}>
            {rp(recon.talanganOutstanding)}
          </Text>
        </View>

        <Text style={styles.reconGapTitle}>CATATAN REKONSILIASI</Text>
        <Text style={styles.reconGapText}>
          • Buku pengeluaran hanya mencakup {recon.monthsCovered} dari {recon.monthsWanted} bulan,
          sehingga sebagian pengeluaran tidak ikut terhitung di sini.
        </Text>
        {recon.overlap > 0 && (
          <Text style={styles.reconGapText}>
            • Sebagian dana talangan tercatat dua kali: sebagai pengeluaran sekaligus sebagai
            pokok piutang ({rp(recon.overlap)}). Keduanya uang yang sama.
          </Text>
        )}
        <Text style={styles.reconGapText}>
          • Karena itu selisih di atas tidak dipaksakan agar tampak seimbang. Cocokkan dengan
          mutasi BSI sungguhan sebelum dipakai sebagai laporan resmi rapat.
        </Text>
      </View>

      {queue.length > 0 && (
        <View style={styles.queueCard}>
          <View style={styles.queueHead}>
            <Clock size={14} color="#D97706" />
            <Text style={styles.queueTitle}>MENUNGGU VERIFIKASI ({queue.length})</Text>
            <Text style={styles.queueTotal}>{rp(pendingTotal)}</Text>
          </View>
          <Text style={styles.queueNote}>
            Belum masuk kas. Cocokkan dulu dengan mutasi BSI / hitung kas kecil.
          </Text>
          {queue.slice(0, 25).map(q => (
            <View key={q.key} style={styles.queueRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueName}>{q.name}</Text>
                <Text style={styles.queueMeta}>
                  {q.month} · {q.method} · {rp(q.nominal || 0)}
                  {q.markedBy ? ` · ditandai ${q.markedBy}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.qBtn, styles.qBtnOk, busyKey === q.key && styles.qBtnDisabled]}
                disabled={busyKey === q.key}
                onPress={() => runVerify(q)}
              >
                <Check size={13} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qBtn, styles.qBtnNo, busyKey === q.key && styles.qBtnDisabled]}
                disabled={busyKey === q.key}
                onPress={() => runReject(q)}
              >
                <X size={13} color="#E11D48" />
              </TouchableOpacity>
            </View>
          ))}
          {queue.length > 25 && (
            <Text style={styles.queueMore}>+{queue.length - 25} antrean lainnya</Text>
          )}
        </View>
      )}

      <View style={styles.searchWrap}>
        <Search size={15} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama atau NIK pramudi..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label} ({f.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.count}>{rows.length} pramudi ditampilkan</Text>

      <FlatList
        data={rows}
        keyExtractor={u => u.nik}
        renderItem={renderRow}
        initialNumToRender={12}
        windowSize={10}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  provLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  provChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  provDot: { width: 7, height: 7, borderRadius: 4 },
  provChipText: { fontSize: 9, color: '#64748B', fontWeight: '600' },

  incomeMonthBlock: {
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 7, marginTop: 7
  },
  incomeMonthTotal: { fontSize: 11, fontWeight: '900', color: '#0F172A', fontVariant: ['tabular-nums'] },
  incomeProvRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 14, paddingVertical: 3
  },
  incomeProvLabel: { flex: 1, fontSize: 10, color: '#64748B' },
  incomeProvValBank: { fontSize: 10, fontWeight: '700', color: '#0F172A', fontVariant: ['tabular-nums'] },
  incomeTotalValBank: { fontSize: 12, fontWeight: '900', color: '#0F172A', fontVariant: ['tabular-nums'] },

  reconCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
    borderColor: '#E2E8F0', padding: 12, marginBottom: 12
  },
  reconTitle: { fontSize: 10, fontWeight: '900', color: '#0F172A', letterSpacing: 0.8 },
  reconNote: { fontSize: 9, color: '#94A3B8', marginTop: 4, marginBottom: 8, lineHeight: 13 },
  reconRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 8, marginTop: 5
  },
  reconLabel: { flex: 1, fontSize: 10, color: '#64748B' },
  reconVal: { fontSize: 11, fontWeight: 'bold', color: '#0F172A', fontVariant: ['tabular-nums'] },
  reconGapTitle: { fontSize: 9, fontWeight: '900', color: '#92400E', marginTop: 12, marginBottom: 4 },
  reconGapText: { fontSize: 9, color: '#B45309', lineHeight: 14, marginBottom: 4 },

  incomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12
  },
  incomeHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between'
  },
  incomeTitle: { fontSize: 10, fontWeight: '900', color: '#0F172A', letterSpacing: 0.8 },
  incomeGrand: { fontSize: 14, fontWeight: '900', color: '#059669', fontVariant: ['tabular-nums'] },
  incomeNote: { fontSize: 9, color: '#94A3B8', marginTop: 4, marginBottom: 10, lineHeight: 13 },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 6
  },
  incomeMonth: { fontSize: 11, fontWeight: 'bold', color: '#166534' },
  incomePendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 4
  },
  incomePendingLabel: { flex: 1, fontSize: 9, fontWeight: '700', color: '#92400E' },
  incomePendingVal: { fontSize: 9, fontWeight: '900', color: '#D97706', fontVariant: ['tabular-nums'] },
  incomeTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingTop: 9,
    marginTop: 10
  },
  incomeTotalLabel: { fontSize: 10, fontWeight: '900', color: '#166534' },
  incomeTotalRowPending: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    paddingTop: 9,
    marginTop: 8
  },
  incomeTotalLabelPending: { fontSize: 10, fontWeight: '900', color: '#92400E' },
  incomeTotalValPending: { fontSize: 12, fontWeight: '900', color: '#D97706', fontVariant: ['tabular-nums'] },

  queueCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 12
  },
  queueHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  queueTitle: { flex: 1, fontSize: 10, fontWeight: '900', color: '#92400E' },
  queueTotal: { fontSize: 11, fontWeight: '900', color: '#92400E', fontVariant: ['tabular-nums'] },
  queueNote: { fontSize: 9, color: '#B45309', marginTop: 3, marginBottom: 8, lineHeight: 13 },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 8,
    marginBottom: 6
  },
  queueName: { fontSize: 11, fontWeight: 'bold', color: '#0F172A' },
  queueMeta: { fontSize: 9, color: '#94A3B8', marginTop: 1 },
  queueMore: { fontSize: 9, color: '#B45309', marginTop: 2 },
  qBtn: {
    width: 30, height: 30, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center'
  },
  qBtnOk: { backgroundColor: '#059669' },
  qBtnNo: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA' },
  qBtnDisabled: { opacity: 0.4 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 12, color: '#0F172A', padding: 0 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 12, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E2E8F0'
  },
  filterChipActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  filterText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },

  count: { fontSize: 10, color: '#94A3B8', marginVertical: 10 },

  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  rowNik: { fontSize: 10, color: '#94A3B8', marginTop: 1, fontVariant: ['tabular-nums'] },

  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillGreen: { backgroundColor: '#D1FAE5' },
  pillRed: { backgroundColor: '#FEF2F2' },
  pillText: { fontSize: 9, fontWeight: '900' },
  pillTextGreen: { color: '#059669' },
  pillTextRed: { color: '#E11D48' },

  warnStrip: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  warnText: { fontSize: 9, color: '#D97706', fontWeight: '600' },

  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  monthCell: {
    width: '18.5%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  monthCellLunas: { backgroundColor: '#059669', borderColor: '#059669' },
  monthCellPending: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  monthName: { fontSize: 8, fontWeight: '900', color: '#991B1B' },
  monthNameLunas: { color: '#FFFFFF' },
  monthNamePending: { color: '#92400E' },
  monthStatus: { fontSize: 7, fontWeight: 'bold', color: '#991B1B' },
  monthStatusPartial: { color: '#D97706' },

  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, width: '100%' },
  quickText: { fontSize: 9, color: '#64748B', flex: 1, lineHeight: 13 }
});
