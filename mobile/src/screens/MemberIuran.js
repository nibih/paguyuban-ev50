import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { Check, QrCode, Building, X, Clock } from 'lucide-react-native';

const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];

export default function MemberIuran() {
  const { currentUser, iuranRecords, payIuran, vault } = useApp();
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentTab, setPaymentTab] = useState('qris');

  const userIuran = iuranRecords[currentUser.nik] || {};

  const toggleMonth = (m) => {
    if (userIuran[m]?.status === 'lunas') return;
    if (selectedMonths.includes(m)) {
      setSelectedMonths(selectedMonths.filter(item => item !== m));
    } else {
      setSelectedMonths([...selectedMonths, m]);
    }
  };

  const handleSimulateWebhook = () => {
    payIuran(currentUser.nik, selectedMonths, paymentTab === 'qris' ? 'Midtrans QRIS' : 'BSI Virtual Account');
    setModalVisible(false);
    setSelectedMonths([]);
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

      {/* Midtrans Simulation Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pembayaran Midtrans Snap</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalTotalBox}>
              <Text style={styles.modalTotalLabel}>Total Tagihan Iuran:</Text>
              <Text style={styles.modalTotalValue}>Rp{(selectedMonths.length * 100000).toLocaleString('id-ID')}</Text>
            </View>

            {/* QR Mockup */}
            <View style={styles.qrWrapper}>
              <QrCode size={160} color="#0B2F64" />
              <Text style={styles.qrSub}>NMID: ID10202619082390 • Paguyuban EV50</Text>
            </View>

            <TouchableOpacity style={styles.webhookBtn} onPress={handleSimulateWebhook}>
              <Text style={styles.webhookText}>Simulasikan Sukses Bayar (Webhook)</Text>
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
  webhookText: { color: '#0B2F64', fontWeight: 'bold', fontSize: 13 }
});
