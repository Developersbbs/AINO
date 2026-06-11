import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AmenityDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  isBuiltIn: boolean;
}

// ─── Picker options ───────────────────────────────────────────────────────────

const ICON_OPTIONS: React.ComponentProps<typeof Feather>['name'][] = [
  'droplet', 'zap', 'wind', 'sun', 'square', 'triangle', 'home', 'shield',
  'star', 'heart', 'coffee', 'wifi', 'camera', 'music', 'gift', 'flag',
  'anchor', 'compass', 'truck', 'umbrella', 'layers', 'activity', 'award',
  'map', 'phone', 'clock', 'users', 'trending-up',
];

const COLOR_OPTIONS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#10b981', '#64748b',
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ManageAmenitiesModal({ visible, onClose }: Readonly<Props>) {
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();

  const [showAdd, setShowAdd]   = useState(false);
  const [label, setLabel]       = useState('');
  const [icon, setIcon]         = useState<React.ComponentProps<typeof Feather>['name']>('star');
  const [color, setColor]       = useState(COLOR_OPTIONS[0]);

  const { data: amenities = [], isLoading } = useQuery<AmenityDef[]>({
    queryKey: ['admin-amenities'],
    queryFn: () => api.get('/admin/amenities').then((r) => r.data.data),
    enabled: visible,
  });

  const addMut = useMutation({
    mutationFn: () => api.post('/admin/amenities', { label: label.trim(), icon, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-amenities'] });
      setLabel(''); setIcon('star'); setColor(COLOR_OPTIONS[0]); setShowAdd(false);
    },
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message ?? 'Could not add amenity.'),
  });

  const delMut = useMutation({
    mutationFn: (key: string) => api.delete(`/admin/amenities/${key}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-amenities'] }),
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message ?? 'Could not remove amenity.'),
  });

  const handleClose = () => { setShowAdd(false); setLabel(''); onClose(); };

  const handleAdd = () => {
    if (!label.trim()) return Alert.alert('Required', 'Enter an amenity name.');
    addMut.mutate();
  };

  const confirmDelete = (item: AmenityDef) => {
    Alert.alert('Remove Amenity', `Remove "${item.label}" from all projects?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => delMut.mutate(item.key) },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={m.overlay}>
        <Pressable style={m.backdrop} onPress={handleClose} />
        <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={m.handle} />

          {/* Header */}
          <View style={m.header}>
            <View>
              <Text style={m.title}>Manage Amenities</Text>
              <Text style={m.sub}>{amenities.length} total · {amenities.filter((a) => !a.isBuiltIn).length} custom</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* List */}
          {isLoading ? (
            <ActivityIndicator color="#1e3c6e" style={{ marginVertical: 32 }} />
          ) : (
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {amenities.map((item, i) => (
                <View key={item.key} style={[m.row, i > 0 && m.rowBorder]}>
                  <View style={[m.iconWrap, { backgroundColor: item.color + '18' }]}>
                    <Feather name={item.icon as React.ComponentProps<typeof Feather>['name']} size={18} color={item.color} />
                  </View>
                  <Text style={m.rowLabel} numberOfLines={1}>{item.label}</Text>
                  {item.isBuiltIn ? (
                    <View style={m.builtInBadge}>
                      <Text style={m.builtInText}>Built-in</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={m.deleteBtn}
                      onPress={() => confirmDelete(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={delMut.isPending}
                    >
                      <Feather name="trash-2" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Add section */}
          {showAdd ? (
            <View style={m.addForm}>
              <TextInput
                style={m.input}
                placeholder="Amenity name (e.g. Swimming Pool)"
                placeholderTextColor="#94a3b8"
                value={label}
                onChangeText={setLabel}
                autoFocus
              />

              {/* Icon picker */}
              <Text style={m.pickerLabel}>ICON</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={m.iconRow}>
                  {ICON_OPTIONS.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      style={[m.iconOpt, icon === ic && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setIcon(ic)}
                      activeOpacity={0.8}
                    >
                      <Feather name={ic} size={18} color={icon === ic ? '#fff' : '#64748b'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Color picker */}
              <Text style={m.pickerLabel}>COLOR</Text>
              <View style={m.colorRow}>
                {COLOR_OPTIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[m.colorOpt, { backgroundColor: c }, color === c && m.colorOptSelected]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.8}
                  >
                    {color === c && <Feather name="check" size={13} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview + save */}
              <View style={m.addActions}>
                <View style={[m.previewChip, { backgroundColor: color + '18', borderColor: color + '44' }]}>
                  <Feather name={icon} size={14} color={color} />
                  <Text style={[m.previewLabel, { color }]}>{label || 'Preview'}</Text>
                </View>
                <TouchableOpacity
                  style={[m.cancelBtn]}
                  onPress={() => { setShowAdd(false); setLabel(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={m.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[m.saveBtn, addMut.isPending && { opacity: 0.5 }]}
                  onPress={handleAdd}
                  disabled={addMut.isPending}
                  activeOpacity={0.85}
                >
                  {addMut.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={m.saveBtnText}>Add</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={m.addTrigger} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
              <Feather name="plus" size={16} color="#1e3c6e" />
              <Text style={m.addTriggerText}>Add Custom Amenity</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  title:  { fontSize: 18, fontWeight: '800', color: '#0a0f1c' },
  sub:    { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  iconWrap:  { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel:  { flex: 1, fontSize: 14, fontWeight: '600', color: '#0a0f1c' },
  builtInBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  builtInText:  { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  deleteBtn: { padding: 4 },

  addTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#eff6ff', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#bfdbfe', borderStyle: 'dashed',
  },
  addTriggerText: { fontSize: 14, fontWeight: '700', color: '#1e3c6e' },

  addForm:    { marginTop: 16, gap: 0 },
  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    fontWeight: '600', color: '#0a0f1c', marginBottom: 14,
  },
  pickerLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.7, marginBottom: 8 },

  iconRow: { flexDirection: 'row', gap: 8 },
  iconOpt: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: 'transparent',
  },

  colorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  colorOpt: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorOptSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },

  addActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  previewChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    flex: 1,
  },
  previewLabel: { fontSize: 12, fontWeight: '700', flex: 1 },
  cancelBtn: {
    paddingHorizontal: 14, height: 42, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  saveBtn: {
    backgroundColor: '#1e3c6e', borderRadius: 10,
    paddingHorizontal: 18, height: 42,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
