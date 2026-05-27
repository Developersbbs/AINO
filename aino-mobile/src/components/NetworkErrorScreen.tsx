import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NAVY = '#0f1f3d';
const TEAL = '#3b82f6';

const TIPS = [
  'Check your WiFi or mobile data',
  'Try turning airplane mode on & off',
  'Check if other apps are working',
  'If problem persists, contact support',
];

interface Props {
  onRetry: () => void;
}

export function NetworkErrorScreen({ onRetry }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    const state = await NetInfo.fetch();
    setChecking(false);
    if (state.isConnected && state.isInternetReachable !== false) {
      onRetry();
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerSub}>System</Text>
        <Text style={s.headerTitle}>Connection Error</Text>
      </View>

      {/* Card */}
      <View style={[s.card, { paddingBottom: insets.bottom + 24 }]}>

        {/* Icon */}
        <View style={s.iconCircle}>
          <Feather name="wifi-off" size={44} color="#94a3b8" />
        </View>

        {/* Labels */}
        <Text style={s.noConn}>NO CONNECTION</Text>
        <Text style={s.title}>You're Offline</Text>
        <Text style={s.subtitle}>
          AINO can't reach the server right now. Please check your internet connection and try again.
        </Text>

        {/* Troubleshooting box */}
        <View style={s.troubleBox}>
          <Text style={s.troubleHeader}>TROUBLESHOOTING</Text>
          {TIPS.map((tip) => (
            <View key={tip} style={s.tipRow}>
              <Text style={s.check}>✓</Text>
              <Text style={s.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[s.retryBtn, checking && s.retryBtnDim]}
          onPress={handleRetry}
          disabled={checking}
          activeOpacity={0.85}
        >
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text style={s.retryText}>{checking ? 'Checking…' : 'Try Again'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.loginBtn}
          onPress={() => router.replace('/(auth)/login' as any)}
          activeOpacity={0.8}
        >
          <Text style={s.loginText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: NAVY,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  card: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  noConn: {
    fontSize: 11,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0a0f1c',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  troubleBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 28,
  },
  troubleHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  check: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '700',
    lineHeight: 20,
  },
  tipText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    flex: 1,
  },
  retryBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  retryBtnDim: { opacity: 0.6 },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  loginBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
});
