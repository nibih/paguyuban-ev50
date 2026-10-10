import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../context/AppContext';

// A1: cash position at a glance. Read-only — the other tabs do the writing.
export default function AdminKas() {
  const { vault, expenses, debts, users, incidents } = useApp();

  const totalExpense = expenses.reduce((a, b) => a + (b.amount || 0), 0);
  const outstanding = debts.reduce((a, b) => a + (b.amount - b.paid), 0);
  const activeDebts = debts.filter(d => (d.amount - d.paid) > 0).length;
  const openIncidents = incidents.filter(i => !String(i.status).includes('Selesai')).length;

  // Cash on hand is what the paguyuban actually controls; the BSI balance is
  // the bank-held half. Both are shown because drivers ask about both.
  const cashOnHand = vault.pettyCash + vault.bsiBalance;

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
  bankHolder: { fontSize: 11, color: '#94A3B8', marginTop: 2 }
});
