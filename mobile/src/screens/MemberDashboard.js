import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { ShieldCheck, CreditCard, AlertCircle, AlertTriangle, Wrench, HeartHandshake, CheckCircle, ArrowRight, PhoneCall } from 'lucide-react-native';
import { rp } from '../utils/format';
import { IURAN_FEE, HAZARD_FORM_URL, COLLECTION_MONTH } from '../constants';
import MemberKontakDarurat from './MemberKontakDarurat';

// The hazard board belongs to another team, so this is a plain handoff: the
// app keeps no record of what is reported and there is nothing to poll.
//
// Opened in the device's EXTERNAL browser on purpose — Google returns 401 to
// non-browser clients, so an in-app WebView would most likely be refused.
const openHazardForm = () => {
  Linking.openURL(HAZARD_FORM_URL).catch(() =>
    Alert.alert(
      'Tidak bisa membuka formulir',
      `Salin tautan ini ke browser Anda:\n\n${HAZARD_FORM_URL}`
    )
  );
};

export default function MemberDashboard({ navigation }) {
  const { currentUser, iuranRecords, debts, vault } = useApp();

  // The roster opens full-screen over the dashboard rather than as a seventh
  // bottom tab: six tabs are already tight, and a label like "Kontak Darurat"
  // would truncate next to "Lapor Perbaikan".
  const [contactsOpen, setContactsOpen] = useState(false);

  const userIuran = iuranRecords[currentUser.nik] || {};
  const isPaid = userIuran[COLLECTION_MONTH]?.status === 'lunas';

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
        <Text style={styles.heroTitle}>{COLLECTION_MONTH} 2026</Text>
        <Text style={styles.heroAmount}>{rp(IURAN_FEE)}</Text>
        
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
          <Text style={styles.statVal}>{rp(vault.pettyCash)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>REKENING BSI</Text>
          <Text style={styles.statVal}>{rp(vault.bsiBalance)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>HUTANG SAYA</Text>
          <Text style={[styles.statVal, { color: remainingDebt > 0 ? '#E11D48' : '#059669' }]}>
            {rp(remainingDebt)}
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

      {/* Hazard handoff. Its own banner rather than a fifth tile squeezed into
          the row above — reporting a hazard is time-critical and should be
          impossible to miss. Opens the other team's form; nothing is recorded
          here. */}
      <TouchableOpacity style={styles.hazardBanner} onPress={openHazardForm} activeOpacity={0.85}>
        <AlertTriangle size={20} color="#92400E" />
        <View style={styles.hazardTextWrap}>
          <Text style={styles.hazardTitle}>Lihat Bahaya di Jalan?</Text>
          <Text style={styles.hazardSub}>Laporkan ke papan hazard Transjakarta</Text>
        </View>
        <ArrowRight size={16} color="#92400E" />
      </TouchableOpacity>

      {/* Kontak darurat. Sits right under the hazard handoff because both are
          "something has gone wrong on the road" buttons, and the driver
          hunting for a phone number is in the same hurry as the one reporting
          a hazard. Solid navy, not another amber banner: it must read as a
          different tool, not a second warning. */}
      <TouchableOpacity
        style={styles.contactBanner}
        onPress={() => setContactsOpen(true)}
        activeOpacity={0.85}
      >
        <View style={styles.contactIcon}>
          <PhoneCall size={17} color="#FFFFFF" />
        </View>
        <View style={styles.hazardTextWrap}>
          <Text style={styles.contactTitle}>Kontak Darurat</Text>
          <Text style={styles.contactSub}>Nomor bantuan per rute</Text>
        </View>
        <ArrowRight size={16} color="#93C5FD" />
      </TouchableOpacity>

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
      {/* Full-screen roster. A Modal nested in the ScrollView is deliberate:
          RN renders it in its own root, so it takes no layout space here and
          the dashboard keeps a single scroll container. */}
      <Modal
        visible={contactsOpen}
        animationType="slide"
        onRequestClose={() => setContactsOpen(false)}
      >
        <MemberKontakDarurat onClose={() => setContactsOpen(false)} />
      </Modal>
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
  badgePaid: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgePaidText: { color: '#6EE7B7', fontSize: 11, fontWeight: 'bold' },
  badgeUnpaid: { backgroundColor: 'rgba(239, 68, 68, 0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeUnpaidText: { color: '#FCA5A5', fontSize: 11, fontWeight: 'bold' },
  heroTitle: { color: '#E2E8F0', fontSize: 14, marginTop: 10 },
  heroAmount: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginVertical: 6 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A896',
    paddingVertical: 12,
    borderRadius: 12,
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
  statVal: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 4, fontVariant: ['tabular-nums'] },
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
  hazardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16
  },
  hazardTextWrap: { flex: 1 },
  hazardTitle: { fontSize: 13, fontWeight: '900', color: '#92400E' },
  hazardSub: { fontSize: 11, color: '#B45309', marginTop: 2 },

  contactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0B2F64',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 168, 150, 0.35)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  contactTitle: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },
  contactSub: { fontSize: 10, color: '#93C5FD', marginTop: 1 },
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
