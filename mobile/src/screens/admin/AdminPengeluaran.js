import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Modal, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { Search, Plus, X, Trash2, Receipt, Check } from 'lucide-react-native';

const SOURCES = ['BSI (Bank)', 'Kas Kecil Tunai (Kholiq)'];
const CATEGORIES = ['Bansos', 'Talangan', 'Servis & Sparepart', 'Konsumsi Kegiatan', 'Operasional Harian', 'Lain-lain'];
// The filter chips are derived from the records rather than hardcoded, because
// the ledger's categories come from the parsed reference sheets and a fixed
// list silently drifts out of sync — chips that match nothing look broken.

// A3: the cash-out ledger. Creating a record debits the chosen account in the
// same transaction; deleting refunds it. Both are confirmed, because a wrong
// tap here moves real money.
export default function AdminPengeluaran() {
  const { expenses, addExpense, deleteExpense } = useApp();
  const [sourceTab, setSourceTab] = useState(SOURCES[1]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [openAdd, setOpenAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  // Add-form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState('Bansos');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPic, setFormPic] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formSource, setFormSource] = useState(SOURCES[1]);

  const sourceFiltered = useMemo(
    () => expenses.filter(e => (e.source || '').includes(formSource.includes('Kas Kecil') ? 'Kecil' : 'BSI')),
    [expenses, formSource]
  );

  // Derive the chips from whatever categories actually exist in this source,
  // most frequent first. "Semua" is always available and always resets.
  const FILTERS = useMemo(() => {
    const counts = {};
    sourceFiltered.forEach(e => {
      const c = String(e.category || 'Lain-lain').trim();
      counts[c] = (counts[c] || 0) + 1;
    });
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return ['Semua', ...sorted];
  }, [sourceFiltered]);

  // Switching source can leave a chip that no longer exists in the new list.
  const activeFilter = FILTERS.includes(filter) ? filter : 'Semua';

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    // The chips are categories, so match against `category` — not the title.
    // Derived chips carry the full label, so an exact match is correct here.
    const chip = activeFilter === 'Semua' ? null : activeFilter.toLowerCase();
    return sourceFiltered.filter(e => {
      const title = (e.title || '').toLowerCase();
      const pic = String(e.pic || '').toLowerCase();
      if (q && !title.includes(q) && !pic.includes(q)) return false;
      if (chip) {
        const category = String(e.category || '').toLowerCase();
        if (category !== chip) return false;
      }
      return true;
    });
  }, [sourceFiltered, search, activeFilter]);

  const totalSource = sourceFiltered.reduce((a, b) => a + (b.amount || 0), 0);

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('Bansos');
    setFormTitle('');
    setFormAmount('');
    setFormPic('');
    setFormBody('');
  };

  const submit = async () => {
    const nominal = Number(String(formAmount).replace(/\D/g, ''));
    if (!formTitle.trim()) return alert('Judul transaksi wajib diisi.');
    if (!nominal || nominal <= 0) return alert('Nominal tidak valid.');

    setBusy(true);
    const ok = await addExpense({
      date: formDate,
      category: formCategory,
      title: formTitle.trim(),
      amount: nominal,
      pic: formPic.trim() || '-',
      body: formBody.trim() || '-',
      source: formSource
    });
    setBusy(false);

    if (ok) {
      setOpenAdd(false);
      resetForm();
    }
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target) await deleteExpense(target);
  };

  const renderExpense = ({ item }) => {
    const isBm = (item.category || '').toLowerCase().includes('talangan') || (item.category || '').toLowerCase().includes('bm');
    return (
      <View style={styles.txnCard}>
        <View style={styles.txnLeft}>
          <View style={[styles.txnIcon, isBm && styles.txnIconBm]}>
            <Receipt size={15} color={isBm ? '#FFFFFF' : '#E11D48'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.txnTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.txnMeta}>{item.date} · {item.category}</Text>
            <Text style={styles.txnPic}>PIC: {item.pic}</Text>
          </View>
        </View>
        <View style={styles.txnRight}>
          <Text style={styles.txnAmount}>-Rp{(item.amount || 0).toLocaleString('id-ID')}</Text>
          <TouchableOpacity style={styles.delBtn} onPress={() => setPendingDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Trash2 size={13} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Source account segmented control */}
      <View style={styles.segment}>
        {SOURCES.map(s => {
          const active = formSource === s;
          const key = s.includes('Kas Kecil') ? 'Kecil' : 'BSI';
          const sum = expenses
            .filter(e => (e.source || '').includes(key))
            .reduce((a, b) => a + (b.amount || 0), 0);
          return (
            <TouchableOpacity
              key={s}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => setFormSource(s)}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {s.includes('Kas Kecil') ? 'KAS KECIL' : 'BSI (BANK)'}
              </Text>
              <Text style={[styles.segmentSum, active && styles.segmentSumActive]}>
                -Rp{sum.toLocaleString('id-ID')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <Search size={15} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari transaksi atau PIC..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.count}>
        {visible.length} transaksi · total -Rp{totalSource.toLocaleString('id-ID')}
      </Text>

      <FlatList
        data={visible}
        keyExtractor={e => e.id}
        renderItem={renderExpense}
        initialNumToRender={12}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Receipt size={28} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptyBody}>Ketuk tombol + untuk mencatat pengeluaran dari sumber ini.</Text>
          </View>
        }
      />

      {/* Floating add */}
      <TouchableOpacity style={styles.fab} onPress={() => setOpenAdd(true)} activeOpacity={0.85}>
        <Plus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add modal */}
      <Modal visible={openAdd} transparent animationType="slide" onRequestClose={() => setOpenAdd(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>CATAT PENGELUARAN</Text>
              <TouchableOpacity onPress={() => setOpenAdd(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Sumber Kas</Text>
            <View style={styles.sourcePick}>
              {SOURCES.map(s => {
                const active = formSource === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sourceOption, active && styles.sourceOptionActive]}
                    onPress={() => setFormSource(s)}
                  >
                    {active && <Check size={13} color="#FFFFFF" />}
                    <Text style={[styles.sourceText, active && styles.sourceTextActive]}>
                      {s.includes('Kas Kecil') ? 'Kas Kecil (Kholiq)' : 'Rekening BSI'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Kategori</Text>
            <View style={styles.chipWrap}>
              {CATEGORIES.map(c => {
                const active = formCategory === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setFormCategory(c)}
                  >
                    <Text style={[styles.catText, active && styles.catTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Judul Transaksi *</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Pembelian Filter Udara & Oli Gardan"
              placeholderTextColor="#94A3B8"
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <Text style={styles.label}>Nominal (Rp) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 350000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={formAmount}
              onChangeText={t => setFormAmount(t.replace(/\D/g, ''))}
            />
            {formAmount ? (
              <Text style={styles.amountPreview}>
                = Rp{Number(formAmount || 0).toLocaleString('id-ID')}
              </Text>
            ) : null}

            <Text style={styles.label}>Nama PIC / Penerima</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Moh Abdul Kholiq"
              placeholderTextColor="#94A3B8"
              value={formPic}
              onChangeText={setFormPic}
            />

            <Text style={styles.label}>Catatan</Text>
            <TextInput
              style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
              placeholder="Rincian barang / nomor nota..."
              placeholderTextColor="#94A3B8"
              multiline
              value={formBody}
              onChangeText={setFormBody}
            />

            <Text style={styles.label}>Tanggal</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              value={formDate}
              onChangeText={setFormDate}
            />

            <TouchableOpacity
              style={[styles.submit, busy && { opacity: 0.7 }]}
              onPress={submit}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>SIMPAN PENGELUARAN</Text>}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <View style={styles.confirmWrap}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>HAPUS TRANSAKSI?</Text>
            <Text style={styles.confirmBody}>
              {pendingDelete?.title} senilai Rp{(pendingDelete?.amount || 0).toLocaleString('id-ID')} akan dihapus
              dan nominalnya dikembalikan ke kas {pendingDelete?.source?.includes('Kas Kecil') ? 'kecil' : 'BSI'}.
            </Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPendingDelete(null)}>
                <Text style={styles.cancelText}>BATAL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmDelete}>
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
  segment: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 10
  },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#0B2F64' },
  segmentLabel: { fontSize: 10, fontWeight: '900', color: '#64748B' },
  segmentLabelActive: { color: '#FFFFFF' },
  segmentSum: { fontSize: 10, fontWeight: 'bold', color: '#E11D48', marginTop: 2 },
  segmentSumActive: { color: '#FCA5A5' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 12, color: '#0F172A', padding: 0 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 12, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E2E8F0'
  },
  filterChipActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  filterText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },

  count: { fontSize: 10, color: '#94A3B8', marginVertical: 10 },

  txnCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    padding: 12, marginBottom: 8, gap: 10
  },
  txnLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  txnIcon: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center'
  },
  txnIconBm: { backgroundColor: '#D97706' },
  txnTitle: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  txnMeta: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  txnPic: { fontSize: 9, color: '#64748B', marginTop: 1 },
  txnRight: { alignItems: 'flex-end', gap: 6 },
  txnAmount: { fontSize: 12, fontWeight: '900', color: '#E11D48', fontVariant: ['tabular-nums'] },
  delBtn: {
    width: 26, height: 26, borderRadius: 12,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center'
  },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
  emptyBody: { fontSize: 11, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 30 },

  fab: {
    position: 'absolute', right: 16, bottom: 16,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#00A896',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#00A896',
    shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }
  },

  modalWrap: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, maxHeight: '92%'
  },
  sheetHandle: {
    width: 42, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 12
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sheetTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A', letterSpacing: 0.8 },

  label: { fontSize: 10, fontWeight: '900', color: '#475569', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: '#0F172A'
  },
  amountPreview: { fontSize: 11, fontWeight: 'bold', color: '#00A896', marginTop: 5 },

  sourcePick: { flexDirection: 'row', gap: 8 },
  sourceOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'
  },
  sourceOptionActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  sourceText: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },
  sourceTextActive: { color: '#FFFFFF' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'
  },
  catChipActive: { backgroundColor: '#00A896', borderColor: '#00A896' },
  catText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  catTextActive: { color: '#FFFFFF' },

  submit: {
    backgroundColor: '#0B2F64', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 18
  },
  submitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },

  confirmWrap: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  confirmCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 },
  confirmTitle: { fontSize: 13, fontWeight: '900', color: '#E11D48', letterSpacing: 0.8 },
  confirmBody: { fontSize: 12, color: '#475569', marginTop: 8, lineHeight: 18 },
  confirmRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F1F5F9', alignItems: 'center'
  },
  cancelText: { fontSize: 11, fontWeight: '900', color: '#475569' },
  confirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#E11D48', alignItems: 'center'
  },
  confirmText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' }
});
