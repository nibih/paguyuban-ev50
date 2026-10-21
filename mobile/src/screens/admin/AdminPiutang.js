import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { Search, Plus, X, Trash2, Wallet, Check, AlertTriangle, Clock } from 'lucide-react-native';
import { rp } from '../../utils/format';
import { IURAN_FEE } from '../../constants';

const METHODS = ['Cash ke Admin', 'Transfer BSI', 'Potong Gaji'];

// A4: the receivables book.
//
// Recording an installment QUEUES it — it does not credit the card or the
// tin. A bendahara clears the queue after matching the money against the
// BSI statement or the counted kas kecil; only `verifyInstallment` moves
// funds. New talangan cards still debit the tin up front, because that is a
// disbursement, not a receipt.
export default function AdminPiutang() {
  const { debts, users, repayDebt, addDebt, deleteDebt, verifyInstallment, rejectInstallment } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [selected, setSelected] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyIns, setBusyIns] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Installment form
  const [instNominal, setInstNominal] = useState(String(IURAN_FEE));
  const [instMethod, setInstMethod] = useState(METHODS[0]);

  // New-debt form
  const [newNik, setNewNik] = useState('');
  const [newSearch, setNewSearch] = useState('');
  const [newIncident, setNewIncident] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newTenor, setNewTenor] = useState('1 BULAN');

  const totalOutstanding = debts.reduce((a, b) => a + (b.amount - b.paid), 0);
  const activeCount = debts.filter(d => (d.amount - d.paid) > 0).length;

  // Every installment sitting in the queue across all cards.
  const queue = useMemo(() => {
    const out = [];
    debts.forEach(d => {
      (d.pendingInstallments || []).forEach(p => {
        out.push({ ...p, debtId: d.id, debtName: d.name, key: `${d.id}:${p.id}` });
      });
    });
    return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [debts]);
  const queueTotal = queue.reduce((s, q) => s + (Number(q.amount) || 0), 0);

  const runVerify = async (item) => {
    setBusyIns(item.key);
    await verifyInstallment(item.debtId, item.id);
    setBusyIns(null);
  };
  const runReject = async (item) => {
    setBusyIns(item.key);
    await rejectInstallment(item.debtId, item.id);
    setBusyIns(null);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return debts.filter(d => {
      const sisa = d.amount - d.paid;
      if (filter === 'Aktif' && sisa <= 0) return false;
      if (filter === 'Lunas' && sisa > 0) return false;
      if (!q) return true;
      return (d.name || '').toLowerCase().includes(q)
        || String(d.nik || '').includes(q)
        || (d.incident || '').toLowerCase().includes(q);
    });
  }, [debts, search, filter]);

  const userMatches = useMemo(() => {
    const q = newSearch.trim().toLowerCase();
    if (!q) return [];
    return users.filter(u =>
      u.name.toLowerCase().includes(q) || u.nik.includes(q)
    ).slice(0, 25);
  }, [users, newSearch]);

  const submitInstallment = async () => {
    if (!selected) return;
    const nominal = Number(String(instNominal).replace(/\D/g, ''));
    if (!nominal || nominal <= 0) return;
    setBusy(true);
    const ok = await repayDebt(selected.id, nominal, instMethod);
    setBusy(false);
    if (ok) {
      setSelected(prev => {
        if (!prev) return prev;
        const newPaid = Math.min(prev.paid + nominal, prev.amount);
        return { ...prev, paid: newPaid, status: newPaid >= prev.amount ? 'Lunas' : 'Sedang Mengangsur' };
      });
    }
  };

  const submitNewDebt = async () => {
    const nominal = Number(String(newAmount).replace(/\D/g, ''));
    if (!newNik) return;
    if (!nominal || nominal <= 0) return;
    setBusy(true);
    const ok = await addDebt({
      nik: newNik,
      incident: newIncident.trim() || 'Talangan Operasional Jalur',
      amount: nominal,
      tenor: newTenor
    });
    setBusy(false);
    if (ok) {
      setOpenAdd(false);
      setNewNik('');
      setNewSearch('');
      setNewIncident('');
      setNewAmount('');
      setNewTenor('1 BULAN');
    }
  };

  const selectedUser = selected ? users.find(u => u.nik === selected.nik) : null;
  const newUser = users.find(u => u.nik === newNik);

  const isSettled = (d) => (d.amount - d.paid) <= 0;

  const renderDebt = ({ item }) => {
    const sisa = item.amount - item.paid;
    const pct = item.amount > 0 ? Math.min(100, Math.round((item.paid / item.amount) * 100)) : 0;
    const isLunas = sisa <= 0;
    const queued = (item.pendingInstallments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
    return (
      <TouchableOpacity
        style={styles.debtCard}
        activeOpacity={0.85}
        onPress={() => { setSelected(item); setInstNominal(String(Math.min(IURAN_FEE, sisa || IURAN_FEE))); }}
      >
        <View style={styles.debtTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtName}>{item.name}</Text>
            <Text style={styles.debtNik}>{item.nik}</Text>
          </View>
          <View style={[styles.pill, isLunas ? styles.pillGreen : styles.pillRed]}>
            <Text style={[styles.pillText, isLunas ? styles.pillTextGreen : styles.pillTextRed]}>
              {isSettled(item) ? 'LUNAS' : item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.debtIncident}>{item.incident}</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }, isLunas && { backgroundColor: '#059669' }]} />
        </View>

        <View style={styles.debtFooter}>
          <Text style={styles.debtMeta}>Dibayar {rp(item.paid || 0)} ({pct}%)</Text>
          <Text style={[styles.debtSisa, isLunas && { color: '#059669' }]}>
            Sisa {rp(sisa)}
          </Text>
        </View>

        {queued > 0 && (
          <View style={styles.pendingStrip}>
            <Clock size={11} color="#D97706" />
            <Text style={styles.pendingText}>
              {rp(queued)} menunggu verifikasi
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {queue.length > 0 && (
        <View style={styles.queueCard}>
          <View style={styles.queueHead}>
            <Clock size={14} color="#D97706" />
            <Text style={styles.queueTitle}>ANGSURAN MENUNGGU VERIFIKASI ({queue.length})</Text>
            <Text style={styles.queueTotal}>{rp(queueTotal)}</Text>
          </View>
          <Text style={styles.queueNote}>
            Belum mengurangi hutang dan belum masuk kas. Cocokkan dengan mutasi BSI / kas kecil dulu.
          </Text>
          {queue.slice(0, 25).map(q => (
            <View key={q.key} style={styles.queueRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueName}>{q.debtName}</Text>
                <Text style={styles.queueMeta}>
                  {rp(Number(q.amount) || 0)} · {q.method} · {q.date}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.qBtn, styles.qBtnOk, busyIns === q.key && styles.qBtnDisabled]}
                disabled={busyIns === q.key}
                onPress={() => runVerify(q)}
              >
                <Check size={13} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qBtn, styles.qBtnNo, busyIns === q.key && styles.qBtnDisabled]}
                disabled={busyIns === q.key}
                onPress={() => runReject(q)}
              >
                <X size={13} color="#E11D48" />
              </TouchableOpacity>
            </View>
          ))}
          {queue.length > 25 && <Text style={styles.queueMore}>+{queue.length - 25} antrean lainnya</Text>}
        </View>
      )}

      <View style={styles.kpiRow}>
        <View style={[styles.kpiBox, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.kpiLabel}>TOTAL PIUTANG</Text>
          <Text style={[styles.kpiVal, { color: '#B45309' }]}>{rp(totalOutstanding)}</Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: '#ECFDF5' }]}>
          <Text style={styles.kpiLabel}>KARTU AKTIF</Text>
          <Text style={[styles.kpiVal, { color: '#047857' }]}>{activeCount} / {debts.length}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Search size={15} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama, NIK, atau kasus..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {['Semua', 'Aktif', 'Lunas'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={d => d.id}
        renderItem={renderDebt}
        contentContainerStyle={{ paddingBottom: 96, paddingTop: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Wallet size={28} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Tidak ada kartu piutang</Text>
            <Text style={styles.emptyBody}>Ketuk + untuk mencatat talangan baru ke pramudi.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setOpenAdd(true)} activeOpacity={0.85}>
        <Plus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Detail + installment */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>DETAIL PIUTANG</Text>
                  <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailName}>{selected.name}</Text>
                  <Text style={styles.detailNik}>NIK: {selected.nik || '—'}</Text>
                  <Text style={styles.detailRow}>Kasus: {selected.incident}</Text>
                  <Text style={styles.detailRow}>Mulai: {selected.startDate} · Tenor {selected.tenor}</Text>
                  <Text style={styles.detailRow}>Disalurkan oleh: {selected.disbursedBy || 'Bendahara'}</Text>
                  <View style={styles.detailTotals}>
                    <Text style={styles.detailTotalLabel}>Sisa Tagihan</Text>
                    <Text style={styles.detailTotalVal}>
                      {rp(selected.amount - selected.paid)}
                    </Text>
                  </View>
                </View>

                {(selected.amount - selected.paid) <= 0 ? (
                  <View style={styles.lunasBox}>
                    <Check size={16} color="#059669" />
                    <Text style={styles.lunasText}>Kartu ini sudah lunas. Tidak ada angsuran tersisa.</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.label}>Nominal Angsuran (Rp)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={instNominal}
                      onChangeText={t => setInstNominal(t.replace(/\D/g, ''))}
                    />

                    <Text style={styles.label}>Metode Pembayaran</Text>
                    <View style={styles.chipWrap}>
                      {METHODS.map(m => {
                        const active = instMethod === m;
                        return (
                          <TouchableOpacity
                            key={m}
                            style={[styles.catChip, active && styles.catChipActive]}
                            onPress={() => setInstMethod(m)}
                          >
                            <Text style={[styles.catText, active && styles.catTextActive]}>{m}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity
                      style={[styles.submit, busy && { opacity: 0.7 }]}
                      onPress={submitInstallment}
                      disabled={busy}
                      activeOpacity={0.85}
                    >
                      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>ANTREKAN ANGSURAN</Text>}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.deleteLink}
                  onPress={() => { setPendingDelete(selected); setSelected(null); }}
                >
                  <Trash2 size={13} color="#EF4444" />
                  <Text style={styles.deleteLinkText}>Hapus kartu piutang ini</Text>
                </TouchableOpacity>
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* New talangan */}
      <Modal visible={openAdd} transparent animationType="slide" onRequestClose={() => setOpenAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>TALANGAN BARU</Text>
              <TouchableOpacity onPress={() => setOpenAdd(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Pilih Pramudi *</Text>
            {newUser ? (
              <TouchableOpacity style={styles.userPick} onPress={() => { setNewNik(''); setNewSearch(''); }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userPickName}>{newUser.name}</Text>
                  <Text style={styles.userPickNik}>{newUser.nik}</Text>
                </View>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.searchWrap}>
                  <Search size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Ketik nama atau NIK..."
                    placeholderTextColor="#94A3B8"
                    value={newSearch}
                    onChangeText={setNewSearch}
                  />
                </View>
                {userMatches.length > 0 && (
                  <View style={styles.userList}>
                    {userMatches.map(u => (
                      <TouchableOpacity key={u.nik} style={styles.userItem} onPress={() => setNewNik(u.nik)}>
                        <Text style={styles.userItemName}>{u.name}</Text>
                        <Text style={styles.userItemNik}>{u.nik}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <Text style={styles.label}>Kasus / Keterangan</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Laka di Jl. Mayjen Sutoyo"
              placeholderTextColor="#94A3B8"
              value={newIncident}
              onChangeText={setNewIncident}
            />

            <Text style={styles.label}>Nominal Talangan (Rp) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Contoh: 500000"
              placeholderTextColor="#94A3B8"
              value={newAmount}
              onChangeText={t => setNewAmount(t.replace(/\D/g, ''))}
            />

            <Text style={styles.label}>Tenor</Text>
            <View style={styles.chipWrap}>
              {['1 BULAN', '2 BULAN', '3 BULAN'].map(t => {
                const active = newTenor === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setNewTenor(t)}
                  >
                    <Text style={[styles.catText, active && styles.catTextActive]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.notice}>
              <AlertTriangle size={13} color="#D97706" />
              <Text style={styles.noticeText}>
                Nominal akan didebet dari Kas Kecil Tunai saat disimpan.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submit, (busy || !newNik) && { opacity: 0.6 }]}
              onPress={submitNewDebt}
              disabled={busy || !newNik}
              activeOpacity={0.85}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>SIMPAN TALANGAN</Text>}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <View style={styles.confirmWrap}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>HAPUS KARTU PIUTANG?</Text>
            <Text style={styles.confirmBody}>
              Kartu {pendingDelete?.name} senilai {rp(pendingDelete?.amount || 0)} akan dihapus
              permanen beserta riwayat angsurannya.
            </Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPendingDelete(null)}>
                <Text style={styles.cancelText}>BATAL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={async () => {
                  const t = pendingDelete;
                  setPendingDelete(null);
                  if (t) await deleteDebt(t.id);
                }}
              >
                <Text style={styles.confirmText}>HAPUS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  queueCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 12
  },
  queueHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  queueTitle: { flex: 1, fontSize: 10, fontWeight: '900', color: '#92400E' },
  queueTotal: { fontSize: 11, fontWeight: '900', color: '#92400E', fontVariant: ['tabular-nums'] },
  queueNote: { fontSize: 9, color: '#B45309', marginTop: 3, marginBottom: 8, lineHeight: 13 },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 8,
    marginBottom: 6
  },
  queueName: { fontSize: 11, fontWeight: 'bold', color: '#0F172A' },
  queueMeta: { fontSize: 9, color: '#94A3B8', marginTop: 1 },
  queueMore: { fontSize: 9, color: '#B45309', marginTop: 2 },
  qBtn: { width: 30, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qBtnOk: { backgroundColor: '#059669' },
  qBtnNo: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA' },
  qBtnDisabled: { opacity: 0.4 },

  pendingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8
  },
  pendingText: { fontSize: 9, fontWeight: '700', color: '#92400E' },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiBox: { flex: 1, padding: 13, borderRadius: 16 },
  kpiLabel: { fontSize: 9, fontWeight: '900', color: '#64748B' },
  kpiVal: { fontSize: 15, fontWeight: '900', marginTop: 4, fontVariant: ['tabular-nums'] },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 12, color: '#0F172A', padding: 0 },

  filterRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0'
  },
  filterChipActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  filterText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },

  debtCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0', padding: 13, marginBottom: 9
  },
  debtTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  debtName: { fontSize: 13, fontWeight: 'bold', color: '#0F172A' },
  debtNik: { fontSize: 10, color: '#94A3B8', marginTop: 1, fontVariant: ['tabular-nums'] },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillGreen: { backgroundColor: '#D1FAE5' },
  pillRed: { backgroundColor: '#FEF2F2' },
  pillText: { fontSize: 9, fontWeight: '900' },
  pillTextGreen: { color: '#059669' },
  pillTextRed: { color: '#E11D48' },

  debtIncident: { fontSize: 11, color: '#475569', marginTop: 8, lineHeight: 16 },
  progressTrack: {
    height: 6, borderRadius: 4, backgroundColor: '#F1F5F9',
    marginTop: 10, overflow: 'hidden'
  },
  progressFill: { height: 6, borderRadius: 4, backgroundColor: '#D97706' },
  debtFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  debtMeta: { fontSize: 10, color: '#94A3B8', fontVariant: ['tabular-nums'] },
  debtSisa: { fontSize: 11, fontWeight: '900', color: '#E11D48' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
  emptyBody: { fontSize: 11, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 30 },

  fab: {
    position: 'absolute', right: 16, bottom: 16,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#0B2F64',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#0B2F64',
    shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }
  },

  modalWrap: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, maxHeight: '90%'
  },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A', letterSpacing: 0.8 },

  detailCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14 },
  detailName: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  detailNik: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  detailRow: { fontSize: 11, color: '#475569', marginTop: 6 },
  detailTotals: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 12, paddingTop: 10
  },
  detailTotalLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },
  detailTotalVal: { fontSize: 16, fontWeight: '900', color: '#E11D48' },

  lunasBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ECFDF5', borderRadius: 12, padding: 13, marginTop: 14
  },
  lunasText: { fontSize: 11, color: '#047857', flex: 1, fontWeight: '600' },

  label: { fontSize: 10, fontWeight: '900', color: '#475569', marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: '#0F172A'
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'
  },
  catChipActive: { backgroundColor: '#00A896', borderColor: '#00A896' },
  catText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  catTextActive: { color: '#FFFFFF' },

  submit: {
    backgroundColor: '#00A896', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 18
  },
  submitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },

  deleteLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  deleteLinkText: { fontSize: 11, fontWeight: 'bold', color: '#EF4444' },

  userPick: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF9', borderRadius: 12,
    borderWidth: 1, borderColor: '#99F6E4', padding: 13
  },
  userPickName: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  userPickNik: { fontSize: 10, color: '#64748B', marginTop: 1 },

  userList: {
    maxHeight: 160, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    marginTop: 8, overflow: 'hidden'
  },
  userItem: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF'
  },
  userItemName: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  userItemNik: { fontSize: 10, color: '#94A3B8', marginTop: 1 },

  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 11, marginTop: 14
  },
  noticeText: { fontSize: 10, color: '#92400E', flex: 1, lineHeight: 14 },

  confirmWrap: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  confirmCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 },
  confirmTitle: { fontSize: 13, fontWeight: '900', color: '#E11D48', letterSpacing: 0.8 },
  confirmBody: { fontSize: 12, color: '#475569', marginTop: 8, lineHeight: 18 },
  confirmRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { fontSize: 11, fontWeight: '900', color: '#475569' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E11D48', alignItems: 'center' },
  confirmText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' }
});
