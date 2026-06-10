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
import { shadow } from '@/src/lib/shadow';
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

interface UnitBooking {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  confirmed_at: string | null;
  sold_at: string | null;
  status: string;
  agent: { name: string; phone: string };
}

interface Unit {
  id: string;
  unit_number: string;
  sq_ft: number;
  price: number;
  facing: string | null;
  road_width: number | null;
  status: UnitStatus;
  attributes: Record<string, unknown> | null;
  bookings: UnitBooking[];
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
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [view, setView]                 = useState<'list' | 'detail' | 'unit'>('list');

  const projectsQuery = useQuery<Project[]>({
    queryKey: ['owner-projects'],
    queryFn: () => api.get('/owner/projects').then((r) => r.data.data),
  });

  const detailQuery = useQuery<ProjectDetail>({
    queryKey: ['owner-project', selectedId],
    queryFn: () => api.get(`/owner/projects/${selectedId}`).then((r) => r.data.data),
    enabled: (view === 'detail' || view === 'unit') && !!selectedId,
  });

  const openDetail = (id: string) => { setSelectedId(id); setView('detail'); };
  const openUnit   = (unit: Unit) => { setSelectedUnit(unit); setView('unit'); };

  // ── Unit Detail View ─────────────────────────────────────────────────────────

  if (view === 'unit' && selectedUnit) {
    const unit    = selectedUnit;
    const booking = unit.bookings?.[0] ?? null;
    const color   = STATUS_COLOR[unit.status];
    const perSqft = unit.sq_ft > 0 ? Math.round(unit.price / unit.sq_ft) : 0;
    const project = detailQuery.data;

    const amenityKeys = Object.keys(AMENITY_MAP).filter((k) => unit.attributes?.[k]);
    const unitAmenities = amenityKeys.map((k) => ({ key: k, ...AMENITY_MAP[k] }));

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => setView('detail')} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color="#0a0f1c" />
          </TouchableOpacity>
          <Text style={s.pageTitle} numberOfLines={1}>Plot #{unit.unit_number}</Text>
          <View style={[s.statusPill, { backgroundColor: color + '20' }]}>
            <View style={[s.dot, { backgroundColor: color }]} />
            <Text style={[s.statusPillText, { color }]}>{unit.status}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          {/* Hero */}
          <View style={[s.unitDetailHero, { borderLeftColor: color }]}>
            <Text style={s.unitDetailProject}>{project?.project_name ?? ''}</Text>
            <Text style={s.unitDetailPrice}>{formatINR(unit.price)}</Text>
            <View style={s.unitSpecRow}>
              <View style={s.unitSpec}>
                <Feather name="maximize" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.unitDetailSpecText}>{unit.sq_ft.toLocaleString()} sqft</Text>
              </View>
              {perSqft > 0 && (
                <View style={s.unitSpec}>
                  <Feather name="tag" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.unitDetailSpecText}>₹{perSqft.toLocaleString()}/sqft</Text>
                </View>
              )}
              {!!unit.facing && (
                <View style={s.unitSpec}>
                  <Feather name="compass" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.unitDetailSpecText}>{unit.facing} facing</Text>
                </View>
              )}
              {!!unit.road_width && (
                <View style={s.unitSpec}>
                  <Feather name="navigation" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.unitDetailSpecText}>{unit.road_width} ft road</Text>
                </View>
              )}
            </View>
          </View>

          {/* Amenities */}
          {unitAmenities.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Amenities</Text>
              <View style={s.amenityGrid}>
                {unitAmenities.map((a) => (
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

          {/* Booking Info */}
          {booking && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {unit.status === 'Sold' ? 'Sale Details' : 'Booking Details'}
              </Text>
              <View style={s.detailInfoBlock}>
                {([
                  { icon: 'user'       as const, label: 'Customer',  value: booking.customer_name },
                  { icon: 'phone'      as const, label: 'Phone',     value: booking.customer_phone },
                  { icon: 'briefcase' as const, label: 'Agent',     value: booking.agent.name },
                  { icon: 'phone'      as const, label: 'Agent Ph.', value: booking.agent.phone },
                  { icon: 'calendar'   as const, label: 'Booked On', value: new Date(booking.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  ...(booking.confirmed_at ? [{ icon: 'check' as const, label: 'Confirmed', value: new Date(booking.confirmed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }] : []),
                  ...(booking.sold_at    ? [{ icon: 'award' as const, label: 'Sold On',   value: new Date(booking.sold_at).toLocaleDateString('en-IN',    { day: 'numeric', month: 'long', year: 'numeric' }) }] : []),
                ]).map(({ icon, label, value }) => (
                  <View key={label} style={s.detailInfoRow}>
                    <View style={s.detailInfoIcon}>
                      <Feather name={icon} size={14} color="#64748b" />
                    </View>
                    <Text style={s.detailInfoLabel}>{label}</Text>
                    <Text style={s.detailInfoValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Available notice */}
          {unit.status === 'Available' && (
            <View style={s.section}>
              <View style={s.availableNotice}>
                <Feather name="check-circle" size={22} color="#16a34a" />
                <View style={{ flex: 1 }}>
                  <Text style={s.availableNoticeTitle}>Available for Booking</Text>
                  <Text style={s.availableNoticeSub}>This plot has not been booked yet.</Text>
                </View>
              </View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    );
  }

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
          <FlatList
            data={units}
            keyExtractor={(u) => u.id}
            numColumns={2}
            columnWrapperStyle={s.colWrap}
            contentContainerStyle={s.unitListPad}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyUnits}>
                <Feather name="grid" size={40} color="#cbd5e1" />
                <Text style={s.emptyUnitsText}>No plots added yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.unitCard, { borderColor: STATUS_COLOR[item.status], backgroundColor: STATUS_BG[item.status] }]}
                onPress={() => openUnit(item)}
                activeOpacity={0.8}
              >
                <View style={s.unitCardTop}>
                  <Text style={s.unitNumber}>#{item.unit_number}</Text>
                  <View style={[s.statusDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
                </View>
                <Text style={s.unitPrice}>{formatINR(item.price)}</Text>
                <Text style={s.unitSqft}>{item.sq_ft.toLocaleString()} sqft</Text>
                {!!item.facing && <Text style={s.unitFacing}>{item.facing}</Text>}
              </TouchableOpacity>
            )}
            ListHeaderComponent={
              <>

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

            {/* ── Status bar + hint ── */}
            <View style={s.statusBar}>
              {([
                { label: 'Available', count: stats.available, color: STATUS_COLOR.Available },
                { label: 'Booked',    count: stats.booked,    color: STATUS_COLOR.Booked },
                { label: 'Sold',      count: stats.sold,      color: STATUS_COLOR.Sold },
              ] as const).map(({ label, count, color }) => (
                <View key={label} style={s.statusBarItem}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={s.statusBarLabel}>{label}</Text>
                  <Text style={[s.statusBarCount, { color }]}>{count}</Text>
                </View>
              ))}
            </View>
            <Text style={s.hintText}>Tap to view details</Text>
            </>
            }
          />
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
    ...shadow('#000', 3, 0.06, 12, 2),
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

  // Units grid
  unitListPad:    { paddingHorizontal: 12, paddingBottom: 40, paddingTop: 12 },
  colWrap:        { gap: 10, marginBottom: 10, paddingHorizontal: 0 },
  emptyUnits:     { alignItems: 'center', paddingVertical: 40, flex: 1 },
  emptyUnitsText: { fontSize: 14, color: '#94a3b8', marginTop: 10 },
  unitCard: {
    flex: 1, borderRadius: 16, borderWidth: 1.5,
    padding: 12, backgroundColor: '#fff',
  },
  unitCardTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  unitNumber:   { fontSize: 13, fontWeight: '800', color: '#0a0f1c' },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  unitPrice:    { fontSize: 14, fontWeight: '900', color: NAVY, marginBottom: 4 },
  unitSqft:     { fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 2 },
  unitFacing:   { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

  // Status bar (above grid)
  statusBar:      { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#fff', marginTop: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e8edf5' },
  statusBarItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBarLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statusBarCount: { fontSize: 13, fontWeight: '800' },
  hintText:       { fontSize: 11, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },

  unitSpecRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  unitSpec:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  // Unit detail view
  unitDetailHero: {
    backgroundColor: NAVY,
    borderLeftWidth: 6,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  unitDetailProject:  { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5, marginBottom: 6 },
  unitDetailPrice:    { fontSize: 32, fontWeight: '900', color: GOLD, marginBottom: 14 },
  unitDetailSpecText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  detailInfoBlock: {
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, gap: 14,
  },
  detailInfoRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailInfoIcon:  {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  detailInfoLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', width: 72 },
  detailInfoValue: { fontSize: 14, color: '#0a0f1c', fontWeight: '700', flex: 1 },

  availableNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#f0fdf4', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#bbf7d0',
  },
  availableNoticeTitle: { fontSize: 14, fontWeight: '800', color: '#15803d', marginBottom: 2 },
  availableNoticeSub:   { fontSize: 12, color: '#4ade80' },
});
