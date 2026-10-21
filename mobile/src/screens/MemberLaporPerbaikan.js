import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { Wrench, Send, Camera, X, ImagePlus } from 'lucide-react-native';
import { captureThumbnail, MAX_PHOTOS, MAX_BASE64_BYTES } from '../utils/thumbnails';

export default function MemberLaporPerbaikan({ navigation }) {
  const { currentUser, addIncident } = useApp();
  const [body, setBody] = useState('Body 248');
  const [location, setLocation] = useState('');
  const [damage, setDamage] = useState('Bemper kanan baret');
  const [needSuket, setNeedSuket] = useState(false);
  const [needMechanic, setNeedMechanic] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [picking, setPicking] = useState(false);

  const addPhoto = async (source) => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Batas foto', `Maksimal ${MAX_PHOTOS} foto per laporan.`);
      return;
    }
    setPicking(true);
    try {
      const shot = await captureThumbnail(source);
      if (shot) setPhotos(prev => [...prev, shot]);
    } catch (e) {
      Alert.alert('Foto gagal', e.message || 'Coba lagi.');
    } finally {
      setPicking(false);
    }
  };

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert('Lokasi kosong', 'Mohon isi lokasi kejadian insiden.');
      return;
    }
    // Only leave the form once the report is confirmed stored; on failure
    // the driver keeps their input and can retry.
    const ok = await addIncident({
      body,
      driver: currentUser.name,
      nik: currentUser.nik,
      damage,
      location,
      suketStatus: needSuket ? 'Suket Kepolisian Diproses' : 'Tidak Perlu Suket',
      needMechanic,
      photos
    });
    if (ok) navigation.navigate('Beranda');
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

        {/* Photo evidence — MVP stores downscaled thumbnails on the record */}
        <Text style={styles.label}>Foto Kerusakan Bodi (opsional):</Text>
        <Text style={styles.photoHint}>
          Maksimal {MAX_PHOTOS} foto, otomatis dikompres agar ringan diunduh mekanik.
        </Text>

        <View style={styles.photoRow}>
          {photos.map((p, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri: p.uri }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}

          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity
              style={[styles.photoAdd, picking && { opacity: 0.5 }]}
              onPress={() => addPhoto('camera')}
              disabled={picking}
              activeOpacity={0.8}
            >
              {picking
                ? <ActivityIndicator size="small" color="#00A896" />
                : <Camera size={18} color="#00A896" />}
              <Text style={styles.photoAddText}>Kamera</Text>
            </TouchableOpacity>
          )}

          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity
              style={[styles.photoAdd, picking && { opacity: 0.5 }]}
              onPress={() => addPhoto('library')}
              disabled={picking}
              activeOpacity={0.8}
            >
              <ImagePlus size={18} color="#00A896" />
              <Text style={styles.photoAddText}>Galeri</Text>
            </TouchableOpacity>
          )}
        </View>

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

  photoHint: { fontSize: 10, color: '#94A3B8', marginBottom: 10, marginTop: -2 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 74, height: 74, borderRadius: 8, backgroundColor: '#F1F5F9' },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF'
  },
  photoAdd: {
    width: 74, height: 74, borderRadius: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
    alignItems: 'center', justifyContent: 'center', gap: 3
  },
  photoAddText: { fontSize: 9, fontWeight: 'bold', color: '#0F766E' },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B2F64',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    gap: 8
  },
  sendText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }
});
