import React, { useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { Bus, X, ImageOff, History } from 'lucide-react-native';

// Statuses are stored in Indonesian, longest first so the exact match wins.
const STATUSES = ['Laporan Baru Masuk', 'Sedang Dikerjakan Mekanik', 'Selesai'];

const STATUS_STYLE = {
  'Laporan Baru Masuk': { bg: '#FEF3C7', fg: '#B45309', dot: '#F59E0B' },
  'Sedang Dikerjakan Mekanik': { bg: '#DBEAFE', fg: '#1D4ED8', dot: '#3B82F6' },
  'Selesai': { bg: '#D1FAE5', fg: '#047857', dot: '#10B981' }
};

// A driver sees only their own reports, matched on NIK. NIK is immutable on a
// user document, so it is a stable key; matching on name would break the
// moment two pramudi share one, which in a 126-person roster is not a
// hypothetical.
function StatusPill({ status }) {
  const key = STATUSES.find(s => s === status) || 'Laporan Baru Masuk';
  const c = STATUS_STYLE[key];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.pillText, { color: c.fg }]}>{key}</Text>
    </View>
  );
}

function PhotoStrip({ photos }) {
  if (!Array.isArray(photos) || photos.length === 0) {
    return (
      <View style={styles.photoEmpty}>
        <ImageOff size={12} color="#94A3B8" />
        <Text style={styles.photoEmptyText}>Tidak ada foto</Text>
      </View>
    );
  }
  return (
    <View style={styles.photoRow}>
      {photos.map((p, i) => (
        <Image
          key={i}
          source={{ uri: p?.uri || (p?.base64 ? `data:image/jpeg;base64,${p.base64}` : null) }}
          style={styles.photoThumb}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

// The member's own history of body-shop reports. The form on the previous
// tab writes; this one only reads, so a driver can check what happened to a
// report they filed instead of asking the korlap in the WhatsApp group.
export default function MemberHistoriBodi() {
  const { currentUser, incidents } = useApp();
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('Semua');

  const mine = useMemo(() => {
    return incidents
      .filter(i => i.nik === currentUser?.nik)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [incidents, currentUser?.nik]);

  const counts = useMemo(() => {
    const c = { Semua: mine.length, Aktif: 0, Selesai: 0 };
    mine.forEach(i => {
      if (i.status === 'Selesai') c.Selesai++;
      else c.Aktif++;
    });
    return c;
  }, [mine]);

  const shown = useMemo(() => {
    if (filter === 'Aktif') return mine.filter(i => i.status !== 'Selesai');
    if (filter === 'Selesai') return mine.filter(i => i.status === 'Selesai');
    return mine;
  }, [mine, filter]);

  const FILTERS = [
    { key: 'Semua', label: 'Semua' },
    { key: 'Aktif', label: 'Sedang Berjalan' },
    { key: 'Selesai', label: 'Selesai' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <History size={16} color="#0B2F64" />
        <Text style={styles.headerTitle}>Riwayat Laporan Bodi Saya</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label} ({counts[f.key]})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {shown.length === 0 ? (
          <View style={styles.empty}>
            <Bus size={26} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Belum ada laporan</Text>
            <Text style={styles.emptyText}>
              {filter === 'Semua'
                ? 'Laporan bodi yang Anda kirim akan tercatat di sini beserta status perbaikannya.'
                : 'Tidak ada laporan pada filter ini.'}
            </Text>
          </View>
        ) : (
          shown.map(inc => (
            <TouchableOpacity
              key={inc.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => setSelected(inc)}
            >
              <View style={styles.cardTop}>
                <View style={styles.bodyChip}>
                  <Bus size={12} color="#0B2F64" />
                  <Text style={styles.bodyChipText}>{inc.body || 'Tanpa Body'}</Text>
                </View>
                <Text style={styles.cardDate}>{inc.date}</Text>
              </View>

              <Text style={styles.cardDamage} numberOfLines={2}>{inc.damage}</Text>
              <Text style={styles.cardLocation} numberOfLines={1}>{inc.location}</Text>

              <View style={{ marginTop: 10 }}>
                <StatusPill status={inc.status} />
              </View>

              {(Array.isArray(inc.photos) && inc.photos.length > 0) && (
                <PhotoStrip photos={inc.photos} />
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Read-only detail sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>DETAIL LAPORAN BODI</Text>
                  <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailBody}>{selected.body || 'Tanpa Body'}</Text>
                  <StatusPill status={selected.status} />
                  <Text style={styles.detailDamage}>{selected.damage}</Text>

                  <View style={styles.detailGrid}>
                    <DetailRow label="Lokasi kejadian" value={selected.location || '-'} />
                    <DetailRow label="Tanggal lapor" value={selected.date || '-'} />
                    <DetailRow label="Suket laka" value={selected.suketStatus || '-'} />
                    <DetailRow
                      label="Mekanik"
                      value={selected.mechanic || 'Belum Ditugaskan'}
                    />
                    {selected.needMechanic !== undefined && (
                      <DetailRow
                        label="Dukungan mekanik lapangan"
                        value={selected.needMechanic ? 'Diminta' : 'Tidak diminta'}
                      />
                    )}
                  </View>

                  {selected.notes ? (
                    <Text style={styles.detailNotes}>Catatan pengurus: {selected.notes}</Text>
                  ) : null}

                  <PhotoStrip photos={selected.photos} />
                </View>

                <Text style={styles.sheetFoot}>
                  Status diperbarui oleh pengurus. Hubungi korlap bila ada yang perlu dikoreksi.
                </Text>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10
  },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },

  filterRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0'
  },
  filterChipActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  filterText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },

  list: { paddingHorizontal: 16, paddingBottom: 20 },

  empty: {
    backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1,
    borderStyle: 'dashed', borderColor: '#E2E8F0',
    padding: 28, alignItems: 'center', marginTop: 8
  },
  emptyTitle: { fontSize: 13, fontWeight: 'bold', color: '#94A3B8', marginTop: 12 },
  emptyText: { fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 6, lineHeight: 17 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
    borderColor: '#E2E8F0', padding: 14, marginBottom: 10
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bodyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDFA', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9
  },
  bodyChipText: { fontSize: 11, fontWeight: '900', color: '#0B2F64' },
  cardDate: { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  cardDamage: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 10 },
  cardLocation: { fontSize: 11, color: '#64748B', marginTop: 3 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '900' },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  photoThumb: { width: 62, height: 62, borderRadius: 9, backgroundColor: '#F1F5F9' },
  photoEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderStyle: 'dashed', borderColor: '#E2E8F0'
  },
  photoEmptyText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

  sheetWrap: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, maxHeight: '85%'
  },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A', letterSpacing: 0.8 },

  detailCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14 },
  detailBody: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  detailDamage: { fontSize: 12, color: '#475569', marginTop: 10, lineHeight: 18 },
  detailGrid: { marginTop: 12 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 12,
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#FFFFFF'
  },
  detailLabel: { fontSize: 11, color: '#94A3B8', flex: 1 },
  detailValue: { fontSize: 11, fontWeight: 'bold', color: '#1E293B', flex: 1.4, textAlign: 'right' },
  detailNotes: { fontSize: 11, color: '#475569', marginTop: 12, lineHeight: 16 },
  sheetFoot: { fontSize: 10, color: '#94A3B8', marginTop: 12, textAlign: 'center', lineHeight: 15 }
});
