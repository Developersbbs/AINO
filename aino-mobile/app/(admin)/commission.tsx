import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/api/client';
import { shadow } from '@/src/lib/shadow';

const NAVY = '#1e3c6e';
const GREEN = '#16a34a';
const AMBER = '#f59e0b';

// ─── Types ────────────────────────────────────────────────────────────────────

type CommissionType = 'percentage' | 'fixed_amount';

interface ProjectItem {
  id: string;
  name: string;
  type: string;
  isPublished: boolean;
  unitCount: number;
  commissionRate: number | null;
  commissionType: CommissionType | null;
  bookingAmount: number | null;
}

interface AgentItem {
  id: string;
  name: string;
  sales: number;
  commissionRate: number | null;
  commissionType: CommissionType | null;
}

interface CommissionConfig {
  globalRate: number;
  globalType: CommissionType;
  projects: ProjectItem[];
  agents: AgentItem[];
}

// ─── Type Toggle ──────────────────────────────────────────────────────────────

function TypeToggle({
  value, onChange,
}: Readonly<{ value: CommissionType; onChange: (v: CommissionType) => void }>) {
  return (
    <View style={st.typeToggle}>
      <TouchableOpacity
        style={[st.typeBtn, value === 'percentage' && st.typeBtnActive]}
        onPress={() => onChange('percentage')}
        activeOpacity={0.8}
      >
        <Text style={[st.typeBtnText, value === 'percentage' && st.typeBtnTextActive]}>%</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[st.typeBtn, value === 'fixed_amount' && st.typeBtnActive]}
        onPress={() => onChange('fixed_amount')}
        activeOpacity={0.8}
      >
        <Text style={[st.typeBtnText, value === 'fixed_amount' && st.typeBtnTextActive]}>₹</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Rate stepper (percentage only) ──────────────────────────────────────────

function RateStepper({
  value, onChange, min = 0, max = 30, step = 0.5,
}: Readonly<{ value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }>) {
  return (
    <View style={st.stepper}>
      <TouchableOpacity
        style={[st.stepBtn, value <= min && st.stepBtnOff]}
        onPress={() => onChange(Math.max(min, Number.parseFloat((value - step).toFixed(1))))}
        disabled={value <= min}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="minus" size={14} color={value <= min ? '#cbd5e1' : NAVY} />
      </TouchableOpacity>
      <Text style={st.stepValue}>{value.toFixed(1)}%</Text>
      <TouchableOpacity
        style={[st.stepBtn, value >= max && st.stepBtnOff]}
        onPress={() => onChange(Math.min(max, Number.parseFloat((value + step).toFixed(1))))}
        disabled={value >= max}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="plus" size={14} color={value >= max ? '#cbd5e1' : NAVY} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Commission value input (adapts to type) ──────────────────────────────────

function CommissionValueInput({
  commType, rateValue, onRateChange, fixedStr, onFixedChange,
}: Readonly<{
  commType: CommissionType;
  rateValue: number;
  onRateChange: (v: number) => void;
  fixedStr: string;
  onFixedChange: (v: string) => void;
}>) {
  if (commType === 'fixed_amount') {
    return (
      <View style={st.amountInput}>
        <Text style={st.amountPrefix}>₹</Text>
        <TextInput
          style={st.amountField}
          value={fixedStr}
          onChangeText={(v) => onFixedChange(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="#94a3b8"
        />
      </View>
    );
  }
  return <RateStepper value={rateValue} onChange={onRateChange} />;
}

// ─── Agent edit modal ─────────────────────────────────────────────────────────

function AgentEditModal({
  agent, globalRate, globalType, visible, onClose, onSave, onReset, saving,
}: Readonly<{
  agent: AgentItem;
  globalRate: number;
  globalType: CommissionType;
  visible: boolean;
  onClose: () => void;
  onSave: (rate: number, type: CommissionType) => void;
  onReset: () => void;
  saving: boolean;
}>) {
  const insets = useSafeAreaInsets();
  const effectiveType = agent.commissionType ?? globalType;
  const [commType, setCommType] = useState<CommissionType>(effectiveType);
  const [rate, setRate]         = useState(agent.commissionRate ?? globalRate);
  const [fixedStr, setFixedStr] = useState(
    agent.commissionType === 'fixed_amount' && agent.commissionRate != null
      ? String(agent.commissionRate)
      : '',
  );
  const initials = agent.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const handleSave = () => {
    const finalRate = commType === 'fixed_amount' ? (Number.parseFloat(fixedStr) || 0) : rate;
    onSave(finalRate, commType);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.overlay}>
        <Pressable style={st.backdrop} onPress={onClose} />
        <View style={[st.agentSheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={st.handle} />
          <View style={st.agentSheetHeader}>
            <View style={st.agentAvatar}>
              <Text style={st.agentAvatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.agentSheetName}>{agent.name}</Text>
              <Text style={st.agentSheetSales}>{agent.sales} booking{agent.sales === 1 ? '' : 's'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={st.agentSheetLabel}>COMMISSION TYPE</Text>
          <TypeToggle value={commType} onChange={setCommType} />

          <Text style={[st.agentSheetLabel, { marginTop: 16 }]}>COMMISSION VALUE</Text>
          <View style={st.agentStepperRow}>
            <CommissionValueInput
              commType={commType}
              rateValue={rate}
              onRateChange={setRate}
              fixedStr={fixedStr}
              onFixedChange={setFixedStr}
            />
          </View>
          {agent.commissionRate === null && (
            <Text style={st.agentUsingGlobal}>
              Using global {globalType === 'fixed_amount' ? `₹${globalRate.toLocaleString('en-IN')}` : `${globalRate.toFixed(1)}%`}
            </Text>
          )}

          <View style={st.agentSheetActions}>
            {agent.commissionRate !== null && (
              <TouchableOpacity
                style={[st.resetBtn, saving && st.btnOff]}
                onPress={onReset}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={st.resetBtnText}>Reset to Global</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[st.saveBtn, { flex: 1 }, saving && st.btnOff]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={st.saveBtnText}>Save Override</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CommissionConfigScreen() {
  const qc = useQueryClient();

  const [editingAgent, setEditingAgent] = useState<AgentItem | null>(null);

  // Per-project drafts
  const [projectRates,   setProjectRates]   = useState<Record<string, number>>({});
  const [projectTypes,   setProjectTypes]   = useState<Record<string, CommissionType>>({});
  const [projectAmounts, setProjectAmounts] = useState<Record<string, string>>({});

  // Global drafts
  const [globalRateDraft, setGlobalRateDraft] = useState<number | null>(null);
  const [globalTypeDraft, setGlobalTypeDraft] = useState<CommissionType | null>(null);
  const [globalFixedStr,  setGlobalFixedStr]  = useState('');

  const { data, isLoading, isError, error: queryError, refetch } = useQuery<CommissionConfig>({
    queryKey: ['commission-config'],
    queryFn: async () => {
      const { data: body } = await api.get('/admin/commission-config');
      const config = body?.data ?? body;
      if (!config || typeof config.globalRate !== 'number') throw new Error(`invalid response: ${JSON.stringify(body)}`);
      return config as CommissionConfig;
    },
    retry: false,
  });

  const globalRate = globalRateDraft ?? data?.globalRate ?? 3;
  const globalType = globalTypeDraft ?? data?.globalType ?? 'percentage';

  const getProjectType   = (p: ProjectItem): CommissionType => projectTypes[p.id] ?? p.commissionType ?? globalType;
  const getProjectRate   = (p: ProjectItem) => projectRates[p.id] ?? p.commissionRate ?? globalRate;
  const getProjectAmount = (p: ProjectItem) =>
    projectAmounts[p.id] ?? (p.bookingAmount == null ? '' : p.bookingAmount.toString());

  // ── Mutations ────────────────────────────────────────────────────────────────

  const globalMut = useMutation({
    mutationFn: ({ rate, type }: { rate: number; type: CommissionType }) =>
      api.patch('/admin/commission-config/global', { rate, type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-config'] });
      setGlobalRateDraft(null);
      setGlobalTypeDraft(null);
      setGlobalFixedStr('');
    },
    onError: () => Alert.alert('Error', 'Could not update global rate.'),
  });

  const projectMut = useMutation({
    mutationFn: ({ id, commissionRate, commissionType, bookingAmount }: {
      id: string; commissionRate: number; commissionType: CommissionType; bookingAmount?: number;
    }) => api.patch(`/admin/commission-config/projects/${id}`, { commissionRate, commissionType, bookingAmount }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['commission-config'] });
      const nr = { ...projectRates }; delete nr[vars.id]; setProjectRates(nr);
      const nt = { ...projectTypes }; delete nt[vars.id]; setProjectTypes(nt);
      const na = { ...projectAmounts }; delete na[vars.id]; setProjectAmounts(na);
    },
    onError: () => Alert.alert('Error', 'Could not save project override.'),
  });

  const projectResetMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/commission-config/projects/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['commission-config'] });
      const nr = { ...projectRates }; delete nr[id]; setProjectRates(nr);
      const nt = { ...projectTypes }; delete nt[id]; setProjectTypes(nt);
    },
    onError: () => Alert.alert('Error', 'Could not reset project override.'),
  });

  const agentMut = useMutation({
    mutationFn: ({ id, commissionRate, commissionType }: { id: string; commissionRate: number; commissionType: CommissionType }) =>
      api.patch(`/admin/commission-config/agents/${id}`, { commissionRate, commissionType }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commission-config'] }); setEditingAgent(null); },
    onError: () => Alert.alert('Error', 'Could not save agent override.'),
  });

  const agentResetMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/commission-config/agents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commission-config'] }); setEditingAgent(null); },
    onError: () => Alert.alert('Error', 'Could not reset agent override.'),
  });

  const handleSaveGlobal = () => {
    const rate = globalType === 'fixed_amount'
      ? (Number.parseFloat(globalFixedStr) || 0)
      : globalRate;
    globalMut.mutate({ rate, type: globalType });
  };

  const isGlobalDirty = globalRateDraft !== null || globalTypeDraft !== null || globalFixedStr !== '';

  // ── Loading / Error states ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <View style={st.center}><ActivityIndicator color={NAVY} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <View style={st.center}>
          <Feather name="alert-circle" size={40} color="#cbd5e1" />
          <Text style={st.errorText}>Failed to load commission config</Text>
          {queryError instanceof Error && (
            <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginHorizontal: 24 }}>
              {queryError.message}
            </Text>
          )}
          <TouchableOpacity style={st.retryBtn} onPress={() => refetch()}>
            <Text style={st.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={st.headerSmall}>Admin · Platform Settings</Text>
          <Text style={st.headerTitle}>Commission Config</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Global Default ── */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Global Default</Text>
          <Text style={st.cardSub}>Applied to all projects · Overridable per project / agent</Text>

          {/* Type toggle */}
          <View style={st.fieldRow}>
            <Text style={st.fieldLabel}>Commission Type</Text>
            <TypeToggle value={globalType} onChange={(v) => { setGlobalTypeDraft(v); setGlobalFixedStr(''); }} />
          </View>

          {/* Value */}
          <View style={st.globalRow}>
            {globalType === 'fixed_amount' ? (
              <View style={st.amountInput}>
                <Text style={st.amountPrefix}>₹</Text>
                <TextInput
                  style={st.amountField}
                  value={globalFixedStr !== '' ? globalFixedStr : String(data.globalRate)}
                  onChangeText={(v) => setGlobalFixedStr(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            ) : (
              <RateStepper value={globalRate} onChange={setGlobalRateDraft} />
            )}
            {isGlobalDirty && (
              <TouchableOpacity
                style={[st.saveSmallBtn, globalMut.isPending && st.btnOff]}
                onPress={handleSaveGlobal}
                disabled={globalMut.isPending}
              >
                {globalMut.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={st.saveSmallBtnText}>Save</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Per Project Override ── */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Per Project Override</Text>
        </View>

        {data.projects.length === 0 ? (
          <View style={st.emptyCard}>
            <Feather name="home" size={28} color="#cbd5e1" />
            <Text style={st.emptyText}>No projects yet</Text>
          </View>
        ) : (
          data.projects.map((project) => {
            const projType   = getProjectType(project);
            const rate       = getProjectRate(project);
            const amtStr     = getProjectAmount(project);
            const isDirty    = projectRates[project.id] !== undefined
              || projectTypes[project.id] !== undefined
              || projectAmounts[project.id] !== undefined;
            const hasOverride = project.commissionRate !== null || project.bookingAmount !== null;
            const projFixedStr = (() => {
              if (projType === 'fixed_amount') {
                const override = projectAmounts[project.id];
                return override ?? (project.commissionRate == null ? '' : String(project.commissionRate));
              }
              return '';
            })();

            return (
              <View key={project.id} style={st.card}>
                {/* Project header */}
                <View style={st.projectHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.projectName}>{project.name}</Text>
                    <Text style={st.projectMeta}>
                      {project.type} · {project.unitCount} unit{project.unitCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <View style={[st.statusBadge, project.isPublished ? st.statusActive : st.statusDraft]}>
                    <Text style={[st.statusText, project.isPublished ? st.statusTextActive : st.statusTextDraft]}>
                      {project.isPublished ? 'Active' : 'Draft'}
                    </Text>
                  </View>
                </View>

                {/* Commission Type */}
                <View style={st.fieldRow}>
                  <Text style={st.fieldLabel}>Commission Type</Text>
                  <TypeToggle
                    value={projType}
                    onChange={(v) => setProjectTypes((prev) => ({ ...prev, [project.id]: v }))}
                  />
                </View>

                {/* Commission Value */}
                <View style={st.fieldRow}>
                  <Text style={st.fieldLabel}>Commission Value</Text>
                  <CommissionValueInput
                    commType={projType}
                    rateValue={rate}
                    onRateChange={(v) => setProjectRates((prev) => ({ ...prev, [project.id]: v }))}
                    fixedStr={projFixedStr}
                    onFixedChange={(v) => setProjectAmounts((prev) => ({ ...prev, [project.id]: v }))}
                  />
                </View>

                {/* Booking Amount */}
                <View style={st.fieldRow}>
                  <Text style={st.fieldLabel}>Booking Amount (Fixed)</Text>
                  <View style={st.amountInput}>
                    <Text style={st.amountPrefix}>₹</Text>
                    <TextInput
                      style={st.amountField}
                      value={amtStr}
                      onChangeText={(v) => setProjectAmounts((prev) => ({ ...prev, [project.id]: v.replace(/\D/g, '') }))}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Actions */}
                <View style={st.projectActions}>
                  {hasOverride && (
                    <TouchableOpacity
                      style={[st.resetBtn, projectResetMut.isPending && st.btnOff]}
                      onPress={() => {
                        Alert.alert('Reset Override', `Reset ${project.name} to global settings?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Reset', style: 'destructive', onPress: () => projectResetMut.mutate(project.id) },
                        ]);
                      }}
                      disabled={projectResetMut.isPending}
                    >
                      <Text style={st.resetBtnText}>Reset to Global</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[st.saveBtn, { flex: 1 }, (!isDirty || projectMut.isPending) && st.btnOff]}
                    onPress={() => {
                      const commissionRate = projType === 'fixed_amount'
                        ? (Number.parseFloat(projectAmounts[project.id] ?? String(project.commissionRate ?? 0)) || 0)
                        : rate;
                      const amt = amtStr ? Number.parseFloat(amtStr) : undefined;
                      projectMut.mutate({ id: project.id, commissionRate, commissionType: projType, bookingAmount: amt });
                    }}
                    disabled={!isDirty || projectMut.isPending}
                  >
                    {projectMut.isPending && projectMut.variables?.id === project.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={st.saveBtnText}>Save Override</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* ── Per Agent Override ── */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Per Agent Override</Text>
        </View>

        {data.agents.length === 0 ? (
          <View style={st.emptyCard}>
            <Feather name="users" size={28} color="#cbd5e1" />
            <Text style={st.emptyText}>No approved agents yet</Text>
          </View>
        ) : (
          <View style={st.card}>
            {data.agents.map((agent, i) => {
              const effectiveRate = agent.commissionRate ?? globalRate;
              const effectiveType = agent.commissionType ?? globalType;
              const initials = agent.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
              const displayRate = effectiveType === 'fixed_amount'
                ? `₹${effectiveRate.toLocaleString('en-IN')}`
                : `${effectiveRate.toFixed(1)}%`;
              return (
                <View key={agent.id}>
                  {i > 0 && <View style={st.agentDivider} />}
                  <View style={st.agentRow}>
                    <View style={st.agentAvatarSm}>
                      <Text style={st.agentAvatarSmText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.agentName}>{agent.name}</Text>
                      <Text style={st.agentSales}>{agent.sales} sale{agent.sales === 1 ? '' : 's'}</Text>
                    </View>
                    <View style={st.agentRateWrap}>
                      <Text style={agent.commissionRate === null ? st.agentRate : [st.agentRate, st.agentRateOverride]}>
                        {displayRate}
                      </Text>
                      {agent.commissionRate === null ? null : <View style={st.overrideDot} />}
                    </View>
                    <TouchableOpacity
                      style={st.editBtn}
                      onPress={() => setEditingAgent(agent)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={st.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Agent edit modal */}
      {editingAgent && (
        <AgentEditModal
          agent={editingAgent}
          globalRate={globalRate}
          globalType={globalType}
          visible
          onClose={() => setEditingAgent(null)}
          onSave={(rate, type) => agentMut.mutate({ id: editingAgent.id, commissionRate: rate, commissionType: type })}
          onReset={() => agentResetMut.mutate(editingAgent.id)}
          saving={agentMut.isPending || agentResetMut.isPending}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 15, color: '#64748b', marginTop: 4 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: NAVY },
  retryText: { color: '#fff', fontWeight: '700' },

  header: {
    backgroundColor: NAVY,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSmall: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },

  scroll: { padding: 16, paddingBottom: 48 },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    marginBottom: 14,
    ...shadow('#000', 4, 0.06, 12, 3),
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0a0f1c', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#64748b', lineHeight: 18, marginBottom: 16 },

  sectionHeader: { marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.6 },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 32,
    alignItems: 'center', gap: 8, marginBottom: 14,
  },
  emptyText: { fontSize: 14, color: '#94a3b8' },

  // Type toggle
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9', borderRadius: 10, overflow: 'hidden',
  },
  typeBtn: {
    paddingHorizontal: 20, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  typeBtnActive: { backgroundColor: NAVY },
  typeBtnText: { fontSize: 15, fontWeight: '800', color: '#94a3b8' },
  typeBtnTextActive: { color: '#fff' },

  // Global rate row
  globalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Stepper
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12, overflow: 'hidden',
  },
  stepBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e8edf5',
  },
  stepBtnOff: { opacity: 0.4 },
  stepValue: {
    minWidth: 60, textAlign: 'center',
    fontSize: 17, fontWeight: '800', color: NAVY,
  },

  // Save small
  saveSmallBtn: {
    backgroundColor: NAVY, borderRadius: 10,
    paddingHorizontal: 18, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  saveSmallBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Project card
  projectHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  projectName: { fontSize: 15, fontWeight: '800', color: '#0a0f1c', marginBottom: 2 },
  projectMeta: { fontSize: 12, color: '#64748b' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusDraft: { backgroundColor: '#fef9c3' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: GREEN },
  statusTextDraft: { color: AMBER },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', flex: 1 },

  amountInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 10, height: 40, minWidth: 120,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  amountPrefix: { fontSize: 15, fontWeight: '700', color: '#64748b', marginRight: 4 },
  amountField: { fontSize: 15, fontWeight: '700', color: '#0a0f1c', flex: 1, padding: 0 },

  projectActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  resetBtn: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, height: 42, alignItems: 'center', justifyContent: 'center',
  },
  resetBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  saveBtn: {
    backgroundColor: NAVY, borderRadius: 10,
    height: 42, alignItems: 'center', justifyContent: 'center',
    ...shadow(NAVY, 4, 0.2, 8, 3),
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnOff: { opacity: 0.45 },

  // Agent row
  agentDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 2 },
  agentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  agentAvatarSm: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: NAVY + '14', alignItems: 'center', justifyContent: 'center',
  },
  agentAvatarSmText: { fontSize: 13, fontWeight: '800', color: NAVY },
  agentName: { fontSize: 14, fontWeight: '700', color: '#0a0f1c' },
  agentSales: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  agentRateWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agentRate: { fontSize: 15, fontWeight: '800', color: '#64748b' },
  agentRateOverride: { color: NAVY },
  overrideDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  editBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: NAVY + '30',
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: NAVY },

  // Agent modal
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  agentSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 24,
  },
  agentSheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  agentAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: NAVY + '14', alignItems: 'center', justifyContent: 'center',
  },
  agentAvatarText: { fontSize: 18, fontWeight: '900', color: NAVY },
  agentSheetName: { fontSize: 17, fontWeight: '800', color: '#0a0f1c' },
  agentSheetSales: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  agentSheetLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.7, marginBottom: 12 },
  agentStepperRow: { alignItems: 'center', marginBottom: 8 },
  agentUsingGlobal: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  agentSheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
