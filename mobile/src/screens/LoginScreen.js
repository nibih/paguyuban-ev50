import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView 
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Bus, KeyRound, User, ShieldCheck, ArrowRight, Check } from 'lucide-react-native';

export default function LoginScreen({ onLoginSuccess }) {
  const { users, loginWithNik } = useApp();
  const [nikInput, setNikInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Preset demo test accounts
  const DEMO_ACCOUNTS = [
    { nik: '17002197', name: 'Nicholas', role: 'Pramudi (Laka Tabrak Mobil MAC Rp910k)', defaultPin: '2197' },
    { nik: '17001137', name: 'A Sutriadi', role: 'Pramudi (Lunas Kas & Bersih)', defaultPin: '1137' },
    { nik: '17001504', name: 'M. Sapli', role: 'Pramudi (Ada Hutang Laka Rp200k)', defaultPin: '1504' },
    { nik: '17001109', name: 'M. Hasan', role: 'Pramudi (Hutang Suket Rp500k)', defaultPin: '1109' },
    { nik: '17001589', name: 'Afrizal Firmansyah', role: 'Admin Kasir / Korlap', defaultPin: '1589' },
  ];

  const handleLogin = (selectedNik = null) => {
    const targetNik = selectedNik || nikInput.trim();
    if (!targetNik) {
      setErrorMsg('Masukkan NIK pengemudi atau pilih akun pengujian');
      return;
    }

    const success = loginWithNik(targetNik);
    if (success) {
      setErrorMsg('');
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setErrorMsg('NIK tidak terdaftar dalam paguyuban');
    }
  };

  const handleSelectDemo = (account) => {
    setNikInput(account.nik);
    setPinInput(account.defaultPin);
    handleLogin(account.nik);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header App Branding */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Bus size={32} color="#00A896" />
          </View>
          <Text style={styles.brandTitle}>PAGUYUBAN EV50</Text>
          <Text style={styles.brandSub}>SBU TRANSBUSWAY AREA CAWANG</Text>
          <Text style={styles.instruction}>
            Portal Manajemen Iuran, Dana Talang & Perbaikan Armada EV
          </Text>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Masuk Akun Pramudi / Pengurus</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nomor Induk Karyawan (NIK)</Text>
            <View style={styles.inputRow}>
              <User size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Contoh: 17001137"
                value={nikInput}
                onChangeText={(text) => { setNikInput(text); setErrorMsg(''); }}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PIN Keamanan (Opsional Default: 4 Angka Terakhir NIK)</Text>
            <View style={styles.inputRow}>
              <KeyRound size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="****"
                value={pinInput}
                onChangeText={setPinInput}
                secureTextEntry
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={() => handleLogin()}>
            <Text style={styles.loginBtnText}>Masuk ke Aplikasi</Text>
            <ArrowRight size={18} color="#0B2F64" />
          </TouchableOpacity>
        </View>

        {/* 1-Click Demo Accounts Quick Test */}
        <View style={styles.demoSection}>
          <Text style={styles.demoHeader}>⚡ PILIH AKUN PENGUJIAN INSTAN (1-CLICK TEST):</Text>

          {DEMO_ACCOUNTS.map((acc) => (
            <TouchableOpacity 
              key={acc.nik} 
              style={styles.demoCard} 
              onPress={() => handleSelectDemo(acc)}
            >
              <View style={styles.demoAvatar}>
                <Text style={styles.demoAvatarText}>{acc.name.charAt(0)}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.demoName}>{acc.name}</Text>
                <Text style={styles.demoRole}>{acc.role}</Text>
                <Text style={styles.demoNik}>NIK: {acc.nik} • PIN: {acc.defaultPin}</Text>
              </View>

              <View style={styles.demoBtnPill}>
                <Text style={styles.demoBtnText}>Pilih & Test</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B2F64' },
  scroll: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#061A38',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.4)',
    marginBottom: 12
  },
  brandTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },
  brandSub: { fontSize: 11, fontWeight: 'bold', color: '#00A896', marginTop: 2, letterSpacing: 1 },
  instruction: { fontSize: 12, color: '#93C5FD', textAlign: 'center', marginTop: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: 24
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 10, marginBottom: 12 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '600' },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12
  },
  input: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 14, color: '#0F172A' },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A896',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    gap: 8
  },
  loginBtnText: { color: '#0B2F64', fontWeight: '900', fontSize: 14 },
  demoSection: { marginTop: 4 },
  demoHeader: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', marginBottom: 10, letterSpacing: 0.5 },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10
  },
  demoAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#00A896',
    alignItems: 'center',
    justifyContent: 'center'
  },
  demoAvatarText: { color: '#0B2F64', fontWeight: 'bold', fontSize: 16 },
  demoName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  demoRole: { color: '#38BDF8', fontSize: 11, marginTop: 1 },
  demoNik: { color: '#94A3B8', fontSize: 10, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  demoBtnPill: {
    backgroundColor: '#00A896',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  demoBtnText: { color: '#0B2F64', fontSize: 11, fontWeight: 'bold' }
});
