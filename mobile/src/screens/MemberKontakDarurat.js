import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { EMERGENCY_ROUTES } from '../constants';
import { prettyPhone, telHref, waHref } from '../utils/format';
import { X, Phone, MessageCircle, AlertTriangle } from 'lucide-react-native';

// The route dispatch list, on the handset.
//
// This is the screen someone opens while standing next to a bus that will not
// start, so it optimises for two things only: reach the right row fast, and
// dial it in one tap. Everything else — editing, grouping order, validation —
// is the admin panel's job.
//
// Grouped by route key rather than free text so a typo in the panel cannot
// split one depot across two headings. An unrecognised key (written by a newer
// panel build) still renders, under a trailing "Rute lainnya" group, because a
// contact quietly vanishing is the one failure this list cannot afford.
//
// Contacts are NOT bundled in seedData.json: a stale second copy of a phone
// number is worse than a visibly empty list. When Firestore has not answered,
// the empty state says so instead of inventing a roster.
export default function MemberKontakDarurat({ onClose }) {
  const { emergencyContacts } = useApp();

  const groups = useMemo(() => {
    const buckets = EMERGENCY_ROUTES.map(r => ({ ...r, items: [] }));
    const byKey = new Map(buckets.map(g => [g.key, g]));
    const orphans = { key: '__other', label: 'Rute lainnya', items: [] };

    emergencyContacts.forEach(c => {
      (byKey.get(c.route) || orphans).items.push(c);
    });

    const out = buckets.filter(g => g.items.length > 0);
    if (orphans.items.length > 0) out.push(orphans);
    return out;
  }, [emergencyContacts]);

  const call = (c) => {
    const href = telHref(c.phone);
    if (!href) return;
    Linking.openURL(href).catch(() =>
      Alert.alert('Tidak bisa menelepon', `Nomor ${c.name}:\n${prettyPhone(c.phone)}`)
    );
  };

  const chat = (c) => {
    const href = waHref(c.phone);
    if (!href) return;
    Linking.openURL(href).catch(() =>
      Alert.alert('Tidak bisa membuka WhatsApp', `Nomor ${c.name}:\n${prettyPhone(c.phone)}`)
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Kontak Darurat</Text>
          <Text style={styles.headerSub}>Panggilan per rute</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={16} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Phone size={26} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Belum ada kontak darurat</Text>
            <Text style={styles.emptyText}>
              Daftar ini dimuat dari server. Pastikan HP terhubung internet — kalau daftar
              tetap kosong, pengurus belum mengisinya di panel admin.
            </Text>
          </View>
        ) : (
          groups.map(g => (
            <View key={g.key} style={styles.groupCard}>
              <View style={styles.groupHead}>
                <Text style={styles.groupLabel} numberOfLines={2}>{g.label}</Text>
                <Text style={styles.groupCount}>{g.items.length} kontak</Text>
              </View>

              {g.items.map((c, i) => {
                const hasPhone = !!c.phone;
                return (
                  <View key={c.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
                      {hasPhone ? (
                        <Text style={styles.phone}>{prettyPhone(c.phone)}</Text>
                      ) : (
                        <View style={styles.warnPill}>
                          <AlertTriangle size={9} color="#BE123C" />
                          <Text style={styles.warnText}>Nomor belum lengkap</Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.action, hasPhone ? styles.actionCall : styles.actionOff]}
                      disabled={!hasPhone}
                      onPress={() => call(c)}
                      accessibilityLabel={`Telepon ${c.name}`}
                    >
                      <Phone size={14} color={hasPhone ? '#FFFFFF' : '#CBD5E1'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.action, hasPhone ? styles.actionWa : styles.actionOff]}
                      disabled={!hasPhone}
                      onPress={() => chat(c)}
                      accessibilityLabel={`WhatsApp ${c.name}`}
                    >
                      <MessageCircle size={14} color={hasPhone ? '#FFFFFF' : '#CBD5E1'} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))
        )}

        {groups.length > 0 && (
          <Text style={styles.footNote}>
            Daftar ini dikelola pengurus paguyuban. Nomor yang belum lengkap ditandai merah
            dan belum bisa dihubungi.
          </Text>
        )}
      </ScrollView>
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
  headerSub: { fontSize: 10, color: '#64748B', marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center'
  },

  list: { paddingHorizontal: 16, paddingBottom: 28 },

  groupCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
    borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 12
  },
  groupHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0'
  },
  groupLabel: { flex: 1, fontSize: 10, fontWeight: 'bold', color: '#0B2F64', letterSpacing: 0.4 },
  groupCount: { fontSize: 10, color: '#94A3B8' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 11 },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  name: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  phone: { fontSize: 11, color: '#64748B', marginTop: 2, letterSpacing: 0.2 },

  warnPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', marginTop: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3'
  },
  warnText: { fontSize: 9, fontWeight: 'bold', color: '#BE123C' },

  action: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionCall: { backgroundColor: '#059669' },
  actionWa: { backgroundColor: '#25D366' },
  actionOff: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },

  empty: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
    borderStyle: 'dashed', borderColor: '#E2E8F0',
    padding: 28, alignItems: 'center', marginTop: 8
  },
  emptyTitle: { fontSize: 13, fontWeight: 'bold', color: '#94A3B8', marginTop: 12 },
  emptyText: {
    fontSize: 11, color: '#64748B', textAlign: 'center',
    marginTop: 6, lineHeight: 17
  },

  footNote: {
    fontSize: 10, color: '#94A3B8', textAlign: 'center',
    lineHeight: 16, marginTop: 2, paddingHorizontal: 8
  }
});
