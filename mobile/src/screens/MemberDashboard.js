import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import { ShieldCheck, CreditCard, AlertCircle, Wrench, HeartHandshake, CheckCircle } from 'lucide-react-native';

export default function MemberDashboard({ navigation }) {
  const { currentUser, iuranRecords, debts, vault } = useApp();

  const userIuran = iuranRecords[currentUser.nik] || {};
  const isPaid = userIuran['September']?.status === 'lunas';

  const userDebt = debts.find(d => d.nik === currentUser.nik);
  const remainingDebt = userDebt ? (userDebt.amount - userDebt.paid) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{currentUser.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.driverName}>{currentUser.name}</Text>
          <Text style={styles.driverSub}>NIK: {currentUser.nik} • {currentUser.position || 'Pramudi EV 50'}</Text>
        </View>
        <View style={styles.activeDot} />
      </View>

      {/* Hero Monthly Due Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroCategory}>IURAN BULANAN</Text>
          {isPaid ? (
            <View style={styles.badgePaid}>
              <Text style={styles.badgePaidText}>✓ Lunas Kas</Text>
            </View>
          ) : (
            <View style={styles.badgeUnpaid}>
              <Text style={styles.badgeUnpaidText}>Belum Bayar</Text>
            </View>
          )}
        </View>
        <Text style={styles.heroTitle}>September 2026</Text>
        <Text style={styles.heroAmount}>Rp100.000</Text>
        
        {!isPaid ? (
          <TouchableOpacity 
            style={styles.payBtn}
            onPress={() => navigation.navigate('Iuran')}
          >
            <CreditCard size={18} color="#0B2F64" />
            <Text style={styles.payBtnText}>Bayar Iuran Sekarang</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.paidNotice}>Terverifikasi Bendahara Kas Paguyuban</Text>
        )}
      </View>

      {/* Vault Mini Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>KAS BERJALAN</Text>
          <Text style={styles.statVal}>Rp{vault.pettyCash.toLocaleString('id-ID')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>REKENING BSI</Text>
          <Text style={styles.statVal}>Rp12.45 Jt</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>HUTANG SAYA</Text>
          <Text style={[styles.statVal, { color: remainingDebt > 0 ? '#E11D48' : '#059669' }]}>
            Rp{remainingDebt.toLocaleString('id-ID')}
          </Text>
        </View>
      </View>

      {/* Action Shortcut Buttons */}
      <View style={styles.quickGrid}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Iuran')}>
          <CreditCard size={22} color="#0284C7" />
          <Text style={styles.quickText}>Bayar Iuran</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Talangan')}>
          <AlertCircle size={22} color="#D97706" />
          <Text style={styles.quickText}>Kartu Utang</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Lapor Perbaikan')}>
          <Wrench size={22} color="#00A896" />
          <Text style={styles.quickText}>Lapor Bodi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Kas Terbuka')}>
          <ShieldCheck size={22} color="#4F46E5" />
          <Text style={styles.quickText}>Kas Terbuka</Text>
        </TouchableOpacity>
      </View>

      {/* Solidaritas Feed */}
      <View style={styles.feedCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <HeartHandshake size={18} color="#E11D48" />
          <Text style={styles.feedHeader}> Penyaluran Solidaritas Terkini</Text>
        </View>

        <View style={styles.feedItem}>
          <Text style={styles.feedTitle}>Bansos Rawat Inap - Jonaemson G.</Text>
          <Text style={styles.feedNominal}>- Rp300.000</Text>
        </View>
        <View style={styles.feedItem}>
          <Text style={styles.feedTitle}>Santunan Laka - Effendi</Text>
          <Text style={styles.feedNominal}>- Rp302.500</Text>
        </View>
        <View style={styles.feedItem}>
          <Text style={styles.feedTitle}>Bantuan Sakit - Muflih</Text>
          <Text style={styles.feedNominal}>- Rp302.500</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0B2F64',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  driverName: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  driverSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  heroCard: {
    backgroundColor: '#0B2F64',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCategory: { color: '#00A896', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  badgePaid: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePaidText: { color: '#6EE7B7', fontSize: 11, fontWeight: 'bold' },
  badgeUnpaid: { backgroundColor: 'rgba(239, 68, 68, 0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeUnpaidText: { color: '#FCA5A5', fontSize: 11, fontWeight: 'bold' },
  heroTitle: { color: '#E2E8F0', fontSize: 14, marginTop: 10 },
  heroAmount: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginVertical: 6 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A896',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10
  },
  payBtnText: { color: '#0B2F64', fontWeight: 'bold', fontSize: 14, marginLeft: 8 },
  paidNotice: { color: '#93C5FD', fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statLabel: { fontSize: 9, fontWeight: 'bold', color: '#64748B' },
  statVal: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 4 },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  quickText: { fontSize: 10, fontWeight: 'bold', color: '#334155', marginTop: 6 },
  feedCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  feedHeader: { fontSize: 12, fontWeight: 'bold', color: '#1E293B', textTransform: 'uppercase' },
  feedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  feedTitle: { fontSize: 12, color: '#334155' },
  feedNominal: { fontSize: 12, fontWeight: 'bold', color: '#E11D48' }
});
