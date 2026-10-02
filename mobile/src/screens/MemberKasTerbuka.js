import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import { Search, Calendar, FileText } from 'lucide-react-native';

export default function MemberKasTerbuka() {
  const { expenses } = useApp();
  const [search, setSearch] = useState('');

  const filtered = expenses.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) || 
    e.pic.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Search size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari bansos, cat, sparepart, suket..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.date}>{item.date}</Text>
              <View style={styles.catBadge}>
                <Text style={styles.catText}>{item.category}</Text>
              </View>
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.rowBottom}>
              <Text style={styles.pic}>PIC: {item.pic}</Text>
              <Text style={styles.amount}>- Rp{item.amount.toLocaleString('id-ID')}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13 },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  date: { fontSize: 11, color: '#94A3B8' },
  catBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 10, fontWeight: 'bold', color: '#475569' },
  title: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginBottom: 6 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pic: { fontSize: 11, color: '#64748B' },
  amount: { fontSize: 13, fontWeight: 'bold', color: '#E11D48' }
});
