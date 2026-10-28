import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { AlertCircle, PlusCircle, CheckCircle2, FileText, X, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { rp } from '../utils/format';
import { IURAN_FEE } from '../constants';

export default function MemberTalangan() {
  const { currentUser, debts, repayDebt } = useApp();
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [amountInput, setAmountInput] = useState(String(IURAN_FEE));
  const [repayMethod, setRepayMethod] = useState('Transfer Bank BSI');

  // Filter all debt items belonging to this user
  const userDebts = debts.filter(d => d.nik === currentUser.nik);
  const totalOutstanding = userDebts.reduce((acc, curr) => acc + (curr.amount - curr.paid), 0);
  const hasDebt = totalOutstanding > 0;

  const openRepayModal = (debtItem) => {
    setSelectedDebt(debtItem);
    const remaining = debtItem.amount - debtItem.paid;
    // Default installment suggestion: 100k or the remaining if less
    setAmountInput(String(Math.min(IURAN_FEE, remaining)));
  };

  const handlePay = async () => {
    const val = parseInt(amountInput.replace(/\D/g, ''), 10);
    if (!val || val <= 0 || !selectedDebt) return;
    // Keep the modal open on failure so the driver can retry; only a
    // confirmed Firestore write dismisses it.
    const ok = await repayDebt(selectedDebt.id, val, repayMethod);
    if (ok) setSelectedDebt(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Overall Outstanding Debt Banner */}
      <View style={[styles.banner, hasDebt ? styles.bannerRed : styles.bannerGreen]}>
        <Text style={styles.bannerSubtitle}>TOTAL SISA DANA TALANGAN SAYA</Text>
        <Text style={[styles.bannerAmount, { color: hasDebt ? '#E11D48' : '#059669' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {rp(totalOutstanding)}
        </Text>
        <Text style={styles.bannerNotice}>
          {hasDebt 
            ? `${userDebts.filter(d => (d.amount - d.paid) > 0).length} rincian kasus pinjaman aktif • Pembayaran dapat dicicil per pos kasus`
            : 'Anda bebas dari segala tanggungan dana talang aktif'}
        </Text>
      </View>

      {/* List of Separated Debt Cards */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>RINCIAN POS PINJAMAN & TALANGAN ({userDebts.length})</Text>
        <Text style={styles.sectionSub}>Setiap kasus tercatat mandiri dengan pelunasan terpisah</Text>
      </View>

      {userDebts.length > 0 ? (
        userDebts.map((debtItem, idx) => {
          const remaining = debtItem.amount - debtItem.paid;
          const isLunas = remaining <= 0;
          const queued = (debtItem.pendingInstallments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);

          return (
            <View key={debtItem.id || idx} style={styles.itemCard}>
              {/* Card Top Title & Status */}
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemNo}>POS TALANGAN #{idx + 1}</Text>
                  <Text style={styles.itemIncident}>{debtItem.incident}</Text>
                </View>
                <View style={[styles.statusBadge, isLunas ? styles.badgeLunas : styles.badgeUnpaid]}>
                  <Text style={[styles.statusText, isLunas ? styles.statusTextLunas : styles.statusTextUnpaid]}>
                    {isLunas ? '✓ LUNAS' : debtItem.status || 'BELUM LUNAS'}
                  </Text>
                </View>
              </View>

              {/* Progress Bar for Installment */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${Math.min(100, Math.round((debtItem.paid / debtItem.amount) * 100))}%` }
                    ]} 
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>Terbayar: {rp(debtItem.paid)}</Text>
                  <Text style={styles.progressText}>Total: {rp(debtItem.amount)}</Text>
                </View>
              </View>

              {/* Detail Breakdown */}
              <View style={styles.itemDetails}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Sisa Kewajiban:</Text>
                  <Text style={[styles.detailVal, { color: isLunas ? '#059669' : '#E11D48', fontWeight: 'bold' }]}>
                    {rp(remaining)}
                  </Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Tenor Beban:</Text>
                  <Text style={styles.detailVal}>{debtItem.tenor || '1-2 Bulan'}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Tanggal / PJ:</Text>
                  <Text style={styles.detailVal}>{debtItem.startDate || 'Sept 2026'}</Text>
                </View>
              </View>

              {/* Action Button: Pay parts of this specific debt */}
              {!isLunas ? (
                <TouchableOpacity 
                  style={styles.payItemBtn}
                  onPress={() => openRepayModal(debtItem)}
                >
                  <PlusCircle size={15} color="#FFFFFF" />
                  <Text style={styles.payItemText}>Bayar / Angsur Pos Ini</Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={styles.lunasNotice}>
                  <CheckCircle2 size={14} color="#059669" />
                  <Text style={styles.lunasNoticeText}>Pos ini telah lunas dibukukan kasir</Text>
                </View>
              )}

              {queued > 0 && (
                <View style={styles.pendingStrip}>
                  <AlertCircle size={13} color="#D97706" />
                  <Text style={styles.pendingText}>
                    {rp(queued)} menunggu verifikasi bendahara — belum mengurangi
                    sisa utang.
                  </Text>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Tidak ada riwayat pinjaman/talangan untuk akun Anda.</Text>
        </View>
      )}

      {/* Partial Payment Modal */}
      <Modal visible={!!selectedDebt} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedDebt && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalPre}>PEMBAYARAN SPESIFIK POS TALANGAN</Text>
                    <Text style={styles.modalTitle} numberOfLines={2}>{selectedDebt.incident}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDebt(null)}>
                    <X size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Sisa & Suggestion */}
                <View style={styles.modalInfoBox}>
                  <Text style={styles.modalInfoLabel}>Sisa Pinjaman Pos Ini:</Text>
                  <Text style={styles.modalInfoVal}>
                    {rp(selectedDebt.amount - selectedDebt.paid)}
                  </Text>
                </View>

                {/* Quick nominal buttons */}
                <Text style={styles.inputLabel}>Pilih Cepat / Ketik Nominal Cicilan:</Text>
                <View style={styles.chipsRow}>
                  {[50000, IURAN_FEE, 200000, (selectedDebt.amount - selectedDebt.paid)].map((chipVal, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.chip, amountInput === String(chipVal) && styles.chipActive]}
                      onPress={() => setAmountInput(String(chipVal))}
                    >
                      <Text style={[styles.chipText, amountInput === String(chipVal) && styles.chipTextActive]}>
                        {chipVal === (selectedDebt.amount - selectedDebt.paid) 
                          ? 'Lunasi Semua' 
                          : `Rp${(chipVal / 1000)}k`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Nominal Input */}
                <TextInput
                  style={styles.input}
                  value={amountInput}
                  onChangeText={setAmountInput}
                  keyboardType="numeric"
                  placeholder="Ketik nominal setor..."
                />

                {/* Payment Method */}
                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Metode Penyetoran:</Text>
                <View style={styles.methodRow}>
                  {['Transfer Bank BSI', 'Cash ke Kasir Depo'].map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodBtn, repayMethod === m && styles.methodBtnActive]}
                      onPress={() => setRepayMethod(m)}
                    >
                      <Text style={[styles.methodText, repayMethod === m && styles.methodTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handlePay}>
                  <Text style={styles.submitBtnText}>Kirim untuk Verifikasi Bendahara</Text>
                </TouchableOpacity>
                <Text style={styles.submitNote}>
                  Setoran dicatat dulu sebagai ANTREAN. Sisa utang baru berkurang setelah bendahara
                  mencocokkan uangnya dengan mutasi BSI.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 50 },
  banner: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  bannerRed: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  bannerGreen: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  bannerSubtitle: { fontSize: 10, fontWeight: 'bold', color: '#64748B', letterSpacing: 1 },
  bannerAmount: { fontSize: 28, fontWeight: '900', marginVertical: 6 },
  bannerNotice: { fontSize: 12, color: '#475569' },
  sectionHeader: { marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#0F172A', letterSpacing: 0.5 },
  sectionSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  itemNo: { fontSize: 10, fontWeight: 'bold', color: '#00A896', letterSpacing: 0.5 },
  itemIncident: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeLunas: { backgroundColor: '#DCFCE7' },
  badgeUnpaid: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  statusTextLunas: { color: '#166534' },
  statusTextUnpaid: { color: '#991B1B' },
  progressContainer: { marginVertical: 8 },
  progressTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#00A896', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressText: { fontSize: 10, color: '#64748B', fontVariant: ['tabular-nums'] },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginVertical: 10
  },
  detailCol: { flex: 1 },
  detailLabel: { fontSize: 9, color: '#94A3B8' },
  detailVal: { fontSize: 12, color: '#1E293B', marginTop: 1 },
  payItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B2F64',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6
  },
  payItemText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  lunasNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  lunasNoticeText: { color: '#059669', fontSize: 11, fontWeight: 'bold' },
  pendingStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 8,
    marginTop: 8
  },
  pendingText: { flex: 1, fontSize: 10, color: '#92400E', lineHeight: 14 },
  submitNote: { fontSize: 10, color: '#64748B', marginTop: 8, lineHeight: 14, textAlign: 'center' },
  emptyBox: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalPre: { fontSize: 10, fontWeight: 'bold', color: '#00A896', letterSpacing: 0.5 },
  modalTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginTop: 2 },
  modalInfoBox: { backgroundColor: '#FFF1F2', padding: 12, borderRadius: 12, marginBottom: 12 },
  modalInfoLabel: { fontSize: 11, color: '#9F1239' },
  modalInfoVal: { fontSize: 20, fontWeight: 'bold', color: '#E11D48', marginTop: 2 },
  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  chipsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  chip: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12 },
  chipActive: { backgroundColor: '#0B2F64' },
  chipText: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  chipTextActive: { color: '#FFFFFF' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', padding: 12, borderRadius: 12, fontSize: 16, fontWeight: 'bold' },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
  methodBtnActive: { borderColor: '#00A896', backgroundColor: '#F0FDFA' },
  methodText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  methodTextActive: { color: '#0F766E', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#00A896', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#0B2F64', fontWeight: 'bold', fontSize: 13 }
});
