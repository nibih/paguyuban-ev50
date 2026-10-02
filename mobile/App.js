import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import MemberDashboard from './src/screens/MemberDashboard';
import MemberIuran from './src/screens/MemberIuran';
import MemberTalangan from './src/screens/MemberTalangan';
import MemberLaporPerbaikan from './src/screens/MemberLaporPerbaikan';
import MemberKasTerbuka from './src/screens/MemberKasTerbuka';
import AdminDashboard from './src/screens/AdminDashboard';

// Icons
import { Home, CreditCard, AlertCircle, Wrench, ShieldCheck, RefreshCw, LogOut } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

function MainNavigation() {
  const { isAuthenticated, logout, role, setRole, toast } = useApp();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B2F64' }} edges={['top']}>
      <StatusBar style="light" backgroundColor="#0B2F64" />

      {/* Top Universal Control Bar with Role Toggle & Logout */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topLogo}>PAGUYUBAN EV50</Text>
          <Text style={styles.topSub}>TRANSBUSWAY CAWANG</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity 
            style={styles.roleToggle}
            onPress={() => setRole(role === 'member' ? 'admin' : 'member')}
          >
            <RefreshCw size={12} color="#00A896" />
            <Text style={styles.roleText}>{role === 'member' ? 'Pramudi' : 'Pengurus'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.logoutBtn}
            onPress={logout}
            title="Keluar Akun"
          >
            <LogOut size={14} color="#FCA5A5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation View */}
      {role === 'member' ? (
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#E2E8F0',
              height: 60,
              paddingBottom: 8,
              paddingTop: 6
            },
            tabBarActiveTintColor: '#0B2F64',
            tabBarInactiveTintColor: '#94A3B8',
            tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold' }
          }}
        >
          <Tab.Screen 
            name="Beranda" 
            component={MemberDashboard} 
            options={{
              tabBarIcon: ({ color, size }) => <Home size={20} color={color} />
            }}
          />
          <Tab.Screen 
            name="Iuran" 
            component={MemberIuran} 
            options={{
              tabBarIcon: ({ color, size }) => <CreditCard size={20} color={color} />
            }}
          />
          <Tab.Screen 
            name="Talangan" 
            component={MemberTalangan} 
            options={{
              tabBarIcon: ({ color, size }) => <AlertCircle size={20} color={color} />
            }}
          />
          <Tab.Screen 
            name="Lapor Perbaikan" 
            component={MemberLaporPerbaikan} 
            options={{
              tabBarIcon: ({ color, size }) => <Wrench size={20} color={color} />
            }}
          />
          <Tab.Screen 
            name="Kas Terbuka" 
            component={MemberKasTerbuka} 
            options={{
              tabBarIcon: ({ color, size }) => <ShieldCheck size={20} color={color} />
            }}
          />
        </Tab.Navigator>
      ) : (
        <AdminDashboard />
      )}

      {/* Global Interactive Toast Notification */}
      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <MainNavigation />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 54,
    backgroundColor: '#0B2F64',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  topLogo: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  topSub: { color: '#00A896', fontSize: 9, fontWeight: 'bold' },
  roleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 168, 150, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 150, 0.3)'
  },
  roleText: { color: '#00A896', fontSize: 11, fontWeight: 'bold' },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)'
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00A896',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8
  },
  toastText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }
});
