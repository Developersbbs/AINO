import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitCsvRow {
  unit_number: string; sq_ft: number; price: number;
  facing?: string; road_width?: number; plot_type?: string;
  booking_amount?: number; commission_percentage?: number;
}

interface ParsedUnitRow {
  row: number; data: UnitCsvRow; valid: boolean; errors: string[];
}

interface CreateResult {
  created: number; failed: number;
  failures: { index: number; unit: string; error: string }[];
}

type Step = 'upload' | 'preview' | 'creating' | 'done';

const GREEN = '#1e3c6e';
const RED   = '#ef4444';

// ─── Demo CSV ─────────────────────────────────────────────────────────────────

const DEMO_CSV = `Plot Number,Size (sqft),Price,Facing,Road Width,Plot Type,Booking Amount,Commission %,Corner Plot,Registration Ready,Water,Electricity,Drainage,Street Lights,Compound Wall,Park,Security
A-101,1200,3600000,East,30,Residential,100000,2,No,Yes,Yes,Yes,Yes,Yes,Yes,No,Yes
A-102,1500,4500000,North,30,Residential,150000,2,Yes,Yes,Yes,Yes,Yes,Yes,Yes,Yes,Yes
B-201,900,2700000,West,20,Residential,90000,2,No,No,Yes,Yes,No,Yes,Yes,No,Yes
`;

// ─── Row preview card ─────────────────────────────────────────────────────────

function UnitRowCard({ row }: Readonly<{ row: ParsedUnitRow }>) {
  const accent = row.valid ? GREEN : RED;
  return (
    <View style={[rc.card, { borderLeftColor: accent }]}>
      <View style={rc.top}>
        <View style={[rc.badge, { backgroundColor: accent + '18' }]}>
          <Feather name={row.valid ? 'check' : 'x'} size={12} color={accent} />
          <Text style={[rc.badgeText, { color: accent }]}>Row {row.row}</Text>
        </View>
        {row.valid && <Text style={rc.meta}>#{row.data.unit_number}</Text>}
      </View>
      {row.valid ? (
        <View style={rc.detailRow}>
          <Text style={rc.name}>{row.data.sq_ft.toLocaleString()} sqft</Text>
          <Text style={rc.price}>
            ₹{row.data.price.toLocaleString('en-IN')}
          </Text>
          {row.data.facing ? <Text style={rc.sub}>{row.data.facing}</Text> : null}
        </View>
      ) : (
        <View style={rc.errList}>
          {row.errors.map((e) => (
            <Text key={e} style={rc.errText}>• {e}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props { visible: boolean; projectId: string; projectName: string; onClose: () => void }

export default function BulkUnitsModal({ visible, projectId, projectName, onClose }: Readonly<Props>) {
  const insets      = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [step, setStep]         = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [fileUri, setFileUri]   = useState('');
  const [parsing, setParsing]   = useState(false);
  const [rows, setRows]         = useState<ParsedUnitRow[]>([]);
  const [result, setResult]     = useState<CreateResult | null>(null);
  const [downloading, setDownloading] = useState(false);

  const validRows   = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  const reset = () => {
    setStep('upload'); setFileName(''); setFileUri('');
    setRows([]); setResult(null); setParsing(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Download demo CSV ──────────────────────────────────────────────────────

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const path = `${FileSystem.cacheDirectory}plots_template.csv`;
      await FileSystem.writeAsStringAsync(path, DEMO_CSV, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Save plots_template.csv' });
      } else {
        Alert.alert('Not supported', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Error', 'Could not generate template file.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Pick + parse CSV ───────────────────────────────────────────────────────

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      setFileName(res.assets[0].name);
      setFileUri(res.assets[0].uri);
    } catch {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const parseFile = async () => {
    if (!fileUri) return;
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: fileUri, name: fileName, type: 'text/csv' } as any);
      const res = await api.post('/bulk/units/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRows(res.data.data.rows);
      setStep('preview');
    } catch (e: any) {
      Alert.alert('Parse Error', e.response?.data?.message ?? 'Could not parse the CSV file.');
    } finally {
      setParsing(false);
    }
  };

  // ── Confirm creation ───────────────────────────────────────────────────────

  const confirmCreate = async () => {
    if (validRows.length === 0) return;
    setStep('creating');
    try {
      const res = await api.post('/bulk/units/create', {
        projectId,
        rows: validRows.map((r) => r.data),
      });
      setResult(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['admin-project', projectId] });
      setStep('done');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Could not create plots.');
      setStep('preview');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={[s.headerIcon, { backgroundColor: GREEN + '14' }]}>
              <Feather name="grid" size={18} color={GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Bulk Upload Plots</Text>
              <Text style={s.subtitle} numberOfLines={1}>
                {step === 'upload'   && projectName}
                {step === 'preview'  && `${rows.length} rows · ${validRows.length} valid`}
                {step === 'creating' && 'Creating plots…'}
                {step === 'done'     && 'Upload complete'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* ── STEP: upload ── */}
          {step === 'upload' && (
            <View style={s.body}>
              {/* Template box */}
              <View style={s.templateBox}>
                <View style={s.templateHeader}>
                  <Feather name="file-text" size={13} color="#64748b" />
                  <Text style={s.templateTitle}>Required columns</Text>
                </View>
                <Text style={s.templateCols}>Plot Number, Size (sqft), Price</Text>
                <Text style={s.templateNote}>
                  Optional: Facing, Road Width, Plot Type, Booking Amount, Commission %,
                  Corner Plot, Registration Ready, Water, Electricity, Drainage,
                  Street Lights, Compound Wall, Park, Security
                </Text>
                <TouchableOpacity
                  style={[s.downloadBtn, downloading && s.btnDisabled]}
                  onPress={downloadTemplate}
                  disabled={downloading}
                  activeOpacity={0.8}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color={GREEN} />
                  ) : (
                    <>
                      <Feather name="download" size={14} color={GREEN} />
                      <Text style={s.downloadBtnText}>Download Demo CSV</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* File picker */}
              <TouchableOpacity style={s.pickBtn} onPress={pickFile} activeOpacity={0.8}>
                <Feather name="paperclip" size={16} color={GREEN} />
                <Text style={s.pickBtnText}>{fileName || 'Choose CSV file'}</Text>
                {!!fileName && <Feather name="check-circle" size={16} color={GREEN} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, (!fileUri || parsing) && s.btnDisabled]}
                onPress={parseFile}
                disabled={!fileUri || parsing}
                activeOpacity={0.85}
              >
                {parsing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="eye" size={16} color="#fff" />
                    <Text style={s.actionBtnText}>Preview Plots</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP: preview ── */}
          {step === 'preview' && (
            <>
              <View style={s.summaryRow}>
                <View style={[s.chip, { backgroundColor: GREEN + '14' }]}>
                  <Feather name="check-circle" size={12} color={GREEN} />
                  <Text style={[s.chipText, { color: GREEN }]}>{validRows.length} valid</Text>
                </View>
                {invalidRows.length > 0 && (
                  <View style={[s.chip, { backgroundColor: RED + '14' }]}>
                    <Feather name="alert-circle" size={12} color={RED} />
                    <Text style={[s.chipText, { color: RED }]}>{invalidRows.length} invalid</Text>
                  </View>
                )}
              </View>

              <ScrollView style={s.previewList} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                {rows.map((row) => <UnitRowCard key={row.row} row={row} />)}
              </ScrollView>

              <View style={s.previewActions}>
                <TouchableOpacity style={s.backBtn} onPress={() => setStep('upload')} activeOpacity={0.8}>
                  <Feather name="arrow-left" size={15} color="#64748b" />
                  <Text style={s.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, { flex: 1 }, validRows.length === 0 && s.btnDisabled]}
                  onPress={confirmCreate}
                  disabled={validRows.length === 0}
                  activeOpacity={0.85}
                >
                  <Feather name="plus-circle" size={16} color="#fff" />
                  <Text style={s.actionBtnText}>
                    Add {validRows.length} Plot{validRows.length === 1 ? '' : 's'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── STEP: creating ── */}
          {step === 'creating' && (
            <View style={s.centerBox}>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={s.creatingText}>Adding {validRows.length} plots…</Text>
            </View>
          )}

          {/* ── STEP: done ── */}
          {step === 'done' && result && (
            <View style={s.body}>
              <View style={s.resultBox}>
                <View style={[s.resultItem, { backgroundColor: GREEN + '10' }]}>
                  <Feather name="check-circle" size={28} color={GREEN} />
                  <Text style={[s.resultCount, { color: GREEN }]}>{result.created}</Text>
                  <Text style={s.resultLabel}>Added</Text>
                </View>
                {result.failed > 0 && (
                  <View style={[s.resultItem, { backgroundColor: RED + '10' }]}>
                    <Feather name="x-circle" size={28} color={RED} />
                    <Text style={[s.resultCount, { color: RED }]}>{result.failed}</Text>
                    <Text style={s.resultLabel}>Failed</Text>
                  </View>
                )}
              </View>
              {result.failures.length > 0 && (
                <ScrollView style={s.failList} contentContainerStyle={{ gap: 6 }}>
                  {result.failures.map((f) => (
                    <View key={f.unit} style={s.failItem}>
                      <Feather name="alert-circle" size={13} color={RED} />
                      <Text style={s.failText} numberOfLines={2}>
                        <Text style={{ fontWeight: '700' }}>#{f.unit}:</Text> {f.error}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity style={s.actionBtn} onPress={handleClose} activeOpacity={0.85}>
                <Text style={s.actionBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Row card styles ──────────────────────────────────────────────────────────

const rc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderWidth: 1, borderColor: '#e8edf5',
  },
  top:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  meta:      { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name:      { fontSize: 14, fontWeight: '800', color: '#0a0f1c' },
  price:     { fontSize: 13, fontWeight: '700', color: '#1e3c6e' },
  sub:       { fontSize: 11, color: '#94a3b8' },
  errList:   { gap: 2 },
  errText:   { fontSize: 12, color: '#ef4444', fontWeight: '500' },
});

// ─── Sheet styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 16, fontWeight: '800', color: '#0a0f1c' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },

  body: { padding: 20, gap: 14 },

  templateBox: {
    backgroundColor: '#f8fafc', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8,
  },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  templateTitle:  { fontSize: 12, fontWeight: '700', color: '#64748b' },
  templateCols:   { fontSize: 12, color: '#1e3c6e', fontWeight: '700' },
  templateNote:   { fontSize: 11, color: '#94a3b8', lineHeight: 17 },

  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderWidth: 1.5, borderColor: '#1e3c6e', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7, marginTop: 4,
  },
  downloadBtnText: { fontSize: 12, fontWeight: '700', color: '#1e3c6e' },

  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#1e3c6e', borderRadius: 12, borderStyle: 'dashed',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  pickBtnText: { flex: 1, fontSize: 14, color: '#1e3c6e', fontWeight: '600' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1e3c6e',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },

  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  previewList:    { maxHeight: 320, paddingHorizontal: 20 },
  previewActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },

  centerBox:    { padding: 48, alignItems: 'center', gap: 16 },
  creatingText: { fontSize: 15, color: '#64748b', fontWeight: '600' },

  resultBox:   { flexDirection: 'row', gap: 12 },
  resultItem:  { flex: 1, alignItems: 'center', borderRadius: 14, padding: 20, gap: 8 },
  resultCount: { fontSize: 36, fontWeight: '900' },
  resultLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  failList: { maxHeight: 160 },
  failItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  failText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },
});
