import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { Check, QrCode, Building, X, Camera, Copy, ImagePlus } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { captureThumbnail } from '../utils/thumbnails';

const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];
const BSI_ACCOUNT = '720510945';
const BSI_HOLDER = 'Paguyuban EV50 Cawang';

export default function MemberIuran() {
  const { currentUser, iuranRecords, payIuran, vault } = useApp();
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentTab, setPaymentTab] = useState('qris');
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
    // A manual bank transfer is unverifiable without the receipt, so refuse
    // rather than marking months paid on an unproven claim.
    if (paymentTab === 'bsi' && !receipt) {
      Alert.alert('Bukti transfer wajib', 'Foto bukti transfer BSI diperlukan agar kasir bisa memverifikasi.');
      return;
    }
    setSaving(true);
    const method = paymentTab === 'qris' ? 'Midtrans QRIS' : 'Transfer BSI';
    const ok = await payIuran(currentUser.nik, selectedMonths, method, paymentTab === 'bsi' ? receipt : null);
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
          <Text style={styles.headerSub}>Kewajiban Rp100.000 / Bulan (Mutual-Aid Driver & Bodi EV)</Text>
        </View>

        <View style={styles.list}>
          {MONTHS.map(m => {
            const isLunas = userIuran[m]?.status === 'lunas';
            const isSelected = selectedMonths.includes(m);

            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.monthCard,
                  isLunas && styles.monthCardLunas,
                  isSelected && styles.monthCardSelected
                ]}
                onPress={() => toggleMonth(m)}
                disabled={isLunas}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.checkbox, isLunas && styles.checkboxLunas, isSelected && styles.checkboxSelected]}>
                    {isLunas && <Check size={14} color="#FFFFFF" />}
                    {isSelected && !isLunas && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.monthName}>{m} 2026</Text>
                    <Text style={styles.monthFee}>Rp100.000</Text>
                  </View>
                </View>

                <View>
                  {isLunas ? (
                    <View style={styles.statusLunas}>
                      <Text style={styles.statusLunasText}>Lunas</Text>
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
        </View>
      </ScrollView>

      {/* Floating Bottom Action */}
      {selectedMonths.length > 0 && (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>{selectedMonths.length} Bulan: {selectedMonths.join(', ')}</Text>
            <Text style={styles.bottomTotal}>Rp{(selectedMonths.length * 100000).toLocaleString('id-ID')}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.checkoutText}>Bayar via Midtrans</Text>
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
              <Text style={styles.modalTotalValue}>Rp{(selectedMonths.length * 100000).toLocaleString('id-ID')}</Text>
              <Text style={styles.modalMonths}>{selectedMonths.join(', ')} 2026</Text>
            </View>

            {/* Payment method tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, paymentTab === 'qris' && styles.tabActive]}
                onPress={() => setPaymentTab('qris')}
              >
                <QrCode size={15} color={paymentTab === 'qris' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.tabText, paymentTab === 'qris' && styles.tabTextActive]}>QRIS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, paymentTab === 'bsi' && styles.tabActive]}
                onPress={() => setPaymentTab('bsi')}
              >
                <Building size={15} color={paymentTab === 'bsi' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.tabText, paymentTab === 'bsi' && styles.tabTextActive]}>Transfer BSI</Text>
              </TouchableOpacity>
            </View>

            {paymentTab === 'qris' ? (
              <>
                <View style={styles.qrWrapper}>
                  <QrCode size={150} color="#0B2F64" />
                  <Text style={styles.qrSub}>NMID: ID10202619082390 • Paguyuban EV50</Text>
                </View>
                <Text style={styles.simNote}>
                  Mode demo: QRIS Midtrans belum berbayar. Gunakan Transfer BSI untuk alur nyata.
                </Text>
              </>
            ) : (
              <>
                <View style={styles.bankCard}>
                  <Text style={styles.bankLabel}>REKENING RESMI PAGUYUBAN</Text>
                  <Text style={styles.bankName}>{BSI_HOLDER}</Text>
                  <View style={styles.bankNoRow}>
                    <Text style={styles.bankNo}>BSI {BSI_ACCOUNT}</Text>
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
              </>
            )}

            <TouchableOpacity
              style={[styles.webhookBtn, saving && { opacity: 0.6 }]}
              onPress={handlePay}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#0B2F64" />
                : <Text style={styles.webhookText}>
                    {paymentTab === 'bsi' ? 'Kirim ke Kasir untuk Verifikasi' : 'Simulasikan Sukses Bayar'}
                  </Text>}
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
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxLunas: { backgroundColor: '#10B981', borderColor: '#10B981' },
  checkboxSelected: { backgroundColor: '#00A896', borderColor: '#00A896' },
  monthName: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  monthFee: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusLunas: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusLunasText: { color: '#166534', fontSize: 11, fontWeight: 'bold' },
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
  bottomTotal: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  checkoutBtn: { backgroundColor: '#00A896', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  checkoutText: { color: '#0B2F64', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  modalTotalBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16 },
  modalTotalLabel: { fontSize: 11, color: '#64748B' },
  modalTotalValue: { fontSize: 22, fontWeight: 'bold', color: '#0B2F64', marginTop: 2 },
  qrWrapper: { alignItems: 'center', paddingVertical: 10 },
  qrSub: { fontSize: 11, color: '#64748B', marginTop: 12 },
  webhookBtn: { backgroundColor: '#00A896', paddingVertical: 12, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  webhookText: { color: '#0B2F64', fontWeight: 'bold', fontSize: 13 },

  modalMonths: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'
  },
  tabActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  simNote: { fontSize: 10, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 15 },

  bankCard: {
    backgroundColor: '#F0FDFA', borderRadius: 14,
    borderWidth: 1, borderColor: '#99F6E4', padding: 14
  },
  bankLabel: { fontSize: 9, fontWeight: '900', color: '#0F766E', letterSpacing: 0.8 },
  bankName: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 5 },
  bankNoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  bankNo: { fontSize: 16, fontWeight: '900', color: '#0B2F64', fontVariant: ['tabular-nums'] },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 9, borderWidth: 1, borderColor: '#99F6E4'
  },
  copyText: { fontSize: 10, fontWeight: 'bold', color: '#0B2F64' },

  receiptLabel: { fontSize: 11, fontWeight: '900', color: '#475569', marginTop: 16, marginBottom: 8 },
  receiptRow: { flexDirection: 'row', gap: 10 },
  receiptAdd: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 18, borderRadius: 13,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA'
  },
  receiptAddText: { fontSize: 10, fontWeight: 'bold', color: '#0F766E' },
  receiptWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 13,
    borderWidth: 1, borderColor: '#BBF7D0', padding: 12
  },
  receiptThumb: { width: 62, height: 62, borderRadius: 10, backgroundColor: '#F1F5F9' },
  receiptOk: { fontSize: 12, fontWeight: 'bold', color: '#166534' },
  receiptMeta: { fontSize: 10, color: '#4D7C0F', marginTop: 3 },
  receiptChange: { marginTop: 6, alignSelf: 'flex-start' },
  receiptChangeText: { fontSize: 11, fontWeight: 'bold', color: '#0B2F64', textDecorationLine: 'underline' }
});
