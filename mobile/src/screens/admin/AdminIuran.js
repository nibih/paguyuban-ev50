import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Search, Check, CheckCircle2, AlertTriangle } from 'lucide-react-native';

const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];

// A2: the reconciliation matrix. Ticking a cell takes cash into the till, so
// every tap runs through the transactional markIuranPaidCash in the context.
export default function AdminIuran() {
  const { users, iuranRecords, markIuranPaidCash } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [expandedNik, setExpandedNik] = useState(null);

  const rows = useMemo(() => {
    return users
      .map(u => ({ ...u, rec: iuranRecords[u.nik] || {} }))
      .filter(u => {
        const q = search.trim().toLowerCase();
        if (q && !u.name.toLowerCase().includes(q) && !u.nik.includes(q)) return false;

        const sept = u.rec['September']?.status === 'lunas';
        const ags = u.rec['Agustus']?.status === 'lunas';
        if (filter === 'Lunas') return sept;
        if (filter === 'Tunggak 1') return !sept && ags;
        if (filter === 'Tunggak >2') return !sept && !ags;
        return true;
      });
  }, [users, iuranRecords, search, filter]);

  const counts = useMemo(() => {
    let lunas = 0, t1 = 0, t2 = 0;
    users.forEach(u => {
      const r = iuranRecords[u.nik] || {};
      const sept = r['September']?.status === 'lunas';
      const ags = r['Agustus']?.status === 'lunas';
      if (sept) lunas++;
      else if (ags) t1++;
      else t2++;
    });
    return { Lunas: lunas, 'Tunggak 1': t1, 'Tunggak >2': t2 };
  }, [users, iuranRecords]);

  const FILTERS = [
    { key: 'Semua', label: 'Semua', count: users.length },
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
              const isPartial = d.status === 'partial';
              return (
                <TouchableOpacity
                  key={m}
                  disabled={isLunas}
                  style={[styles.monthCell, isLunas && styles.monthCellLunas]}
                  onPress={() => markIuranPaidCash(item.nik, m)}
                >
                  <Text style={[styles.monthName, isLunas && styles.monthNameLunas]}>{m.slice(0, 3)}</Text>
                  {isLunas ? (
                    <Check size={13} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.monthStatus, isPartial && styles.monthStatusPartial]}>
                      {isPartial ? `Rp${(d.nominal || 0).toLocaleString('id-ID')}` : '—'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={styles.quickRow}>
              <CheckCircle2 size={13} color="#059669" />
              <Text style={styles.quickText}>
                Ketuk bulan untuk tandai Lunas Tunai (+Rp100.000 ke Kas Kecil)
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

  return (
    <View style={{ flex: 1 }}>
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
  monthName: { fontSize: 8, fontWeight: '900', color: '#991B1B' },
  monthNameLunas: { color: '#FFFFFF' },
  monthStatus: { fontSize: 7, fontWeight: 'bold', color: '#991B1B' },
  monthStatusPartial: { color: '#D97706' },

  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, width: '100%' },
  quickText: { fontSize: 9, color: '#64748B', flex: 1, lineHeight: 13 }
});
