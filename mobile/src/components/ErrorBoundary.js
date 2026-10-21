import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react-native';

// Catches render-time crashes so one broken screen does not strand a driver on
// a blank view with no way back to the rest of the app.
//
// It deliberately reads no context. AppProvider owns the Firestore listeners
// and is the thing most likely to throw, and a boundary that pulled from it
// would go down with it — so this is mounted above the provider in App.js.
export default class ErrorBoundary extends React.Component {
  state = { error: null, copied: false };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // console.error, not warn: a real crash should stay visible in a release
    // build's logcat when the drivers report it.
    console.error('App crashed:', error, info?.componentStack);
  }

  // There is no programmatic restart here (expo-updates is not installed), so
  // "Coba Lagi" re-attempts the render instead. For a transient bad prop this
  // recovers; for a real bug it re-throws and lands back on this screen, which
  // is honest rather than a dead button.
  handleRetry = () => this.setState({ error: null, copied: false });

  handleCopy = async () => {
    const { error } = this.state;
    const report = [
      'PAGUYUBAN EV50 — laporan layar rusak',
      `Pesan: ${error?.message || '(tanpa pesan)'}`,
      `Waktu: ${new Date().toISOString()}`,
    ].join('\n');
    await Clipboard.setStringAsync(report);
    this.setState({ copied: true });
  };

  render() {
    const { error, copied } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <AlertTriangle size={18} color="#BE123C" />
            <Text style={styles.eyebrow}>LAYAR RUSAK</Text>
          </View>

          <Text style={styles.title}>Bagian ini gagal dimuat.</Text>

          <Text style={styles.body}>
            Uang kas dan catatannya tidak hilang — hanya tampilannya yang gagal
            dirender. Coba lagi, atau tutup dan buka kembali aplikasinya. Bila ini
            terus terjadi, salin laporannya dan kirim ke pengurus.
          </Text>

          {!!error?.message && (
            <Text style={styles.errorText} selectable>
              {String(error.message)}
            </Text>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={this.handleRetry} activeOpacity={0.8}>
            <RefreshCw size={15} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Coba Lagi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostBtn} onPress={this.handleCopy} activeOpacity={0.8}>
            <Copy size={15} color="#334155" />
            <Text style={styles.ghostBtnText}>{copied ? 'Laporan tersalin' : 'Salin Laporan'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    paddingHorizontal: 20,
    // The SafeAreaProvider may live inside the subtree that just failed, so
    // this cannot rely on it for the status-bar inset.
    paddingTop: 56,
    paddingBottom: 40
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: 20
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#BE123C'
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: '#334155'
  },
  errorText: {
    marginTop: 14,
    maxHeight: 140,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#475569'
  },
  primaryBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B2F64',
    borderRadius: 12,
    paddingVertical: 14
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1
  },
  ghostBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 14
  },
  ghostBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5
  }
});
