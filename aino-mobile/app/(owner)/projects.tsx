import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitSummary { total: number; available: number; booked: number; sold: number }

interface Project {
  id: string;
  project_name: string;
  project_type: string;
  location: string;
  rera_number: string | null;
  is_published: boolean;
  created_at: string;
  unitSummary: UnitSummary;
}

type UnitStatus = 'Available' | 'Booked' | 'Sold';

interface Unit {
  id: string;
  unit_number: string;
  sq_ft: number;
  price: number;
  facing: string | null;
  road_width: number | null;
  status: UnitStatus;
  attributes: Record<string, unknown> | null;
}

interface ConfigAttr {
  description?: string;
  approvalType?: string;
  approvalAuthority?: string;
  approvalNumber?: string;
  block?: string;
}

interface ProjectDoc {
  name: string;
  url: string;
  type: 'pdf' | 'image';
  uploadedAt: string;
}

interface ProjectDetail extends Project {
  units: Unit[];
  config_attributes: ConfigAttr | null;
  documents: ProjectDoc[] | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = '#1A2744';
const GOLD = '#C9A84C';

const STATUS_COLOR: Record<UnitStatus, string> = {
  Available: '#16a34a',
  Booked: '#f59e0b',
  Sold: '#94a3b8',
};

const STATUS_BG: Record<UnitStatus, string> = {
  Available: '#f0fdf4',
  Booked: '#fffbeb',
  Sold: '#f8fafc',
};

const AMENITY_MAP: Record<string, { label: string; icon: React.ComponentProps<typeof Feather>['name']; color: string }> = {
  water:         { label: 'Water Supply',          icon: 'droplet',        color: '#3b82f6' },
  electricity:   { label: 'Electricity',           icon: 'zap',            color: '#f59e0b' },
  drainage:      { label: 'Underground Drainage',  icon: 'cloud-drizzle',  color: '#f97316' },
  streetLights:  { label: 'Street Lights',         icon: 'sun',            color: '#eab308' },
  compoundWall:  { label: 'Compound Wall',         icon: 'square',         color: '#6366f1' },
  park:          { label: 'Park Area',             icon: 'feather',        color: '#22c55e' },
  clubhouse:     { label: 'Clubhouse',             icon: 'home',           color: '#8b5cf6' },
  security:      { label: '24/7 Security',         icon: 'shield',         color: '#ef4444' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function deriveAmenities(units: Unit[]) {
  const present = new Set<string>();
  for (const u of units) {
    if (!u.attributes) continue;
    for (const key of Object.keys(AMENITY_MAP)) {
      if (u.attributes[key]) present.add(key);
    }
  }
  if (units.some((u) => (u.road_width ?? 0) >= 30)) present.add('road30');
  return [...present]
    .filter((k) => AMENITY_MAP[k])
    .map((k) => ({ key: k, ...AMENITY_MAP[k] }));
}

function deriveStats(units: Unit[]) {
  const total = units.length;
  const available = units.filter((u) => u.status === 'Available').length;
  const booked    = units.filter((u) => u.status === 'Booked').length;
  const sold      = units.filter((u) => u.status === 'Sold').length;
  const totalPrice = units.reduce((s, u) => s + u.price, 0);
  const totalSqft  = units.reduce((s, u) => s + u.sq_ft, 0);
  const perSqft = totalSqft > 0 ? Math.round(totalPrice / totalSqft) : 0;
  return { total, available, booked, sold, perSqft };
}

function deriveTags(project: ProjectDetail): string[] {
  const tags: string[] = [project.project_type];
  const facingCount: Record<string, number> = {};
  for (const u of project.units) {
    if (u.facing) facingCount[u.facing] = (facingCount[u.facing] ?? 0) + 1;
  }
  const topFacing = Object.entries(facingCount).sort((a, b) => b[1] - a[1])[0];
  if (topFacing) tags.push(`${topFacing[0]} Facing`);
  const hasGated = project.units.some((u) => u.attributes?.security || u.attributes?.compoundWall);
  if (hasGated) tags.push('Gated Community');
  return tags;
}

function getApprovalLabel(cfg: ConfigAttr | null): string | null {
  if (!cfg) return null;
  const type = cfg.approvalType ?? cfg.approvalAuthority;
  if (!type) return null;
  return `${type.toUpperCase()} APPROVED`;
}

// ─── Small components ─────────────────────────────────────────────────────────

function UnitBar({ summary }: Readonly<{ summary: UnitSummary }>) {
  const { total, available, booked, sold } = summary;
  if (total === 0) return null;
  return (
    <View style={b.track}>
      {available > 0 && <View style={[b.seg, { flex: available, backgroundColor: STATUS_COLOR.Available }]} />}
      {booked > 0   && <View style={[b.seg, { flex: booked,   backgroundColor: STATUS_COLOR.Booked }]} />}
      {sold > 0     && <View style={[b.seg, { flex: sold,     backgroundColor: STATUS_COLOR.Sold }]} />}
    </View>
  );
}
const b = StyleSheet.create({
  track: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  seg: { height: '100%' },
});

function StatItem({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <View style={s.statItem}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OwnerProjects() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView]             = useState<'list' | 'detail'>('list');

  const projectsQuery = useQuery<Project[]>({
    queryKey: ['owner-projects'],
    queryFn: () => api.get('/owner/projects').then((r) => r.data.data),
  });

  const detailQuery = useQuery<ProjectDetail>({
    queryKey: ['owner-project', selectedId],
    queryFn: () => api.get(`/owner/projects/${selectedId}`).then((r) => r.data.data),
    enabled: view === 'detail' && !!selectedId,
  });

  const openDetail = (id: string) => { setSelectedId(id); setView('detail'); };

  // ── Detail View ──────────────────────────────────────────────────────────────

  if (view === 'detail') {
    const project  = detailQuery.data;
    const units    = project?.units ?? [];
    const stats    = deriveStats(units);
    const amenities = project ? deriveAmenities(units) : [];
    const tags      = project ? deriveTags(project) : [];
    const cfg       = project?.config_attributes ?? null;
    const approval  = getApprovalLabel(cfg);
    const docs      = project?.documents ?? [];

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Back header */}
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => setView('list')} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color="#0a0f1c" />
          </TouchableOpacity>
          <Text style={s.pageTitle} numberOfLines={1}>
            {detailQuery.isLoading ? 'Loading…' : (project?.project_name ?? 'Project')}
          </Text>
        </View>

        {detailQuery.isLoading && (
          <View style={s.center}><ActivityIndicator size="large" color={NAVY} /></View>
        )}
        {detailQuery.isError && (
          <View style={s.center}>
            <Feather name="alert-circle" size={32} color="#cbd5e1" />
            <Text style={s.centerText}>Could not load project</Text>
          </View>
        )}

        {project && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

            {/* ── Hero ── */}
            <View style={s.hero}>
              {!!approval && (
                <View style={s.approvalBadge}>
                  <Text style={s.approvalBadgeText}>{approval}</Text>
                </View>
              )}
              <Text style={s.heroName}>{project.project_name}</Text>
              <View style={s.heroMetaRow}>
                <Feather name="map-pin" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.heroMetaText}>{project.location}</Text>
              </View>
              {!!project.rera_number && (
                <View style={s.heroMetaRow}>
                  <Feather name="shield" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.heroMetaText}>RERA: {project.rera_number}</Text>
                </View>
              )}
              <View style={s.tagsRow}>
                {tags.map((tag) => (
                  <View key={tag} style={s.tag}>
                    <Text style={s.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Stats ── */}
            <View style={s.statsRow}>
              <StatItem value={String(stats.total)}     label="Total Plots" />
              <View style={s.statDivider} />
              <StatItem value={String(stats.available)} label="Available" />
              <View style={s.statDivider} />
              <StatItem
                value={stats.perSqft > 0 ? `₹${stats.perSqft.toLocaleString('en-IN')}` : '—'}
                label="Per sqft"
              />
            </View>

            {/* ── About ── */}
            {!!cfg?.description && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>About This Project</Text>
                <Text style={s.aboutText}>{cfg.description}</Text>
              </View>
            )}

            {/* ── Amenities ── */}
            {amenities.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Amenities</Text>
                <View style={s.amenityGrid}>
                  {amenities.map((a) => (
                    <View key={a.key} style={s.amenityCard}>
                      <View style={[s.amenityIcon, { backgroundColor: a.color + '1a' }]}>
                        <Feather name={a.icon} size={22} color={a.color} />
                      </View>
                      <Text style={s.amenityLabel}>{a.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── Documents ── */}
            {docs.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Project Documents</Text>
                {docs.map((doc) => (
                  <View key={doc.name} style={s.docRow}>
                    <View style={[s.docIcon, doc.type === 'pdf' ? s.docPdf : s.docImg]}>
                      <Feather
                        name={doc.type === 'pdf' ? 'file-text' : 'image'}
                        size={18}
                        color={doc.type === 'pdf' ? '#ef4444' : '#3b82f6'}
                      />
                    </View>
                    <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
                    <Text style={s.docView}>View</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Units ── */}
            <View style={s.section}>
              <View style={s.unitsSectionHeader}>
                <Text style={s.sectionTitle}>Plots ({units.length})</Text>
                <View style={s.unitsLegend}>
                  {([
                    { label: 'Avail', count: stats.available, color: STATUS_COLOR.Available },
                    { label: 'Booked', count: stats.booked, color: STATUS_COLOR.Booked },
                    { label: 'Sold', count: stats.sold, color: '#94a3b8' },
                  ] as const).map(({ label, count, color }) => (
                    <View key={label} style={s.legendItem}>
                      <View style={[s.dot, { backgroundColor: color }]} />
                      <Text style={[s.legendText, { color }]}>{count} {label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {units.length === 0 ? (
                <View style={s.emptyUnits}>
                  <Text style={s.emptyUnitsText}>No plots added yet</Text>
                </View>
              ) : (
                <View style={s.unitGrid}>
                  {units.map((unit) => (
                    <View
                      key={unit.id}
                      style={[s.unitCard, { borderColor: STATUS_COLOR[unit.status], backgroundColor: STATUS_BG[unit.status] }]}
                    >
                      <View style={s.unitTop}>
                        <Text style={s.unitNumber}>#{unit.unit_number}</Text>
                        <View style={[s.dot, { backgroundColor: STATUS_COLOR[unit.status] }]} />
                      </View>
                      <Text style={s.unitPrice}>{formatINR(unit.price)}</Text>
                      <Text style={s.unitSqft}>{unit.sq_ft.toLocaleString()} sqft</Text>
                      {!!unit.facing && <Text style={s.unitFacing}>{unit.facing}</Text>}
                      <View style={[s.statusPill, { backgroundColor: STATUS_COLOR[unit.status] + '22' }]}>
                        <Text style={[s.statusPillText, { color: STATUS_COLOR[unit.status] }]}>{unit.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ── List View ────────────────────────────────────────────────────────────────

  const projects = projectsQuery.data ?? [];

  if (projectsQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={NAVY} /></View>
      </SafeAreaView>
    );
  }

  if (projectsQuery.isError) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.centerText}>Could not load projects</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => projectsQuery.refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.listHeader}>
        <Text style={s.listHeaderTitle}>My Projects</Text>
        <Text style={s.listHeaderSub}>{projects.length} assigned</Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.list}
        onRefresh={() => projectsQuery.refetch()}
        refreshing={projectsQuery.isFetching}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Feather name="folder" size={48} color="#cbd5e1" />
            <Text style={s.emptyTitle}>No projects yet</Text>
            <Text style={s.emptyHint}>Projects assigned to you will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => openDetail(item.id)} activeOpacity={0.8}>
            <View style={s.cardRow}>
              <View style={s.cardLeft}>
                <Text style={s.cardType}>{item.project_type.toUpperCase()}</Text>
                <Text style={s.cardName}>{item.project_name}</Text>
                <View style={s.locationRow}>
                  <Feather name="map-pin" size={12} color="#94a3b8" />
                  <Text style={s.cardLocation}>{item.location}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </View>
            <View style={s.summaryRow}>
              {([
                { label: 'Avail',  count: item.unitSummary.available, color: STATUS_COLOR.Available },
                { label: 'Booked', count: item.unitSummary.booked,    color: STATUS_COLOR.Booked },
                { label: 'Sold',   count: item.unitSummary.sold,      color: STATUS_COLOR.Sold },
              ] as const).map(({ label, count, color }) => (
                <View key={label} style={[s.summaryChip, { backgroundColor: color + '14' }]}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={[s.summaryText, { color }]}>{count} {label}</Text>
                </View>
              ))}
            </View>
            <UnitBar summary={item.unitSummary} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#f5f7fa' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerText:  { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20, textAlign: 'center' },
  retryBtn:    { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: NAVY },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  // List
  listHeader: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5',
  },
  listHeaderTitle: { fontSize: 22, fontWeight: '900', color: '#0a0f1c' },
  listHeaderSub:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  list:     { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardLeft:     { flex: 1 },
  cardType:     { fontSize: 10, fontWeight: '700', color: NAVY, letterSpacing: 0.8, marginBottom: 4 },
  cardName:     { fontSize: 17, fontWeight: '800', color: '#0a0f1c', marginBottom: 6 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLocation: { fontSize: 12, color: '#94a3b8' },
  summaryRow:   { flexDirection: 'row', gap: 8, marginBottom: 4 },
  summaryChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  summaryText:  { fontSize: 11, fontWeight: '700' },
  dot:          { width: 7, height: 7, borderRadius: 3.5 },
  emptyBox:     { alignItems: 'center', paddingTop: 80 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#0a0f1c', marginTop: 16, marginBottom: 6 },
  emptyHint:    { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  // Detail header
  pageHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0a0f1c' },

  // Hero
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  approvalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  approvalBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  heroName:          { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 10, lineHeight: 34 },
  heroMetaRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroMetaText:      { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  tagsRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tagText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statValue: { fontSize: 22, fontWeight: '900', color: GOLD, marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#e8edf5', marginVertical: 14 },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0a0f1c', marginBottom: 14 },
  aboutText:    { fontSize: 14, color: '#475569', lineHeight: 22 },

  // Amenities
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  amenityCard: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e8edf5',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  amenityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  amenityLabel: { fontSize: 13, fontWeight: '600', color: '#334155', flex: 1 },

  // Documents
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  docIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docPdf:  { backgroundColor: '#fef2f2' },
  docImg:  { backgroundColor: '#eff6ff' },
  docName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0a0f1c' },
  docView: { fontSize: 13, fontWeight: '700', color: '#ef4444' },

  // Units
  unitsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  unitsLegend:        { flexDirection: 'row', gap: 10 },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText:         { fontSize: 11, fontWeight: '700' },
  emptyUnits:         { alignItems: 'center', paddingVertical: 32 },
  emptyUnitsText:     { fontSize: 14, color: '#94a3b8' },
  unitGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unitCard: {
    width: '47.5%', borderRadius: 16, borderWidth: 1.5, padding: 12,
  },
  unitTop:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  unitNumber:     { fontSize: 14, fontWeight: '800', color: '#0a0f1c' },
  unitPrice:      { fontSize: 13, fontWeight: '700', color: '#0a0f1c', marginBottom: 2 },
  unitSqft:       { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
  unitFacing:     { fontSize: 11, color: '#94a3b8', marginBottom: 6 },
  statusPill:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
});
