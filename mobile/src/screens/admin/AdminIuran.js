import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Search, Check, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react-native';

const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];

// A2: the reconciliation matrix.
//
// Ticking a cell does NOT take money into the till — it queues the month as
// `pending`. A bendahara clears the queue at the top of this screen after
// matching each item against the BSI statement or the counted kas kecil.
// Only `verifyIuran` credits the vault.
export default function AdminIuran() {
  const { users, iuranRecords, markIuranPaidCash, verifyIuran, rejectIuran } = useApp();
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
                      {isPartial ? `Rp${(d.nominal || 0).toLocaleString('id-ID')}` : '—'}
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

  // Pemasukan iuran: one row per month, split between what the bendahara has
  // CONFIRMED (this is the money that is genuinely in the vault) and what is
  // still only a claim sitting in the queue. Showing them side by side is the
  // whole point — conflating the two is how Rp1.200.000 of test taps became
  // financial history.
  const income = useMemo(() => {
    const rows = MONTHS.map(month => {
      const perMethod = {};
      let verified = 0;
      let pending = 0;
      let verifiedCount = 0;
      let pendingCount = 0;

      users.forEach(u => {
        const d = iuranRecords[u.nik]?.[month];
        if (!d) return;
        const nominal = Number(d.nominal) || 0;
        if (d.status === 'lunas') {
          verified += nominal;
          verifiedCount++;
          const m = d.method || 'Lainnya';
          perMethod[m] = (perMethod[m] || 0) + nominal;
        } else if (d.status === 'pending') {
          pending += nominal;
          pendingCount++;
        }
      });

      return { month, verified, pending, verifiedCount, pendingCount, perMethod };
    });

    return {
      rows,
      totalVerified: rows.reduce((a, r) => a + r.verified, 0),
      totalPending: rows.reduce((a, r) => a + r.pending, 0),
      methods: rows.reduce((acc, r) => {
        Object.entries(r.perMethod).forEach(([m, v]) => { acc[m] = (acc[m] || 0) + v; });
        return acc;
      }, {})
    };
  }, [users, iuranRecords]);

  return (
    <View style={{ flex: 1 }}>
      {/* Pemasukan iuran ledger */}
      <View style={styles.incomeCard}>
        <View style={styles.incomeHead}>
          <Text style={styles.incomeTitle}>PEMASUKAN IURAN</Text>
          <Text style={styles.incomeGrand}>Rp{income.totalVerified.toLocaleString('id-ID')}</Text>
        </View>
        <Text style={styles.incomeNote}>
          Baris hijau = sudah diverifikasi bendahara dan sudah masuk kas.
          Baris kuning = masih klaim, belum dihitung sebagai pemasukan.
        </Text>

        {income.rows.map(r => (
          <View key={r.month}>
            <View style={styles.incomeRow}>
              <Text style={styles.incomeMonth}>{r.month}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.incomeVerified}>Rp{r.verified.toLocaleString('id-ID')}</Text>
                {r.verifiedCount > 0 && (
                  <Text style={styles.incomeMeta}>{r.verifiedCount} pramudi</Text>
                )}
              </View>
            </View>

            {Object.entries(r.perMethod).map(([m, v]) => (
              <View key={m} style={styles.incomeMethod}>
                <Text style={styles.incomeMethodLabel}>{m}</Text>
                <Text style={styles.incomeMethodVal}>Rp{v.toLocaleString('id-ID')}</Text>
              </View>
            ))}

            {r.pending > 0 && (
              <View style={styles.incomePendingRow}>
                <Clock size={11} color="#D97706" />
                <Text style={styles.incomePendingLabel}>Menunggu verifikasi</Text>
                <Text style={styles.incomePendingVal}>Rp{r.pending.toLocaleString('id-ID')}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.incomeTotalRow}>
          <Text style={styles.incomeTotalLabel}>TOTAL TERVERIFIKASI</Text>
          <Text style={styles.incomeTotalVal}>Rp{income.totalVerified.toLocaleString('id-ID')}</Text>
        </View>
        {income.totalPending > 0 && (
          <View style={styles.incomeTotalRowPending}>
            <Text style={styles.incomeTotalLabelPending}>TOTAL BELUM VERIFIKASI</Text>
            <Text style={styles.incomeTotalValPending}>Rp{income.totalPending.toLocaleString('id-ID')}</Text>
          </View>
        )}
      </View>

      {queue.length > 0 && (
        <View style={styles.queueCard}>
          <View style={styles.queueHead}>
            <Clock size={14} color="#D97706" />
            <Text style={styles.queueTitle}>MENUNGGU VERIFIKASI ({queue.length})</Text>
            <Text style={styles.queueTotal}>Rp{pendingTotal.toLocaleString('id-ID')}</Text>
          </View>
          <Text style={styles.queueNote}>
            Belum masuk kas. Cocokkan dulu dengan mutasi BSI / hitung kas kecil.
          </Text>
          {queue.slice(0, 25).map(q => (
            <View key={q.key} style={styles.queueRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueName}>{q.name}</Text>
                <Text style={styles.queueMeta}>
                  {q.month} · {q.method} · Rp{(q.nominal || 0).toLocaleString('id-ID')}
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
  incomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
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
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 6
  },
  incomeMonth: { fontSize: 11, fontWeight: 'bold', color: '#166534' },
  incomeVerified: { fontSize: 11, fontWeight: '900', color: '#059669', fontVariant: ['tabular-nums'] },
  incomeMeta: { fontSize: 8, color: '#4ADE80', marginTop: 1 },
  incomeMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 22,
    paddingRight: 9,
    paddingVertical: 3
  },
  incomeMethodLabel: { fontSize: 9, color: '#94A3B8' },
  incomeMethodVal: { fontSize: 9, color: '#64748B', fontVariant: ['tabular-nums'] },
  incomePendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
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
  incomeTotalVal: { fontSize: 12, fontWeight: '900', color: '#059669', fontVariant: ['tabular-nums'] },
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
    borderRadius: 14,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 8,
    marginBottom: 6
  },
  queueName: { fontSize: 11, fontWeight: 'bold', color: '#0F172A' },
  queueMeta: { fontSize: 9, color: '#94A3B8', marginTop: 1 },
  queueMore: { fontSize: 9, color: '#B45309', marginTop: 2 },
  qBtn: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center'
  },
  qBtnOk: { backgroundColor: '#059669' },
  qBtnNo: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA' },
  qBtnDisabled: { opacity: 0.4 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 12, color: '#0F172A', padding: 0 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 11, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E2E8F0'
  },
  filterChipActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  filterText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },

  count: { fontSize: 10, color: '#94A3B8', marginVertical: 10 },

  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  rowNik: { fontSize: 10, color: '#94A3B8', marginTop: 1, fontVariant: ['tabular-nums'] },

  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
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
    borderRadius: 10,
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
