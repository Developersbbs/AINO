import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />
      <SafeAreaView style={s.container}>
        <View style={s.content}>
          <View style={s.iconWrap}>
            <Feather name="map-pin" size={42} color="#1e3c6e" />
          </View>
          <Text style={s.title}>Page Not Found</Text>
          <Text style={s.subtitle}>
            We couldn't find the page you were looking for. It might have been moved or doesn't exist.
          </Text>
          <Link href="/" asChild>
            <TouchableOpacity style={s.button} activeOpacity={0.85}>
              <Feather name="home" size={18} color="#fff" />
              <Text style={s.buttonText}>Go to Home</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#e8edf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0a0f1c',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    maxWidth: 280,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3c6e',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#1e3c6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
