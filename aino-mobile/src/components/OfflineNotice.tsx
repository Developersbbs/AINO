import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform, Dimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineNotice() {
  const [isConnected, setIsConnected] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // isInternetReachable is more accurate, but isConnected is a good fallback
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      setIsConnected(connected);
    });

    return () => unsubscribe();
  }, []);

  if (isConnected) return null;

  return (
    <View style={[s.container, { paddingTop: Platform.OS === 'ios' ? insets.top : 0 }]}>
      <View style={s.content}>
        <Feather name="wifi-off" size={16} color="#fff" style={s.icon} />
        <Text style={s.text}>No internet connection</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#dc2626',
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  icon: {
    opacity: 0.9,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
