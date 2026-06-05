import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import api from '@/src/api/client';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { shadow } from '@/src/lib/shadow';
import type { AuthUser } from '@/src/stores/useAuthStore';

const NAVY = '#1e3c6e';
const MAROON = '#7a2030';

const DOC_TYPES = ['Aadhaar Card', 'PAN Card', 'Passport', 'Address Proof', 'Photo ID', 'Other'] as const;
type DocType = typeof DOC_TYPES[number];

interface UserDoc {
  name: string;
  url: string;
  type: 'pdf' | 'image';
  uploadedAt: string;
}

interface MeResponse {
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
    is_approved: boolean;
    documents: UserDoc[] | null;
  };
}

export default function PendingScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<DocType>('Aadhaar Card');
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);

  const { data: meData, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ['me-pending'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    refetchInterval: false,
  });

  const docs = meData?.user?.documents ?? [];

  const deleteMut = useMutation({
    mutationFn: (index: number) => api.delete(`/auth/me/documents/${index}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-pending'] }),
    onError: () => Alert.alert('Error', 'Could not delete document.'),
  });

  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploading(true);

      const form = new FormData();
      
      if (Platform.OS === 'web') {
        const webFile: Blob = (asset as any).file
          ?? await fetch(asset.uri).then((r) => r.blob());
        const named = new File(
          [webFile],
          asset.name ?? 'document',
          { type: asset.mimeType ?? webFile.type ?? 'application/octet-stream' },
        );
        form.append('file', named);
      } else {
        form.append('file', {
          uri: asset.uri,
          name: asset.name ?? 'document',
          type: asset.mimeType ?? 'application/octet-stream',
        } as any);
      }
      
      form.append('docType', selectedType);

      await api.post('/auth/me/documents', form, {
        headers: { 'Content-Type': undefined },
      });

      qc.invalidateQueries({ queryKey: ['me-pending'] });
    } catch {
      Alert.alert('Error', 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      setChecking(true);
      const { data } = await api.get<MeResponse>('/auth/me');
      const u = data.user;

      if (u.is_approved) {
        const updated: AuthUser = {
          id: u.id,
          name: u.name,
          phone: u.phone,
          role: u.role as AuthUser['role'],
          isApproved: true,
        };
        await updateUser(updated);
        // _layout.tsx routing will immediately redirect to role dashboard
      } else {
        Alert.alert('Still Pending', "Your account is still awaiting admin approval. We'll notify you when it's approved.");
      }
    } catch {
      Alert.alert('Error', 'Could not check status. Try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const confirmDelete = (index: number, docName: string) => {
    Alert.alert('Remove Document', `Remove "${docName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMut.mutate(index) },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <View style={s.iconWrap}>
            <Feather name="clock" size={32} color="#fff" />
          </View>
          <Text style={s.headerTitle}>Pending Approval</Text>
          <Text style={s.headerSub}>
            Hi {user?.name?.split(' ')[0] ?? 'there'}, your account is under review.
            Upload your verification documents to speed up approval.
          </Text>
        </View>

        {/* ── Status Card ── */}
        <View style={s.statusCard}>
          <View style={s.statusRow}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>Account pending admin verification</Text>
          </View>
          <Text style={s.statusSub}>
            Role: <Text style={s.statusBold}>{user?.role}</Text>
            {'   '}Phone: <Text style={s.statusBold}>{user?.phone}</Text>
          </Text>
        </View>

        {/* ── Upload Section ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Upload Documents</Text>
          <Text style={s.sectionSub}>Select document type then choose a file (PDF or image, max 10 MB)</Text>

          {/* Doc type pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.typeRow}
          >
            {DOC_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.typePill, selectedType === t && s.typePillActive]}
                onPress={() => setSelectedType(t)}
                activeOpacity={0.8}
              >
                <Text style={[s.typePillText, selectedType === t && s.typePillTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[s.uploadBtn, uploading && s.uploadBtnOff]}
            onPress={handlePickAndUpload}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="upload" size={18} color="#fff" />
                <Text style={s.uploadBtnText}>Choose & Upload {selectedType}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Uploaded Documents ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Uploaded Documents</Text>

          {meLoading && <ActivityIndicator color={NAVY} style={{ marginTop: 12 }} />}
          {!meLoading && docs.length === 0 && (
            <View style={s.emptyBox}>
              <Feather name="file-text" size={28} color="#cbd5e1" />
              <Text style={s.emptyText}>No documents uploaded yet</Text>
            </View>
          )}
          {!meLoading && docs.map((doc, i) => (
            <View key={`${doc.uploadedAt}-${doc.name}`} style={s.docRow}>
              <View style={s.docIconWrap}>
                <Feather name={doc.type === 'pdf' ? 'file-text' : 'image'} size={20} color={NAVY} />
              </View>
              <View style={s.docInfo}>
                <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
                <Text style={s.docDate}>
                  {new Date(doc.uploadedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
              <TouchableOpacity
                style={s.docDel}
                onPress={() => confirmDelete(i, doc.name)}
                disabled={deleteMut.isPending}
              >
                <Feather name="trash-2" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── Check Status ── */}
        <View style={s.section}>
          <TouchableOpacity
            style={[s.checkBtn, checking && s.checkBtnOff]}
            onPress={handleCheckStatus}
            disabled={checking}
            activeOpacity={0.85}
          >
            {checking ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <>
                <Feather name="refresh-cw" size={18} color={NAVY} />
                <Text style={s.checkBtnText}>Check Approval Status</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={s.checkHint}>
            Once approved by admin, you'll be redirected to your dashboard automatically.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  scroll: { flexGrow: 1, paddingBottom: 48 },

  // Header
  header: {
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  logoutBtn: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 10 },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },

  // Status card
  statusCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 4,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f59e0b' },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  statusBold: { color: 'rgba(255,255,255,0.9)', fontWeight: '700' },

  // Content sections
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    ...shadow(NAVY, 8, 0.08, 16, 4),
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0a0f1c', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 14 },

  // Type pills
  typeRow: { paddingBottom: 4, gap: 8, marginBottom: 16 },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  typePillActive: { backgroundColor: NAVY, borderColor: NAVY },
  typePillText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  typePillTextActive: { color: '#fff' },

  // Upload button
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    backgroundColor: NAVY,
    ...shadow(NAVY, 8, 0.25, 12, 4),
  },
  uploadBtnOff: { opacity: 0.5 },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Doc list
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: { fontSize: 14, color: '#94a3b8' },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: NAVY + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '700', color: '#0a0f1c' },
  docDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  docDel: { padding: 8 },

  // Check status
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f0f4ff',
    borderWidth: 1.5,
    borderColor: NAVY + '30',
    marginBottom: 12,
  },
  checkBtnOff: { opacity: 0.5 },
  checkBtnText: { fontSize: 15, fontWeight: '700', color: NAVY },
  checkHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
