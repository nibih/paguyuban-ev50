import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useApp } from '../../context/AppContext';
import { BarChart3, Table2, Receipt, Wallet, Bus } from 'lucide-react-native';

import AdminKas from './AdminKas';
import AdminIuran from './AdminIuran';
import AdminPengeluaran from './AdminPengeluaran';
import AdminPiutang from './AdminPiutang';
import AdminLogbook from './AdminLogbook';

const NAV = [
  { id: 'A1', label: 'Kas', icon: BarChart3, Screen: AdminKas },
  { id: 'A2', label: 'Iuran', icon: Table2, Screen: AdminIuran },
  { id: 'A3', label: 'Keluar', icon: Receipt, Screen: AdminPengeluaran },
  { id: 'A4', label: 'Piutang', icon: Wallet, Screen: AdminPiutang },
  { id: 'A5', label: 'Bodi', icon: Bus, Screen: AdminLogbook }
];

export default function AdminContainer() {
  const [tab, setTab] = useState('A1');
  const { debts, incidents, currentUser } = useApp();

  const badgeFor = (id) => {
    if (id === 'A4') return debts.filter(d => (d.amount - d.paid) > 0).length;
    if (id === 'A5') return incidents.filter(i => !String(i.status).includes('Selesai')).length;
    return null;
  };

  const active = NAV.find(n => n.id === tab) || NAV[0];
  const ActiveScreen = active.Screen;

  return (
    <View style={styles.wrap}>
      {/* Identity strip — who is operating the till */}
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(currentUser?.name || 'Admin').split(' ').map(w => w[0]).slice(0, 2).join('')}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.identityName}>{currentUser?.name || 'Pengurus'}</Text>
          <Text style={styles.identityRole}>{currentUser?.position || 'Admin Kasir & Korlap'}</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.navStrip}
        contentContainerStyle={styles.navInner}
      >
        {NAV.map(n => {
          const Icon = n.icon;
          const isActive = tab === n.id;
          const badge = badgeFor(n.id);
          return (
            <TouchableOpacity
              key={n.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => setTab(n.id)}
              activeOpacity={0.8}
            >
              <Icon size={15} color={isActive ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{n.label}</Text>
              {badge !== null && badge > 0 && (
                <View style={[styles.navBadge, isActive && styles.navBadgeActive]}>
                  <Text style={[styles.navBadgeText, isActive && styles.navBadgeTextActive]}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <ActiveScreen />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F8FAFC' },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0B2F64',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  avatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#00A896',
    alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  identityName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  identityRole: { color: '#5EEAD4', fontSize: 10, fontWeight: '600' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,168,150,0.2)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5EEAD4' },
  liveText: { color: '#5EEAD4', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  navStrip: { maxHeight: 56, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  navInner: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, backgroundColor: '#F1F5F9'
  },
  navItemActive: { backgroundColor: '#0B2F64' },
  navLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },
  navLabelActive: { color: '#FFFFFF' },
  navBadge: {
    minWidth: 18, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 9, backgroundColor: '#E2E8F0',
    alignItems: 'center'
  },
  navBadgeActive: { backgroundColor: '#00A896' },
  navBadgeText: { fontSize: 9, fontWeight: '900', color: '#475569' },
  navBadgeTextActive: { color: '#FFFFFF' },

  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 40 }
});
