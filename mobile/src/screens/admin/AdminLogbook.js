import React, { useState, useMemo } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { Bus, X, Trash2, Check, Camera, ImageOff } from 'lucide-react-native';

const STATUSES = ['Laporan Baru Masuk', 'Sedang Dikerjakan Mekanik', 'Selesai'];
const STATUS_SHORT = { 'Laporan Baru Masuk': 'BARU', 'Sedang Dikerjakan Mekanik': 'PROSES', 'Selesai': 'SELESAI' };
const STATUS_COLOR = {
  'Laporan Baru Masuk': { bg: '#FEF3C7', fg: '#B45309', bar: '#F59E0B' },
  'Sedang Dikerjakan Mekanik': { bg: '#DBEAFE', fg: '#1D4ED8', bar: '#3B82F6' },
  'Selesai': { bg: '#D1FAE5', fg: '#047857', bar: '#10B981' }
};

// Reports are stored as { body, driver, damage, ... } — not title/description.
// Compose a readable header from the fields that actually exist.
const incTitle = (inc) => `${inc.body || 'Tanpa Body'} — ${inc.damage || 'Tanpa Rincian'}`;

// Photos ride along on the incident document as base64 thumbnails, because the
// Firebase project has no Cloud Storage bucket. Guard against records saved
// before photos existed so old cards never render a broken image.
function PhotoStrip({ photos, large }) {
  if (!Array.isArray(photos) || photos.length === 0) return null;
  const size = large ? 84 : 58;
  return (
    <View style={styles.photoRow}>
      {photos.map((p, i) => (
        <Image
          key={i}
          source={{ uri: p?.uri || (p?.base64 ? `data:image/jpeg;base64,${p.base64}` : null) }}
          style={[styles.photoThumb, { width: size, height: size }]}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

function PhotoEmpty() {
  return (
    <View style={styles.photoEmpty}>
      <ImageOff size={13} color="#94A3B8" />
      <Text style={styles.photoEmptyText}>Tidak ada foto kerusakan</Text>
    </View>
  );
}

// A5: the body-shop board. Reports arrive from members and move left to right;
// the admin is the one who advances them and assigns a mechanic.
export default function AdminLogbook() {
  const { incidents, updateIncidentStatus, deleteIncident } = useApp();
  const [selected, setSelected] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(() => {
    const rank = (s) => STATUSES.indexOf(s);
    return [...incidents].sort((a, b) => {
      const d = rank(a.status) - rank(b.status);
      return d !== 0 ? d : String(b.date).localeCompare(String(a.date));
    });
  }, [incidents]);

  const grouped = useMemo(() => {
    const g = {};
    STATUSES.forEach(s => { g[s] = []; });
    sorted.forEach(i => {
      const key = STATUSES.includes(i.status) ? i.status : 'Laporan Baru Masuk';
      g[key].push(i);
    });
    return g;
  }, [sorted]);

  const openIncident = (inc) => setSelected({ ...inc });

  const save = async (patch) => {
    if (!selected) return;
    setBusy(true);
    const ok = await updateIncidentStatus(selected.id, patch.status, patch.mechanic);
    setBusy(false);
    if (ok) setSelected(prev => ({ ...prev, ...patch }));
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.hint}>
        {incidents.filter(i => i.status !== 'Selesai').length} laporan masih berjalan · ketuk kartu untuk memproses
      </Text>

      {STATUSES.map(status => {
        const c = STATUS_COLOR[status];
        const list = grouped[status];
        return (
          <View key={status} style={styles.column}>
            <View style={[styles.colHeader, { backgroundColor: c.bg }]}>
              <View style={[styles.colDot, { backgroundColor: c.bar }]} />
              <Text style={[styles.colTitle, { color: c.fg }]}>{status}</Text>
              <View style={styles.colCount}>
                <Text style={[styles.colCountText, { color: c.fg }]}>{list.length}</Text>
              </View>
            </View>

            {list.length === 0 ? (
              <View style={styles.colEmpty}>
                <Text style={styles.colEmptyText}>Tidak ada laporan</Text>
              </View>
            ) : (
              list.map(inc => (
                <TouchableOpacity
                  key={inc.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => openIncident(inc)}
                >
                  <View style={styles.cardTop}>
                    <Bus size={14} color="#0B2F64" />
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {inc.body} — {inc.damage}
                    </Text>
                  </View>
                  <Text style={styles.cardDesc} numberOfLines={2}>{inc.location}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardMeta}>{inc.driver} · {inc.nik}</Text>
                    <Text style={styles.cardMeta}>{inc.date}</Text>
                  </View>
                  {inc.suketStatus && !String(inc.suketStatus).includes('Tidak Perlu') && (
                    <Text style={styles.cardCost}>{inc.suketStatus}</Text>
                  )}
                  <PhotoStrip photos={inc.photos} />
                </TouchableOpacity>
              ))
            )}
          </View>
        );
      })}

      {/* Detail / advance modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>PROSES LAPORAN</Text>
                  <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>{incTitle(selected)}</Text>
                  <Text style={styles.detailDesc}>{selected.damage}</Text>
                  <Text style={styles.detailMeta}>Pelapor: {selected.driver} (NIK {selected.nik})</Text>
                  <Text style={styles.detailMeta}>Body armada: {selected.body}</Text>
                  <Text style={styles.detailMeta}>Lokasi: {selected.location}</Text>
                  <Text style={styles.detailMeta}>Tanggal: {selected.date}</Text>
                  <Text style={styles.detailMeta}>Suket: {selected.suketStatus || '-'}</Text>
                  {selected.notes ? (
                    <Text style={styles.detailNotes}>Catatan: {selected.notes}</Text>
                  ) : null}
                  <PhotoStrip photos={selected.photos} large />
                  {(!Array.isArray(selected.photos) || selected.photos.length === 0) && <PhotoEmpty />}
                </View>

                <Text style={styles.label}>Status Pengerjaan</Text>
                <View style={styles.statusWrap}>
                  {STATUSES.map(s => {
                    const active = selected.status === s;
                    const c = STATUS_COLOR[s];
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusChip, active && { backgroundColor: c.bar, borderColor: c.bar }]}
                        onPress={() => save({ status: s })}
                        disabled={busy}
                      >
                        {active && <Check size={13} color="#FFFFFF" />}
                        <Text style={[styles.statusText, active && { color: '#FFFFFF' }]}>{STATUS_SHORT[s]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>Mekanik Penanggung Jawab</Text>
                <View style={styles.chipWrap}>
                  {['Belum Ditugaskan', 'Mekanik KLI', 'Bengkel Mitra'].map(m => {
                    const active = selected.mechanic === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.mechChip, active && styles.mechChipActive]}
                        onPress={() => save({ mechanic: m })}
                        disabled={busy}
                      >
                        <Text style={[styles.mechText, active && styles.mechTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {busy && <ActivityIndicator size="small" color="#0B2F64" style={{ marginTop: 14 }} />}

                <TouchableOpacity style={styles.deleteLink} onPress={() => { setPendingDelete(selected); setSelected(null); }}>
                  <Trash2 size={13} color="#EF4444" />
                  <Text style={styles.deleteLinkText}>Hapus laporan ini</Text>
                </TouchableOpacity>
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <View style={styles.confirmWrap}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>HAPUS LAPORAN?</Text>
            <Text style={styles.confirmBody}>
              Laporan "{pendingDelete?.title}" akan dihapus permanen dari logbook armada.
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
                  if (t) await deleteIncident(t.id);
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
  hint: { fontSize: 10, color: '#94A3B8', marginBottom: 12 },

  column: { marginBottom: 16 },
  colHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12
  },
  colDot: { width: 7, height: 7, borderRadius: 4 },
  colTitle: { flex: 1, fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  colCount: {
    minWidth: 22, paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center'
  },
  colCountText: { fontSize: 10, fontWeight: '900' },

  colEmpty: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
    borderStyle: 'dashed', borderColor: '#E2E8F0',
    paddingVertical: 14, alignItems: 'center', marginTop: 8
  },
  colEmptyText: { fontSize: 10, color: '#CBD5E1', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
    borderColor: '#E2E8F0', padding: 12, marginTop: 8
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardTitle: { flex: 1, fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  cardDesc: { fontSize: 11, color: '#64748B', marginTop: 6, lineHeight: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  cardCost: { fontSize: 11, fontWeight: '900', color: '#B45309', marginTop: 6 },

  modalWrap: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, maxHeight: '88%'
  },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A', letterSpacing: 0.8 },

  detailCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14 },
  detailTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  detailDesc: { fontSize: 11, color: '#475569', marginTop: 8, lineHeight: 17 },
  detailMeta: { fontSize: 10, color: '#64748B', marginTop: 6 },
  detailCost: { fontSize: 13, fontWeight: '900', color: '#B45309', marginTop: 10 },
  detailNotes: { fontSize: 11, color: '#475569', marginTop: 8, lineHeight: 16 },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  photoThumb: { borderRadius: 8, backgroundColor: '#F1F5F9' },
  photoEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 12, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1,
    borderStyle: 'dashed', borderColor: '#E2E8F0'
  },
  photoEmptyText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

  label: { fontSize: 10, fontWeight: '900', color: '#475569', marginTop: 16, marginBottom: 8 },
  statusWrap: { flexDirection: 'row', gap: 7 },
  statusChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'
  },
  statusText: { fontSize: 10, fontWeight: '900', color: '#64748B' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mechChip: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'
  },
  mechChipActive: { backgroundColor: '#0B2F64', borderColor: '#0B2F64' },
  mechText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  mechTextActive: { color: '#FFFFFF' },

  deleteLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  deleteLinkText: { fontSize: 11, fontWeight: 'bold', color: '#EF4444' },

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
