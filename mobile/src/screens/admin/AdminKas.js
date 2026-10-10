import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { FileSpreadsheet } from 'lucide-react-native';
import { iuranCsv, expenseCsv, debtCsv, incidentCsv, exportCsv } from '../../utils/csvExport';

const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];

// A1: cash position at a glance. Read-only — the other tabs do the writing.
export default function AdminKas() {
  const { vault, expenses, debts, users, incidents, iuranRecords } = useApp();
  const [exporting, setExporting] = useState(null);

  const totalExpense = expenses.reduce((a, b) => a + (b.amount || 0), 0);
  const outstanding = debts.reduce((a, b) => a + (b.amount - b.paid), 0);
  const activeDebts = debts.filter(d => (d.amount - d.paid) > 0).length;
  const openIncidents = incidents.filter(i => !String(i.status).includes('Selesai')).length;

  // Cash on hand is what the paguyuban actually controls; the BSI balance is
  // the bank-held half. Both are shown because drivers ask about both.
  const cashOnHand = vault.pettyCash + vault.bsiBalance;

  const stamp = new Date().toISOString().slice(0, 10);

  const doExport = async (kind) => {
    setExporting(kind);
    try {
      let csv;
      let name;
      switch (kind) {
        case 'iuran':
          csv = iuranCsv(users, iuranRecords, MONTHS);
          name = `iuran-paguyuban-${stamp}.csv`;
          break;
        case 'expenses':
          csv = expenseCsv(expenses);
          name = `pengeluaran-${stamp}.csv`;
          break;
        case 'debts':
          csv = debtCsv(debts);
          name = `piutang-talangan-${stamp}.csv`;
          break;
        case 'incidents':
          csv = incidentCsv(incidents);
          name = `logbook-armada-${stamp}.csv`;
          break;
        default:
          return;
      }
      await exportCsv(csv, name);
    } catch (e) {
      // A cancelled share sheet rejects on some platforms — that's not an
      // error worth alarming the cashier over.
      if (!/cancel/i.test(e?.message || '')) {
        Alert.alert('Export gagal', e?.message || 'Coba lagi.');
      }
    } finally {
      setExporting(null);
    }
  };

  const EXPORTS = [
    { key: 'iuran', label: 'Matriks Iuran', sub: `${users.length} pramudi × ${MONTHS.length} bulan` },
    { key: 'expenses', label: 'Buku Pengeluaran', sub: `${expenses.length} transaksi` },
    { key: 'debts', label: 'Buku Piutang', sub: `${debts.length} kartu talangan` },
    { key: 'incidents', label: 'Logbook Armada', sub: `${incidents.length} laporan bodi` }
  ];

  const KPIS = [
    { label: 'KAS KECIL TUNAI', value: vault.pettyCash, color: '#0F172A', sub: 'PJ: Moh Abdul Kholiq' },
    { label: 'REKENING BSI', value: vault.bsiBalance, color: '#0B2F64', sub: `No. Rek ${vault.accountNo}` },
    { label: 'PENGELUARAN SEPT', value: totalExpense, color: '#E11D48', sub: `${expenses.length} Transaksi` },
    { label: 'PIUTANG TALANGAN', value: outstanding, color: '#D97706', sub: `${activeDebts} Anggota Berhutang` }
  ];

  return (
    <View>
      {/* Total position banner */}
      <View style={styles.totalBanner}>
        <Text style={styles.totalLabel}>TOTAL ASET KAS PAGUYUBAN</Text>
        <Text style={styles.totalValue}>Rp{cashOnHand.toLocaleString('id-ID')}</Text>
        <Text style={styles.totalSub}>
          Tunai Rp{vault.pettyCash.toLocaleString('id-ID')} + Bank Rp{vault.bsiBalance.toLocaleString('id-ID')}
        </Text>
      </View>

      <View style={styles.kpiGrid}>
        {KPIS.map(k => (
          <View key={k.label} style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>{k.label}</Text>
            <Text style={[styles.kpiVal, { color: k.color }]}>
              Rp{k.value.toLocaleString('id-ID')}
            </Text>
            <Text style={styles.kpiSub}>{k.sub}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>RINGKASAN OPERASIONAL</Text>
        <Row label="Pramudi terdaftar" value={`${users.length} orang`} />
        <Row label="Kartu piutang aktif" value={`${activeDebts} dari ${debts.length} kartu`} />
        <Row label="Laporan bodi belum selesai" value={`${openIncidents} laporan`} />
        <Row
          label="Rasio piutang terhadap kas"
          value={cashOnHand > 0 ? `${Math.round((outstanding / cashOnHand) * 100)}%` : '—'}
          last
        />
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>REKENING PENAMPUNG RESMI</Text>
        <Text style={styles.bankName}>{vault.bankName}</Text>
        <Text style={styles.bankNo}>No. Rek {vault.accountNo}</Text>
        <Text style={styles.bankHolder}>a.n {vault.accountHolder}</Text>
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>EXPORT LAPORAN CSV (RAPAT BULANAN DAMRI)</Text>
        <Text style={styles.exportHint}>
          Berkas .csv langsung bisa dibuka di Excel ataupun dibagikan ke grup WhatsApp depo.
        </Text>
        {EXPORTS.map(x => {
          const busy = exporting === x.key;
          return (
            <TouchableOpacity
              key={x.key}
              style={styles.exportRow}
              onPress={() => doExport(x.key)}
              disabled={!!exporting}
              activeOpacity={0.8}
            >
              <View style={styles.exportIcon}>
                {busy
                  ? <ActivityIndicator size="small" color="#0B2F64" />
                  : <FileSpreadsheet size={15} color="#0B2F64" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportLabel}>{x.label}</Text>
                <Text style={styles.exportSub}>{x.sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  totalBanner: {
    backgroundColor: '#0B2F64',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14
  },
  totalLabel: { color: '#00A896', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  totalValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginVertical: 4 },
  totalSub: { color: '#94A3B8', fontSize: 11 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  kpiLabel: { fontSize: 9, fontWeight: '900', color: '#64748B' },
  kpiVal: { fontSize: 15, fontWeight: '900', marginVertical: 4 },
  kpiSub: { fontSize: 10, color: '#94A3B8' },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardTitle: { fontSize: 10, fontWeight: '900', color: '#0F172A', letterSpacing: 0.8, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowLabel: { fontSize: 12, color: '#64748B' },
  rowValue: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },

  bankName: { fontSize: 13, fontWeight: 'bold', color: '#0F172A' },
  bankNo: { fontSize: 12, color: '#475569', marginTop: 2, fontVariant: ['tabular-nums'] },
  bankHolder: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  exportHint: { fontSize: 10, color: '#94A3B8', marginBottom: 10, lineHeight: 15 },
  exportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    padding: 11, marginBottom: 8
  },
  exportIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center'
  },
  exportLabel: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  exportSub: { fontSize: 10, color: '#94A3B8', marginTop: 1 }
});
