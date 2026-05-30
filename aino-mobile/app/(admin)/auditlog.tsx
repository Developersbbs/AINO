import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/api/client';
import { shadow } from '@/src/lib/shadow';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const NAVY   = '#1e3c6e';
const MAROON = '#7a2030';
const GREEN  = '#16a34a';
const GRAY   = '#64748b';
const AMBER  = '#d97706';

interface ActionMeta { label: string; color: string; icon: React.ComponentProps<typeof Feather>['name'] }

const ACTION_META: Record<string, ActionMeta> = {
  GLOBAL_RATE_CHANGE:               { label: 'Global Rate Changed',          color: NAVY,   icon: 'settings' },
  PROJECT_COMMISSION_OVERRIDE:      { label: 'Project Commission Override',  color: MAROON, icon: 'home' },
  PROJECT_BOOKING_AMOUNT_OVERRIDE:  { label: 'Booking Amount Override',      color: AMBER,  icon: 'dollar-sign' },
  PROJECT_OVERRIDE_RESET:           { label: 'Project Override Reset',       color: GRAY,   icon: 'rotate-ccw' },
  AGENT_COMMISSION_OVERRIDE:        { label: 'Agent Commission Override',    color: GREEN,  icon: 'user' },
  AGENT_OVERRIDE_RESET:             { label: 'Agent Override Reset',         color: GRAY,   icon: 'rotate-ccw' },
};

function getMeta(action: string): ActionMeta {
  return ACTION_META[action] ?? { label: action, color: GRAY, icon: 'activity' };
}

function formatTs(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function AuditEntry({ log }: Readonly<{ log: AuditLog }>) {
  const meta = getMeta(log.action);

  return (
    <View style={s.entry}>
      <View style={[s.entryDot, { backgroundColor: meta.color }]} />
      <View style={s.entryBody}>
        <View style={s.entryTopRow}>
          <View style={[s.entryIconWrap, { backgroundColor: meta.color + '14' }]}>
            <Feather name={meta.icon} size={13} color={meta.color} />
          </View>
          <Text style={s.entryTitle} numberOfLines={2}>{meta.label}</Text>
        </View>

        <Text style={s.entryActor}>
          {log.actor_name}
          {log.target_name ? <Text style={s.entryTarget}>{`  ·  ${log.target_name}`}</Text> : null}
        </Text>

        {!!(log.old_value ?? log.new_value) && (
          <View style={s.changeRow}>
            {!!log.old_value && (
              <View style={s.changePill}>
                <Text style={s.changePillText}>{log.old_value}</Text>
              </View>
            )}
            {!!(log.old_value && log.new_value) && (
              <Feather name="arrow-right" size={11} color="#94a3b8" />
            )}
            {!!log.new_value && (
              <View style={[s.changePill, { backgroundColor: meta.color + '14', borderColor: meta.color + '30' }]}>
                <Text style={[s.changePillText, { color: meta.color }]}>{log.new_value}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={s.entryTime}>{formatTs(log.created_at)}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AuditLogScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<AuditLog[]>({
    queryKey: ['admin-audit-log'],
    queryFn: async () => {
      const { data: body } = await api.get('/admin/audit-log');
      if (Array.isArray(body)) return body as AuditLog[];
      if (Array.isArray(body?.data)) return body.data as AuditLog[];
      return [] as AuditLog[];
    },
    retry: false,
  });

  const logs = data ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>Admin · System</Text>
          <Text style={s.headerTitle}>Override Audit Log</Text>
        </View>
        <View style={[s.countChip, { backgroundColor: NAVY + '12' }]}>
          <Text style={[s.countChipText, { color: NAVY }]}>
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      </View>

      {/* Immutability banner */}
      <View style={s.banner}>
        <Feather name="alert-triangle" size={14} color="#92400e" />
        <Text style={s.bannerText}>
          This log records all manual overrides. All entries are{' '}
          <Text style={s.bannerBold}>immutable</Text> and cannot be deleted.
        </Text>
      </View>

      {isLoading && (
        <View style={s.center}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      )}
      {!isLoading && isError && (
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.centerText}>Could not load audit log</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="clipboard" size={48} color="#cbd5e1" />
              <Text style={s.emptyTitle}>No overrides yet</Text>
              <Text style={s.emptyHint}>
                Commission and booking amount overrides will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => <AuditEntry log={item} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5',
  },
  headerSub: { fontSize: 11, fontWeight: '600', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 3 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0a0f1c' },
  countChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  countChipText: { fontSize: 12, fontWeight: '700' },

  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fffbeb', borderBottomWidth: 1, borderBottomColor: '#fde68a',
    paddingHorizontal: 18, paddingVertical: 12,
  },
  bannerText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 },
  bannerBold: { fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20 },
  retryBtn: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  list: { padding: 16, paddingBottom: 40, gap: 10 },

  entry: {
    flexDirection: 'row', gap: 0,
    backgroundColor: '#fff', borderRadius: 18,
    overflow: 'hidden',
    ...shadow('#000', 3, 0.05, 10, 2),
  },
  entryDot: { width: 4, alignSelf: 'stretch' },
  entryBody: { flex: 1, padding: 14, gap: 6 },

  entryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryIconWrap: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  entryTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0a0f1c' },

  entryActor: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  entryTarget: { fontWeight: '400', color: '#94a3b8' },

  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  changePill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  changePillText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  entryTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0a0f1c', marginTop: 16, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 260 },
});
