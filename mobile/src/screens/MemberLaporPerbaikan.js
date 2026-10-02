import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch } from 'react-native';
import { useApp } from '../context/AppContext';
import { Wrench, Bus, MapPin, Send, CheckSquare } from 'lucide-react-native';

export default function MemberLaporPerbaikan({ navigation }) {
  const { currentUser, addIncident } = useApp();
  const [body, setBody] = useState('Body 248');
  const [location, setLocation] = useState('');
  const [damage, setDamage] = useState('Bemper kanan baret');
  const [needSuket, setNeedSuket] = useState(false);
  const [needMechanic, setNeedMechanic] = useState(true);

  const handleSubmit = () => {
    if (!location) {
      alert('Mohon isi lokasi kejadian insiden');
      return;
    }
    addIncident({
      body,
      driver: currentUser.name,
      nik: currentUser.nik,
      damage,
      location,
      suketStatus: needSuket ? 'Suket Kepolisian Diproses' : 'Tidak Perlu Suket',
      needMechanic
    });
    navigation.navigate('Beranda');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.infoBox}>
        <Wrench size={18} color="#00A896" />
        <Text style={styles.infoText}>
          Formulir perbaikan bodi baret/insiden jalur armada listrik Transjakarta Cawang (Mekanik KLI/Uday).
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Nomor Lambung Armada (Body EV):</Text>
        <TextInput style={styles.input} value={body} onChangeText={setBody} placeholder="Misal: Body 248" />

        <Text style={styles.label}>Titik Lokasi Insiden:</Text>
        <TextInput 
          style={styles.input} 
          value={location} 
          onChangeText={setLocation} 
          placeholder="Contoh: Koridor 6H / Tol JORR / Halte Cawang" 
        />

        <Text style={styles.label}>Rincian Kerusakan Bodi:</Text>
        <TextInput 
          style={[styles.input, { height: 80 }]} 
          value={damage} 
          onChangeText={setDamage} 
          multiline 
          placeholder="Jelaskan baret bemper, spion pecah, atau senggolan..."
        />

        {/* Toggles */}
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.toggleTitle}>Pengurusan Suket Laka Polisi</Text>
            <Text style={styles.toggleSub}>Ditalangi kas paguyuban untuk klaim asuransi DAMRI</Text>
          </View>
          <Switch value={needSuket} onValueChange={setNeedSuket} trackColor={{ true: '#00A896' }} />
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.toggleTitle}>Dukungan Mekanik Lapangan</Text>
            <Text style={styles.toggleSub}>Penugasan Mekanik KLI atau Mekanik Uday</Text>
          </View>
          <Switch value={needMechanic} onValueChange={setNeedMechanic} trackColor={{ true: '#00A896' }} />
        </View>

        <TouchableOpacity style={styles.sendBtn} onPress={handleSubmit}>
          <Send size={16} color="#FFFFFF" />
          <Text style={styles.sendText}>Kirim Laporan ke Tim Korlap</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 10,
    marginBottom: 16
  },
  infoText: { flex: 1, fontSize: 12, color: '#0F766E', lineHeight: 18 },
  formCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  label: { fontSize: 12, fontWeight: 'bold', color: '#1E293B', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    backgroundColor: '#F8FAFC'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 10
  },
  toggleTitle: { fontSize: 13, fontWeight: 'bold', color: '#0F172A' },
  toggleSub: { fontSize: 10, color: '#64748B', marginTop: 2 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B2F64',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    gap: 8
  },
  sendText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }
});
