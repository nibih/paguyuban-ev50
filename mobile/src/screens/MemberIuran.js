import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { Check, Building, X, Camera, Copy, ImagePlus, Clock } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { captureThumbnail } from '../utils/thumbnails';
import { rp } from '../utils/format';
import { dueMonths, IURAN_FEE, COLLECTION_MONTH } from '../constants';

const BSI_ACCOUNT = '7352135571';
const BSI_HOLDER = 'Paguyuban EV50 Cawang';

// Only the months this driver owes are offered: from the month they joined
// until the month being collected. A driver who joined this month must not be
// invited to pay for Mei, and nobody can pay a future month early.
export default function MemberIuran() {
  const { currentUser, iuranRecords, payIuran, vault } = useApp();
  const payableMonths = dueMonths(currentUser);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  const userIuran = iuranRecords[currentUser.nik] || {};

  const toggleMonth = (m) => {
    if (userIuran[m]?.status === 'lunas') return;
    if (selectedMonths.includes(m)) {
      setSelectedMonths(selectedMonths.filter(item => item !== m));
    } else {
      setSelectedMonths([...selectedMonths, m]);
    }
  };

  const addReceipt = async (source) => {
    setPicking(true);
    try {
      const shot = await captureThumbnail(source);
      if (shot) setReceipt(shot);
    } catch (e) {
      Alert.alert('Foto gagal', e.message || 'Coba lagi.');
    } finally {
      setPicking(false);
    }
  };

  const copyAccount = async () => {
    await Clipboard.setStringAsync(BSI_ACCOUNT);
    Alert.alert('Nomor rekening disalin', BSI_ACCOUNT);
  };

  const closeModal = () => {
    setModalVisible(false);
    setReceipt(null);
  };

  const handlePay = async () => {
    // Only a real bank transfer produces evidence a cashier can match, so
    // the receipt is mandatory and there is no QR/other path to fall back on.
    if (!receipt) {
      Alert.alert('Bukti transfer wajib', 'Foto bukti transfer BSI diperlukan agar kasir bisa memverifikasi.');
      return;
    }
    setSaving(true);
    const ok = await payIuran(currentUser.nik, selectedMonths, 'Transfer BSI', receipt);
    setSaving(false);
    if (ok) {
      closeModal();
      setSelectedMonths([]);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>Status Iuran Bulanan</Text>
          <Text style={styles.headerSub}>Kewajiban {rp(IURAN_FEE)} / Bulan (Mutual-Aid Driver & Bodi EV)</Text>
        </View>

        <View style={styles.list}>
          {payableMonths.map(m => {
            const isLunas = userIuran[m]?.status === 'lunas';
            const isPending = userIuran[m]?.status === 'pending';
            const isSelected = selectedMonths.includes(m);

            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.monthCard,
                  isLunas && styles.monthCardLunas,
                  isPending && styles.monthCardPending,
                  isSelected && styles.monthCardSelected
                ]}
                onPress={() => toggleMonth(m)}
                disabled={isLunas || isPending}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.checkbox, isLunas && styles.checkboxLunas, isSelected && styles.checkboxSelected]}>
                    {isLunas && <Check size={14} color="#FFFFFF" />}
                    {isSelected && !isLunas && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.monthName}>{m} 2026</Text>
                    <Text style={styles.monthFee}>{rp(IURAN_FEE)}</Text>
                  </View>
                </View>

                <View>
                  {isLunas ? (
                    <View style={styles.statusLunas}>
                      <Text style={styles.statusLunasText}>Lunas</Text>
                    </View>
                  ) : isPending ? (
                    <View style={styles.statusPending}>
                      <Text style={styles.statusPendingText}>Menunggu Verifikasi</Text>
                    </View>
                  ) : (
                    <View style={styles.statusUnpaid}>
                      <Text style={styles.statusUnpaidText}>Belum Bayar</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.verifyNote}>
            <Clock size={13} color="#D97706" />
            <Text style={styles.verifyNoteText}>
              Pembayaran baru dihitung LUNAS setelah bendahara mencocokkannya dengan mutasi BSI.
              Sebelum itu statusnya "Menunggu Verifikasi" dan uang belum masuk kas.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action */}
      {selectedMonths.length > 0 && (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>{selectedMonths.length} Bulan: {selectedMonths.join(', ')}</Text>
            <Text style={styles.bottomTotal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{rp(selectedMonths.length * IURAN_FEE)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.checkoutText}>Transfer BSI</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pembayaran Iuran</Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalTotalBox}>
              <Text style={styles.modalTotalLabel}>Total Tagihan Iuran:</Text>
              <Text style={styles.modalTotalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{rp(selectedMonths.length * IURAN_FEE)}</Text>
              <Text style={styles.modalMonths}>{selectedMonths.join(', ')} 2026</Text>
            </View>

            {/* Midtrans/QRIS is deliberately NOT offered. The gateway was never
                live — the QR path could only ever fake a success — and a fake
                success is exactly how test payments ended up in the books.
                Transfer BSI is the only route that produces evidence a cashier
                can actually match. */}
            <View style={styles.methodHeader}>
              <Building size={15} color="#0B2F64" />
              <Text style={styles.methodHeaderText}>Transfer ke Rekening BSI Paguyuban</Text>
            </View>

            <View style={styles.bankCard}>
              <Text style={styles.bankLabel}>REKENING RESMI PAGUYUBAN</Text>
              <Text style={styles.bankName}>{BSI_HOLDER}</Text>
              <View style={styles.bankNoRow}>
                <Text style={styles.bankNo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>BSI {BSI_ACCOUNT}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={copyAccount}>
                  <Copy size={13} color="#0B2F64" />
                  <Text style={styles.copyText}>Salin</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.receiptLabel}>Bukti Transfer (wajib)</Text>
            {receipt ? (
              <View style={styles.receiptWrap}>
                <Image source={{ uri: receipt.uri }} style={styles.receiptThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptOk}>Bukti transfer terlampir</Text>
                  <Text style={styles.receiptMeta}>{Math.round(receipt.bytes / 1024)} KB • siap dikirim ke kasir</Text>
                  <TouchableOpacity style={styles.receiptChange} onPress={() => setReceipt(null)}>
                    <Text style={styles.receiptChangeText}>Ganti foto</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.receiptRow}>
                <TouchableOpacity
                  style={[styles.receiptAdd, picking && { opacity: 0.5 }]}
                  onPress={() => addReceipt('camera')}
                  disabled={picking}
                >
                  {picking ? <ActivityIndicator size="small" color="#00A896" /> : <Camera size={17} color="#00A896" />}
                  <Text style={styles.receiptAddText}>Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.receiptAdd, picking && { opacity: 0.5 }]}
                  onPress={() => addReceipt('library')}
                  disabled={picking}
                >
                  <ImagePlus size={17} color="#00A896" />
                  <Text style={styles.receiptAddText}>Galeri</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.webhookBtn, saving && { opacity: 0.6 }]}
              onPress={handlePay}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#0B2F64" />
                : <Text style={styles.webhookText}>Kirim ke Kasir untuk Verifikasi</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 100 },
  headerBox: { marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  list: { gap: 10 },
  monthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  monthCardLunas: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  monthCardSelected: { borderColor: '#00A896', backgroundColor: '#F0FDFA', borderWidth: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxLunas: { backgroundColor: '#10B981', borderColor: '#10B981' },
  checkboxSelected: { backgroundColor: '#00A896', borderColor: '#00A896' },
  monthName: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  monthFee: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusLunas: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusLunasText: { color: '#166534', fontSize: 11, fontWeight: 'bold' },
  statusPending: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPendingText: { fontSize: 10, fontWeight: '900', color: '#92400E' },
  monthCardPending: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  verifyNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: 12, padding: 12, marginTop: 4
  },
  verifyNoteText: { flex: 1, fontSize: 10, color: '#92400E', lineHeight: 15 },
  statusUnpaid: { backgroundColor: '#FFE4E6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusUnpaidText: { color: '#9F1239', fontSize: 11, fontWeight: 'bold' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0B2F64',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  bottomLabel: { color: '#00A896', fontSize: 11, fontWeight: 'bold' },
  bottomTotal: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 2, fontVariant: ['tabular-nums'] },
  checkoutBtn: { backgroundColor: '#00A896', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  checkoutText: { color: '#0B2F64', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  modalTotalBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16 },
  modalTotalLabel: { fontSize: 11, color: '#64748B' },
  modalTotalValue: { fontSize: 22, fontWeight: 'bold', color: '#0B2F64', marginTop: 2, fontVariant: ['tabular-nums'] },
  methodHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12
  },
  methodHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },

  webhookBtn: { backgroundColor: '#00A896', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  webhookText: { color: '#0B2F64', fontWeight: 'bold', fontSize: 13 },

  modalMonths: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  bankCard: {
    backgroundColor: '#F0FDFA', borderRadius: 16,
    borderWidth: 1, borderColor: '#99F6E4', padding: 14
  },
  bankLabel: { fontSize: 9, fontWeight: '900', color: '#0F766E', letterSpacing: 0.8 },
  bankName: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 5 },
  bankNoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  bankNo: { fontSize: 16, fontWeight: '900', color: '#0B2F64', fontVariant: ['tabular-nums'] },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: '#99F6E4'
  },
  copyText: { fontSize: 10, fontWeight: 'bold', color: '#0B2F64' },

  receiptLabel: { fontSize: 11, fontWeight: '900', color: '#475569', marginTop: 16, marginBottom: 8 },
  receiptRow: { flexDirection: 'row', gap: 10 },
  receiptAdd: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 18, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA'
  },
  receiptAddText: { fontSize: 10, fontWeight: 'bold', color: '#0F766E' },
  receiptWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 12,
    borderWidth: 1, borderColor: '#BBF7D0', padding: 12
  },
  receiptThumb: { width: 62, height: 62, borderRadius: 8, backgroundColor: '#F1F5F9' },
  receiptOk: { fontSize: 12, fontWeight: 'bold', color: '#166534' },
  receiptMeta: { fontSize: 10, color: '#4D7C0F', marginTop: 3 },
  receiptChange: { marginTop: 6, alignSelf: 'flex-start' },
  receiptChangeText: { fontSize: 11, fontWeight: 'bold', color: '#0B2F64', textDecorationLine: 'underline' }
});
