import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Switch, Alert
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { Search, UserPlus, X, ShieldCheck, ShieldOff, Users, Pencil } from 'lucide-react-native';

const POSITIONS = ['Pramudi EV 50 Cawang', 'Ketua/Admin Kas', 'Bendahara Kas Kecil', 'Korlap Lapangan'];
const FILTERS = ['Semua', 'Pramudi', 'Pengurus', 'Nonaktif'];

// A6: the roster. Members are deactivated rather than deleted — a driver with
// a debt card or a settled iuran trail is part of the financial record, and
// dropping the roster entry would orphan that money.
export default function AdminAnggota() {
  const { users, addMember, updateMember, setMemberActive } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [expandedNik, setExpandedNik] = useState(null);
  const [editing, setEditing] = useState(null);   // member being edited, or 'new'
  const [busy, setBusy] = useState(false);

  // Form state
  const [formNik, setFormNik] = useState('');
  const [formName, setFormName] = useState('');
  const [formPosition, setFormPosition] = useState(POSITIONS[0]);
  const [formRole, setFormRole] = useState('member');
  const [formPin, setFormPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);

  const activeCount = users.filter(u => (u.status || 'active') === 'active').length;
  const inactiveCount = users.length - activeCount;

  const isPengurus = (u) => u.role === 'admin' || (u.position || '').toLowerCase().includes('kas') || (u.position || '').toLowerCase().includes('korlap');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter(u => {
        if (!q) return true;
        return (u.name || '').toLowerCase().includes(q) || String(u.nik).includes(q);
      })
      .filter(u => {
        const inactive = (u.status || 'active') === 'inactive';
        if (filter === 'Nonaktif') return inactive;
        if (inactive) return false; // hidden from the working views
        if (filter === 'Pengurus') return isPengurus(u);
        if (filter === 'Pramudi') return !isPengurus(u);
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, search, filter]);

  const openNew = () => {
    setFormNik('');
    setFormName('');
    setFormPosition(POSITIONS[0]);
    setFormRole('member');
    setFormPin('');
    setPinVisible(false);
    setEditing('new');
  };

  const openEdit = (u) => {
    setFormNik(u.nik);
    setFormName(u.name || '');
    setFormPosition(u.position || POSITIONS[0]);
    setFormRole(u.role === 'admin' ? 'admin' : 'member');
    setFormPin('');
    setPinVisible(false);
    setEditing(u.nik);
  };

  const submit = async () => {
    setBusy(true);
    const fields = {
      nik: formNik,
      name: formName,
      position: formPosition,
      role: formRole,
      pin: formPin
    };
    const ok = editing === 'new'
      ? await addMember(fields)
      : await updateMember(editing, fields);
    setBusy(false);
    if (ok) setEditing(null);
  };

  const confirmToggle = (u) => {
    const deactivating = (u.status || 'active') !== 'inactive';
    if (!deactivating) {
      setMemberActive(u.nik, true);
      return;
    }
    Alert.alert(
      'Nonaktifkan pramudi?',
      `${u.name} tidak akan bisa login. Riwayat iuran, piutang, dan laporannya tetap tersimpan dan bisa dilihat.`,
      [
        { text: 'BATAL', style: 'cancel' },
        { text: 'NONAKTIFKAN', style: 'destructive', onPress: () => setMemberActive(u.nik, false) }
      ]
    );
  };

  const renderRow = ({ item }) => {
    const inactive = (item.status || 'active') === 'inactive';
    const pengurus = isPengurus(item);
    const expanded = expandedNik === item.nik;

    return (
      <TouchableOpacity
        style={[styles.row, inactive && styles.rowInactive]}
        activeOpacity={0.85}
        onPress={() => setExpandedNik(expanded ? null : item.nik)}
      >
        <View style={styles.rowTop}>
          <View style={[styles.avatar, pengurus && styles.avatarPengurus, inactive && styles.avatarInactive]}>
            <Text style={styles.avatarText}>
              {(item.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowName, inactive && styles.rowNameInactive]}>{item.name}</Text>
            <Text style={styles.rowNik}>{item.nik}</Text>
          </View>
          <View style={[styles.pill, pengurus ? styles.pillBlue : styles.pillGray, inactive && styles.pillOff]}>
            <Text style={[styles.pillText, pengurus ? styles.pillTextBlue : styles.pillTextGray, inactive && styles.pillTextOff]}>
              {inactive ? 'NONAKTIF' : (pengurus ? 'PENGURUS' : 'PRAMUDI')}
            </Text>
          </View>
        </View>

        <Text style={styles.rowPos}>{item.position || '—'}</Text>

        {expanded && (
          <View style={styles.detail}>
            <Text style={styles.detailLine}>PIN: {item.pin ? `${item.pin.slice(0, 2)}••` : 'default (4 digit terakhir NIK)'}</Text>
            {item.createdAt ? <Text style={styles.detailLine}>Terdaftar: {item.createdAt} oleh {item.createdBy || 'Pengurus'}</Text> : null}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Pencil size={12} color="#0B2F64" />
                <Text style={styles.editText}>Ubah Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, inactive ? styles.toggleBtnOn : styles.toggleBtnOff]}
                onPress={() => confirmToggle(item)}
              >
                {inactive
                  ? <ShieldCheck size={12} color="#FFFFFF" />
                  : <ShieldOff size={12} color="#FFFFFF" />}
                <Text style={styles.toggleText}>{inactive ? 'Aktifkan' : 'Nonaktifkan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiBox, { backgroundColor: '#ECFDF5' }]}>
          <Text style={styles.kpiLabel}>AKTIF</Text>
          <Text style={[styles.kpiVal, { color: '#047857' }]}>{activeCount}</Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: '#F1F5F9' }]}>
          <Text style={styles.kpiLabel}>NONAKTIF</Text>
          <Text style={[styles.kpiVal, { color: '#64748B' }]}>{inactiveCount}</Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: '#EFF6FF' }]}>
          <Text style={styles.kpiLabel}>TOTAL</Text>
          <Text style={[styles.kpiVal, { color: '#1D4ED8' }]}>{users.length}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Search size={15} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama atau NIK pramudi..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.count}>{visible.length} anggota ditampilkan</Text>

      <FlatList
        data={visible}
        keyExtractor={u => u.nik}
        renderItem={renderRow}
        initialNumToRender={12}
        windowSize={10}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Users size={28} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Tidak ada anggota cocok</Text>
            <Text style={styles.emptyBody}>Ubah kata kunci atau filter, atau tambah pramudi baru.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openNew} activeOpacity={0.85}>
        <UserPlus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add / edit sheet */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editing === 'new' ? 'TAMBAH PRAMUDI' : 'UBAH DATA PRAMUDI'}
              </Text>
              <TouchableOpacity onPress={() => setEditing(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>NIK *</Text>
            <TextInput
              style={[styles.input, editing !== 'new' && styles.inputDisabled]}
              value={formNik}
              onChangeText={t => setFormNik(t.replace(/\D/g, ''))}
              editable={editing === 'new'}
              keyboardType="numeric"
              placeholder="8–16 digit angka"
              placeholderTextColor="#94A3B8"
            />
            {editing !== 'new' && (
              <Text style={styles.fieldNote}>NIK tidak bisa diubah karena menjadi rujukan seluruh data keuangan.</Text>
            )}

            <Text style={styles.label}>Nama Lengkap *</Text>
            <TextInput
              style={styles.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="Contoh: Bayu Dyan"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Jabatan</Text>
            <View style={styles.chipWrap}>
              {POSITIONS.map(p => {
                const active = formPosition === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setFormPosition(p)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.roleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Akses Pengurus (Admin)</Text>
                <Text style={styles.fieldNote}>Admin bisa mengelola kas, iuran, piutang, dan anggota.</Text>
              </View>
              <Switch
                value={formRole === 'admin'}
                onValueChange={v => setFormRole(v ? 'admin' : 'member')}
                trackColor={{ true: '#0B2F64' }}
              />
            </View>

            <Text style={styles.label}>PIN (4 angka)</Text>
            <View style={styles.pinRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={formPin}
                onChangeText={t => setFormPin(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="numeric"
                secureTextEntry={!pinVisible}
                maxLength={4}
                placeholder="Kosongkan = 4 digit terakhir NIK"
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity style={styles.pinToggle} onPress={() => setPinVisible(v => !v)}>
                <Text style={styles.pinToggleText}>{pinVisible ? 'Sembunyi' : 'Lihat'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submit, (busy || !formNik || !formName) && { opacity: 0.6 }]}
              onPress={submit}
              disabled={busy || !formNik || !formName}
              activeOpacity={0.85}
            >
              {busy
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.submitText}>{editing === 'new' ? 'SIMPAN PRAMUDI' : 'SIMPAN PERUBAHAN'}</Text>}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiBox: { flex: 1, padding: 12, borderRadius: 16, alignItems: 'center' },
  kpiLabel: { fontSize: 9, fontWeight: '900', color: '#64748B' },
  kpiVal: { fontSize: 17, fontWeight: '900', marginTop: 3 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 12, color: '#0F172A', padding: 0 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0'
  },
  filterChipActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  filterText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },

  count: { fontSize: 10, color: '#94A3B8', marginVertical: 10 },

  row: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    padding: 12, marginBottom: 8
  },
  rowInactive: { backgroundColor: '#F8FAFC', borderStyle: 'dashed' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#00A896', alignItems: 'center', justifyContent: 'center'
  },
  avatarPengurus: { backgroundColor: '#0B2F64' },
  avatarInactive: { backgroundColor: '#CBD5E1' },
  avatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  rowName: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  rowNameInactive: { color: '#94A3B8', textDecorationLine: 'line-through' },
  rowNik: { fontSize: 10, color: '#94A3B8', marginTop: 1, fontVariant: ['tabular-nums'] },
  rowPos: { fontSize: 10, color: '#64748B', marginTop: 8, marginLeft: 46 },

  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillBlue: { backgroundColor: '#DBEAFE' },
  pillGray: { backgroundColor: '#F1F5F9' },
  pillOff: { backgroundColor: '#FEE2E2' },
  pillText: { fontSize: 8, fontWeight: '900' },
  pillTextBlue: { color: '#1D4ED8' },
  pillTextGray: { color: '#475569' },
  pillTextOff: { color: '#B91C1C' },

  detail: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9'
  },
  detailLine: { fontSize: 10, color: '#64748B', marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 12,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0'
  },
  editText: { fontSize: 11, fontWeight: 'bold', color: '#0B2F64' },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 12
  },
  toggleBtnOff: { backgroundColor: '#EF4444' },
  toggleBtnOn: { backgroundColor: '#10B981' },
  toggleText: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' },

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

  label: { fontSize: 10, fontWeight: '900', color: '#475569', marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: '#0F172A'
  },
  inputDisabled: { backgroundColor: '#F1F5F9', color: '#94A3B8' },
  fieldNote: { fontSize: 9, color: '#94A3B8', marginTop: 5, lineHeight: 13 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'
  },
  chipActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  chipText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },

  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinToggle: {
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 12, backgroundColor: '#F1F5F9'
  },
  pinToggleText: { fontSize: 10, fontWeight: 'bold', color: '#475569' },

  submit: {
    backgroundColor: '#0B2F64', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 20
  },
  submitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }
});
