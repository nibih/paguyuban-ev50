import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import { BarChart3, Users, DollarSign, AlertCircle, Wrench, ShieldCheck } from 'lucide-react-native';

export default function AdminDashboard() {
  const { vault, expenses, debts, users } = useApp();

  const totalExpense = expenses.reduce((a, b) => a + b.amount, 0);
  const totalDebts = debts.reduce((a, b) => a + (b.amount - b.paid), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.adminHeader}>
        <View>
          <Text style={styles.adminTag}>MODE PENGURUS / KASIR</Text>
          <Text style={styles.adminTitle}>Afrizal Pirmansyah</Text>
        </View>
        <View style={styles.badgeOnline}>
          <Text style={styles.badgeOnlineText}>Live SBU Cawang</Text>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>KAS KECIL TUNAI</Text>
          <Text style={styles.kpiVal}>Rp{vault.pettyCash.toLocaleString('id-ID')}</Text>
          <Text style={styles.kpiSub}>PJ: Moh Abdul Khaliq</Text>
        </View>

        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>REKENING BSI</Text>
          <Text style={[styles.kpiVal, { color: '#0B2F64' }]}>Rp{vault.bsiBalance.toLocaleString('id-ID')}</Text>
          <Text style={styles.kpiSub}>No. Rek 720510945</Text>
        </View>

        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>PENGELUARAN SEPT</Text>
          <Text style={[styles.kpiVal, { color: '#E11D48' }]}>Rp{totalExpense.toLocaleString('id-ID')}</Text>
          <Text style={styles.kpiSub}>15 Transaksi Valid</Text>
        </View>

        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>TOTAL PIUTANG TALANG</Text>
          <Text style={[styles.kpiVal, { color: '#D97706' }]}>Rp{totalDebts.toLocaleString('id-ID')}</Text>
          <Text style={styles.kpiSub}>{debts.length} Anggota Berhutang</Text>
        </View>
      </View>

      {/* 126 Members Summary */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
          <Users size={18} color="#0B2F64" />
          <Text style={styles.cardTitle}>DAFTAR 126 PRAMUDI CAWANG (EXCEL SYNC)</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 18 }}>
          Database telah disinkronkan langsung dari file referensi "laporan teknik 1.xlsx" & "pendapatan paguyuban.xlsx" mencakup seluruh pramudi dari A Sutriadi, Abdul Rochman, hingga pengurus korlap.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B2F64',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16
  },
  adminTag: { color: '#00A896', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  adminTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  badgeOnline: { backgroundColor: 'rgba(0, 168, 150, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeOnlineText: { color: '#5EEAD4', fontSize: 10, fontWeight: 'bold' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  kpiLabel: { fontSize: 9, fontWeight: 'bold', color: '#64748B' },
  kpiVal: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginVertical: 4 },
  kpiSub: { fontSize: 10, color: '#94A3B8' },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' }
});
