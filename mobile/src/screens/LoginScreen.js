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
import { Bus, KeyRound, User, ArrowRight } from 'lucide-react-native';

export default function LoginScreen({ onLoginSuccess }) {
  const { loginWithNik } = useApp();
  const [nikInput, setNikInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // The login list used to render five preset accounts — including the Ketua's
  // admin NIK and PIN — with a one-tap "log in as them" button, so every
  // pramudi could open the kasir's session. Gone: credentials belong to the
  // person holding the phone, not to a list baked into the APK.
  const handleLogin = () => {
    const targetNik = nikInput.trim();
    if (!targetNik) {
      setErrorMsg('Masukkan NIK pengemudi');
      return;
    }
    if (!pinInput.trim()) {
      setErrorMsg('Masukkan PIN — bawaan 4 angka terakhir NIK');
      return;
    }

    // loginWithNik returns null on success, or a reason string on failure.
    const error = loginWithNik(targetNik, pinInput.trim());
    if (!error) {
      setErrorMsg('');
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setErrorMsg(error);
    }
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
          <Text style={styles.brandSub}>DAMRI SBU TRANSBUSWAY CAWANG EV 50</Text>
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
                placeholder="Masukkan 8 digit NIK"
                value={nikInput}
                onChangeText={(text) => { setNikInput(text); setErrorMsg(''); }}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PIN Keamanan (4 angka — bawaan: 4 angka terakhir NIK)</Text>
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
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: 24
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 12, marginBottom: 12 },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '600' },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
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
    borderRadius: 12,
    marginTop: 8,
    gap: 8
  },
  loginBtnText: { color: '#0B2F64', fontWeight: '900', fontSize: 14 }
});
