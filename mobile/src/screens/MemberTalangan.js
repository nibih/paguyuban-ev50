import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { AlertCircle, PlusCircle, CheckCircle, FileText, X } from 'lucide-react-native';

export default function MemberTalangan() {
  const { currentUser, debts, repayDebt } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [amountInput, setAmountInput] = useState('100000');

  const userDebt = debts.find(d => d.nik === currentUser.nik);
  const remaining = userDebt ? (userDebt.amount - userDebt.paid) : 0;
  const hasDebt = remaining > 0;

  const handlePay = () => {
    const val = parseInt(amountInput, 10);
    if (!val || val <= 0 || !userDebt) return;
    repayDebt(userDebt.id, val, 'Transfer Bank BSI');
    setModalVisible(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Debt Status Banner */}
      <View style={[styles.banner, hasDebt ? styles.bannerRed : styles.bannerGreen]}>
        <Text style={styles.bannerSubtitle}>SISA TANGGUNGAN TALANGAN</Text>
        <Text style={[styles.bannerAmount, { color: hasDebt ? '#E11D48' : '#059669' }]}>
          Rp{remaining.toLocaleString('id-ID')}
        </Text>
        <Text style={styles.bannerNotice}>
          {hasDebt ? `Tenor: ${userDebt?.tenor || '1 Bulan'} • Wajib diangsur` : 'Anda bebas dari tanggungan dana talang aktif'}
        </Text>

        {hasDebt && (
          <TouchableOpacity style={styles.repayBtn} onPress={() => setModalVisible(true)}>
            <PlusCircle size={16} color="#FFFFFF" />
            <Text style={styles.repayBtnText}>Ajukan Setoran Cicilan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Official Incident Card details */}
      {userDebt && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={16} color="#0B2F64" />
            <Text style={styles.cardTitle}>SURAT KARTU UTANG PIUTANG</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Kasus Kejadian:</Text>
            <Text style={styles.val}>{userDebt.incident}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Pencairan Oleh:</Text>
            <Text style={styles.val}>{userDebt.disbursedBy}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Total Pinjaman:</Text>
            <Text style={styles.val}>Rp{userDebt.amount.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Sudah Diangsur:</Text>
            <Text style={[styles.val, { color: '#059669' }]}>Rp{userDebt.paid.toLocaleString('id-ID')}</Text>
          </View>
        </View>
      )}

      {/* Repay Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Input Setoran Cicilan</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Nominal Angsuran (Rp):</Text>
            <TextInput
              style={styles.input}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handlePay}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Kirim Setoran Cicilan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  banner: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  bannerRed: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  bannerGreen: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  bannerSubtitle: { fontSize: 10, fontWeight: 'bold', color: '#64748B', letterSpacing: 1 },
  bannerAmount: { fontSize: 28, fontWeight: '900', marginVertical: 6 },
  bannerNotice: { fontSize: 12, color: '#475569' },
  repayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14
  },
  repayBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, marginLeft: 6 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  cardTitle: { fontSize: 12, fontWeight: 'bold', color: '#0B2F64', letterSpacing: 0.5 },
  detailRow: { marginVertical: 6 },
  label: { fontSize: 10, color: '#94A3B8' },
  val: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', padding: 12, borderRadius: 12, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  submitBtn: { backgroundColor: '#0B2F64', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }
});
