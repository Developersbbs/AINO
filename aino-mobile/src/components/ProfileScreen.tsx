import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/useAuthStore';
import api from '@/src/api/client';
import { shadow } from '@/src/lib/shadow';

const GREEN = '#1e3c6e';
const RED = '#dc2626';

const ROLE_COLOR: Record<string, string> = {
  Admin: '#1e3c6e',
  Agent: '#1e3c6e',
  Owner: '#7a2030',
};

const ROLE_LABEL: Record<string, string> = {
  Admin: 'ADMIN PANEL',
  Agent: 'SALES AGENT',
  Owner: 'PROPERTY OWNER',
};

const DOC_TYPES = ['Aadhaar Card', 'PAN Card', 'Passport', 'Address Proof', 'Photo ID', 'Other'] as const;
type DocType = typeof DOC_TYPES[number];

interface UserDoc {
  name: string;
  url: string;
  type: 'pdf' | 'image';
  uploadedAt: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MenuItem({
  icon, label, onPress, loading, destructive,
}: Readonly<{
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  loading?: boolean;
  destructive?: boolean;
}>) {
  const color = destructive ? RED : '#0a0f1c';
  const bg = destructive ? '#fff9f9' : '#fff';

  return (
    <TouchableOpacity
      style={[s.menuItem, { backgroundColor: bg }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={[s.menuIconWrap, { backgroundColor: destructive ? '#fef2f2' : '#f1f5f9' }]}>
        {loading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Feather name={icon} size={18} color={color} />
        )}
      </View>
      <Text style={[s.menuLabel, { color }]}>{label}</Text>
      {!loading && <Feather name="chevron-right" size={16} color={destructive ? '#fca5a5' : '#cbd5e1'} />}
    </TouchableOpacity>
  );
}

function DocRow({ doc, index, onDelete, deleting }: Readonly<{
  doc: UserDoc;
  index: number;
  onDelete: (i: number, name: string) => void;
  deleting: boolean;
}>) {
  return (
    <View style={s.docRow}>
      <View style={s.docIconWrap}>
        <Feather name={doc.type === 'pdf' ? 'file-text' : 'image'} size={16} color={GREEN} />
      </View>
      <View style={s.docInfo}>
        <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
        <Text style={s.docDate}>
          {new Date(doc.uploadedAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>
      <View style={[s.docTypeBadge, doc.type === 'pdf' ? s.docTypePdf : s.docTypeImg]}>
        <Text style={s.docTypeText}>{doc.type.toUpperCase()}</Text>
      </View>
      <TouchableOpacity
        style={s.docDel}
        onPress={() => onDelete(index, doc.name)}
        disabled={deleting}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="trash-2" size={15} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<DocType>('Aadhaar Card');

  const roleColor = user ? (ROLE_COLOR[user.role] ?? GREEN) : GREEN;
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role.toUpperCase()) : '';

  // Fetch latest profile (including documents)
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.user),
    enabled: !!user,
  });

  const docs: UserDoc[] = (meData?.documents ?? []) as UserDoc[];

  const deleteMut = useMutation({
    mutationFn: (index: number) => api.delete(`/auth/me/documents/${index}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile-me'] }),
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
      form.append('file', {
        uri: asset.uri,
        name: asset.name ?? 'document',
        type: asset.mimeType ?? 'application/octet-stream',
      } as any);
      form.append('docType', selectedType);

      await api.post('/auth/me/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['profile-me'] });
    } catch {
      Alert.alert('Error', 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (index: number, docName: string) => {
    Alert.alert('Remove Document', `Remove "${docName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMut.mutate(index) },
    ]);
  };

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post('/auth/logout');
    } catch {
      // clear local state regardless
    } finally {
      await logout();
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: doLogout },
    ]);
  };

  const doDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/auth/account');
      await logout();
    } catch (err: any) {
      setDeleting(false);
      Alert.alert('Error', err.response?.data?.message ?? 'Could not delete account. Try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Are you absolutely sure?',
              `Your account for ${user?.phone} will be permanently deleted.`,
              [
                { text: 'No, keep it', style: 'cancel' },
                { text: 'Yes, delete', style: 'destructive', onPress: doDeleteAccount },
              ],
            ),
        },
      ],
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: roleColor }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero banner ── */}
        <View style={[s.hero, { backgroundColor: roleColor }]}>
          <Image
            source={require('@/assets/images/aino-logo.png')}
            style={s.heroLogo}
            resizeMode="contain"
          />
          <Text style={s.heroRole}>{roleLabel}</Text>
          <Text style={s.heroName}>{user.name}</Text>
          <View style={s.heroPill}>
            <Feather name="phone" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={s.heroPillText}>{user.phone}</Text>
          </View>
        </View>

        {/* ── Content card ── */}
        <View style={s.content}>

          {/* Account info */}
          <Text style={s.sectionLabel}>ACCOUNT</Text>
          <View style={s.menuGroup}>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Feather name="user" size={16} color="#64748b" />
              </View>
              <View style={s.infoText}>
                <Text style={s.infoLabel}>Full Name</Text>
                <Text style={s.infoValue}>{user.name}</Text>
              </View>
            </View>
            <View style={s.separator} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Feather name="phone" size={16} color="#64748b" />
              </View>
              <View style={s.infoText}>
                <Text style={s.infoLabel}>Phone Number</Text>
                <Text style={s.infoValue}>{user.phone}</Text>
              </View>
            </View>
            <View style={s.separator} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Feather name="shield" size={16} color="#64748b" />
              </View>
              <View style={s.infoText}>
                <Text style={s.infoLabel}>Role</Text>
                <Text style={[s.infoValue, { color: roleColor }]}>{user.role}</Text>
              </View>
            </View>
          </View>

          {/* Documents */}
          <Text style={[s.sectionLabel, { marginTop: 28 }]}>DOCUMENTS</Text>
          <View style={[s.menuGroup, { overflow: 'visible' }]}>

            {/* Type selector */}
            <View style={s.docTypeSection}>
              <Text style={s.docTypeLabel}>Document Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.typeRow}
              >
                {DOC_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typePill, selectedType === t && s.typePillActive, selectedType === t && { backgroundColor: roleColor, borderColor: roleColor }]}
                    onPress={() => setSelectedType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.typePillText, selectedType === t && s.typePillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[s.uploadBtn, { backgroundColor: roleColor }, uploading && s.uploadBtnOff]}
                onPress={handlePickAndUpload}
                disabled={uploading}
                activeOpacity={0.85}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="upload" size={16} color="#fff" />
                    <Text style={s.uploadBtnText}>Upload {selectedType}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Uploaded list */}
            {meLoading && <ActivityIndicator color={GREEN} style={{ padding: 20 }} />}
            {!meLoading && docs.length === 0 && (
              <View style={s.emptyDocs}>
                <Feather name="file-text" size={24} color="#cbd5e1" />
                <Text style={s.emptyDocsText}>No documents uploaded yet</Text>
              </View>
            )}
            {!meLoading && docs.length > 0 && (
              <View style={s.docList}>
                {docs.map((doc, i) => (
                  <DocRow
                    key={`${doc.uploadedAt}-${doc.name}`}
                    doc={doc}
                    index={i}
                    onDelete={confirmDelete}
                    deleting={deleteMut.isPending}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Actions */}
          <Text style={[s.sectionLabel, { marginTop: 28 }]}>ACTIONS</Text>
          <View style={s.menuGroup}>
            <MenuItem
              icon="log-out"
              label="Log out"
              onPress={handleLogout}
              loading={loggingOut}
            />
            <View style={s.separator} />
            <MenuItem
              icon="trash-2"
              label="Delete Account"
              onPress={handleDeleteAccount}
              loading={deleting}
              destructive
            />
          </View>

          <Text style={s.footerNote}>
            Deleting your account is permanent and cannot be reversed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  heroLogo: { width: 80, height: 80, marginBottom: 16 },
  heroRole: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, marginBottom: 6 },
  heroName: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 12 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  heroPillText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  content: {
    backgroundColor: '#f5f7fa',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 0.8, marginBottom: 10,
  },
  menuGroup: {
    backgroundColor: '#fff', borderRadius: 18,
    ...shadow('#000', 3, 0.05, 10, 2),
    overflow: 'hidden',
  },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 60 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 14 },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#0a0f1c', fontWeight: '600' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16, gap: 14,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  footerNote: {
    fontSize: 12, color: '#94a3b8', textAlign: 'center',
    marginTop: 20, lineHeight: 18, maxWidth: 280, alignSelf: 'center',
  },

  // Documents section
  docTypeSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  docTypeLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.6, marginBottom: 10 },
  typeRow: { gap: 8, paddingBottom: 12 },
  typePill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  typePillActive: {},
  typePillText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  typePillTextActive: { color: '#fff' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 12,
    ...shadow('#000', 4, 0.12, 8, 3),
  },
  uploadBtnOff: { opacity: 0.5 },
  uploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyDocs: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyDocsText: { fontSize: 13, color: '#94a3b8' },

  docList: { paddingHorizontal: 16, paddingBottom: 8 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  docIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 13, fontWeight: '700', color: '#0a0f1c' },
  docDate: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  docTypeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  docTypePdf: { backgroundColor: '#fee2e2' },
  docTypeImg: { backgroundColor: '#e0f2fe' },
  docTypeText: { fontSize: 10, fontWeight: '800', color: '#475569' },
  docDel: { padding: 4 },
});
