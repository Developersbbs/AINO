import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Share,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { shadow } from '@/src/lib/shadow';
import api from '@/src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  project_name: string;
  project_type: string;
  location: string;
  rera_number: string | null;
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

interface GeneratedLink {
  projectName: string;
  clientName: string;
  shareToken: string;
  shareUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = '#1A2744';
const GOLD = '#C9A84C';
const GREEN = '#1e3c6e';

const STATUS_COLOR: Record<UnitStatus, string> = {
  Available: '#16a34a', Booked: '#f59e0b', Sold: '#94a3b8',
};
const STATUS_BG: Record<UnitStatus, string> = {
  Available: '#f0fdf4', Booked: '#fffbeb', Sold: '#f8fafc',
};

const AMENITY_MAP: Record<string, { label: string; icon: React.ComponentProps<typeof Feather>['name']; color: string }> = {
  water:        { label: 'Water Supply',         icon: 'droplet',       color: '#3b82f6' },
  electricity:  { label: 'Electricity',          icon: 'zap',           color: '#f59e0b' },
  drainage:     { label: 'Underground Drainage', icon: 'cloud-drizzle', color: '#f97316' },
  streetLights: { label: 'Street Lights',        icon: 'sun',           color: '#eab308' },
  compoundWall: { label: 'Compound Wall',        icon: 'square',        color: '#6366f1' },
  park:         { label: 'Park Area',            icon: 'feather',       color: '#22c55e' },
  clubhouse:    { label: 'Clubhouse',            icon: 'home',          color: '#8b5cf6' },
  security:     { label: '24/7 Security',        icon: 'shield',        color: '#ef4444' },
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
  return [...present].filter((k) => AMENITY_MAP[k]).map((k) => ({ key: k, ...AMENITY_MAP[k] }));
}

function deriveStats(units: Unit[]) {
  const total = units.length;
  const available = units.filter((u) => u.status === 'Available').length;
  const totalPrice = units.reduce((s, u) => s + u.price, 0);
  const totalSqft  = units.reduce((s, u) => s + u.sq_ft, 0);
  const perSqft = totalSqft > 0 ? Math.round(totalPrice / totalSqft) : 0;
  return { total, available, perSqft };
}

function deriveTags(project: ProjectDetail): string[] {
  const tags: string[] = [project.project_type];
  const fc: Record<string, number> = {};
  for (const u of project.units) {
    if (u.facing) fc[u.facing] = (fc[u.facing] ?? 0) + 1;
  }
  const top = Object.entries(fc).sort((a, b) => b[1] - a[1])[0];
  if (top) tags.push(`${top[0]} Facing`);
  if (project.units.some((u) => u.attributes?.security || u.attributes?.compoundWall)) {
    tags.push('Gated Community');
  }
  return tags;
}

function getApprovalLabel(cfg: ConfigAttr | null): string | null {
  if (!cfg) return null;
  const type = cfg.approvalType ?? cfg.approvalAuthority;
  return type ? `${type.toUpperCase()} APPROVED` : null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatItem({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <View style={s.statItem}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function ProjectDetailContent({ project }: Readonly<{ project: ProjectDetail }>) {
  const units     = project.units;
  const available = units.filter((u) => u.status === 'Available');
  const stats     = deriveStats(units);
  const amenities = deriveAmenities(units);
  const tags      = deriveTags(project);
  const cfg       = project.config_attributes;
  const approval  = getApprovalLabel(cfg);
  const docs      = project.documents ?? [];

  return (
    <>
      {/* Hero */}
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

      {/* Stats */}
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

      {/* About */}
      {!!cfg?.description && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>About This Project</Text>
          <Text style={s.aboutText}>{cfg.description}</Text>
        </View>
      )}

      {/* Amenities */}
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

      {/* Documents */}
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

      {/* Available Plots */}
      {available.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Available Plots ({available.length})</Text>
          <View style={s.unitGrid}>
            {available.map((unit) => (
              <View key={unit.id} style={[s.unitCard, { borderColor: STATUS_COLOR.Available, backgroundColor: STATUS_BG.Available }]}>
                <View style={s.unitTop}>
                  <Text style={s.unitNumber}>#{unit.unit_number}</Text>
                  <View style={[s.dot, { backgroundColor: STATUS_COLOR.Available }]} />
                </View>
                <Text style={s.unitPrice}>{formatINR(unit.price)}</Text>
                <Text style={s.unitSqft}>{unit.sq_ft.toLocaleString()} sqft</Text>
                {!!unit.facing && <Text style={s.unitFacing}>{unit.facing}</Text>}
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

// ─── AgentProjectDetail ───────────────────────────────────────────────────────

function AgentProjectDetail({ project, onBack }: Readonly<{ project: Project; onBack: () => void }>) {
  const insets = useSafeAreaInsets();

  const [clientName, setClientName]           = useState('');
  const [clientPhone, setClientPhone]         = useState('');
  const [generating, setGenerating]           = useState(false);
  const [showClientSheet, setShowClientSheet] = useState(false);
  const [link, setLink]                       = useState<GeneratedLink | null>(null);
  const [copied, setCopied]                   = useState(false);

  const detailQuery = useQuery<ProjectDetail>({
    queryKey: ['project-detail', project.id],
    queryFn: () => api.get(`/projects/${project.id}`).then((r) => r.data.data),
  });

  const openClientSheet  = () => { setClientName(''); setClientPhone(''); setShowClientSheet(true); };
  const closeClientSheet = () => { setShowClientSheet(false); setClientName(''); setClientPhone(''); };
  const closeShareSheet  = () => { setLink(null); setCopied(false); };

  const handleGenerate = async () => {
    const name   = clientName.trim();
    const digits = clientPhone.trim();
    if (!name)                          return Alert.alert('Required', 'Please enter the client name.');
    if (!digits || digits.length < 10) return Alert.alert('Required', 'Please enter a valid 10-digit phone number.');

    setGenerating(true);
    try {
      const { data } = await api.post('/leads/generate', {
        projectId: project.id, clientName: name, clientPhone: '+91' + digits,
      });
      setLink({ projectName: project.project_name, clientName: name, shareToken: data.data.shareToken, shareUrl: data.data.shareUrl });
      closeClientSheet();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not generate link.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!link) return;
    Share.share({ message: link.shareUrl, url: link.shareUrl });
  };

  const detail = detailQuery.data;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Back header */}
      <View style={s.pageHeader}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color="#0a0f1c" />
        </TouchableOpacity>
        <Text style={s.pageTitle} numberOfLines={1}>
          {detailQuery.isLoading ? 'Loading…' : (detail?.project_name ?? project.project_name)}
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

      {!!detail && (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
            <ProjectDetailContent project={detail} />
          </ScrollView>

          {/* Sticky Share Button */}
          <View style={[s.stickyBar, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity style={s.shareBtn} onPress={openClientSheet} activeOpacity={0.85}>
              <Feather name="link-2" size={18} color="#fff" />
              <Text style={s.shareBtnText}>Share with Client</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Client info sheet */}
      <Modal visible={showClientSheet} transparent animationType="slide" onRequestClose={closeClientSheet}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalOuter}>
            <Pressable style={s.backdrop} onPress={closeClientSheet} />
            <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
              <View style={s.handle} />
              <View style={s.sheetIcon}><Feather name="user-plus" size={22} color={GREEN} /></View>
              <Text style={s.sheetTitle}>{project.project_name}</Text>
              <Text style={s.sheetSub}>Enter client details to generate a unique tracking link</Text>

              <View style={s.formGroup}>
                <Text style={s.label}>CLIENT NAME</Text>
                <View style={s.inputRow}>
                  <Feather name="user" size={15} color="#94a3b8" style={s.inputIcon} />
                  <TextInput style={s.input} placeholder="e.g. Ravi Kumar" placeholderTextColor="#94a3b8" value={clientName} onChangeText={setClientName} autoCapitalize="words" returnKeyType="next" />
                </View>
              </View>

              <View style={s.formGroup}>
                <Text style={s.label}>CLIENT MOBILE</Text>
                <View style={s.inputRow}>
                  <Feather name="phone" size={15} color="#94a3b8" style={s.inputIcon} />
                  <Text style={s.dialCode}>+91</Text>
                  <View style={s.dialDiv} />
                  <TextInput style={s.input} placeholder="XXXXX XXXXX" placeholderTextColor="#94a3b8" value={clientPhone} onChangeText={(v) => setClientPhone(v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" returnKeyType="done" onSubmitEditing={handleGenerate} />
                </View>
              </View>

              <TouchableOpacity style={[s.generateBtn, generating && s.generateBtnDisabled]} onPress={handleGenerate} disabled={generating} activeOpacity={0.8}>
                {generating ? <ActivityIndicator size="small" color="#fff" /> : (
                  <><Feather name="link-2" size={16} color="#fff" /><Text style={s.generateBtnText}>Generate Unique Link</Text></>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={closeClientSheet}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Share link sheet */}
      <Modal visible={link !== null} transparent animationType="slide" onRequestClose={closeShareSheet}>
        <View style={s.modalOuter}>
          <Pressable style={s.backdrop} onPress={closeShareSheet} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.handle} />
            <View style={s.sheetIcon}><Feather name="check-circle" size={22} color={GREEN} /></View>
            <Text style={s.sheetTitle}>{link?.projectName}</Text>
            <Text style={s.sheetSub}>
              Unique link for <Text style={{ fontWeight: '800', color: '#0a0f1c' }}>{link?.clientName}</Text>
            </Text>
            <View style={s.qrContainer}>
              {!!link?.shareUrl && <QRCode value={link.shareUrl} size={180} color="#000000" backgroundColor="#ffffff" />}
            </View>
            <View style={s.urlStrip}>
              <Feather name="link" size={13} color="#94a3b8" />
              <Text style={s.urlText} numberOfLines={1} ellipsizeMode="middle">{link?.shareUrl}</Text>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={[s.copyBtn, copied && s.copyBtnDone]} onPress={handleCopy} activeOpacity={0.8}>
                <Feather name={copied ? 'check' : 'copy'} size={16} color={copied ? GREEN : '#0a0f1c'} />
                <Text style={[s.copyBtnText, copied && { color: GREEN }]}>{copied ? 'Copied!' : 'Copy Link'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.shareActionBtn} onPress={handleShare} activeOpacity={0.8}>
                <Feather name="share-2" size={16} color="#fff" />
                <Text style={s.shareActionBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.doneBtn} onPress={closeShareSheet}>
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── ShareScreen (entry point) ────────────────────────────────────────────────

export default function ShareScreen() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading, isError, refetch } = useQuery<Project[]>({
    queryKey: ['published-projects'],
    queryFn: () => api.get('/projects').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={NAVY} /></View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.centerText}>Could not load projects</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedProject) {
    return <AgentProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Share Projects</Text>
        <Text style={s.headerSub}>Tap a project to view details and generate client links</Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Feather name="folder" size={48} color="#cbd5e1" />
            <Text style={s.emptyTitle}>No projects available</Text>
            <Text style={s.emptyHint}>Published projects will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => setSelectedProject(item)} activeOpacity={0.8}>
            <View style={s.cardBody}>
              <Text style={s.cardType}>{item.project_type.toUpperCase()}</Text>
              <Text style={s.cardName}>{item.project_name}</Text>
              <View style={s.locationRow}>
                <Feather name="map-pin" size={12} color="#94a3b8" />
                <Text style={s.cardLocation}>{item.location}</Text>
              </View>
              {!!item.rera_number && (
                <View style={s.reraRow}>
                  <Feather name="shield" size={11} color="#94a3b8" />
                  <Text style={s.rera}>RERA: {item.rera_number}</Text>
                </View>
              )}
            </View>
            <View style={s.cardFooter}>
              <Feather name="eye" size={14} color={NAVY} />
              <Text style={s.cardFooterText}>View Details & Share</Text>
              <Feather name="chevron-right" size={14} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#f5f7fa' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20 },
  retryBtn:   { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: NAVY },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  header:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0a0f1c' },
  headerSub:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  list:        { padding: 16, gap: 14, paddingBottom: 40 },

  card:           { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...shadow('#000', 3, 0.05, 10, 2) },
  cardBody:       { padding: 18 },
  cardType:       { fontSize: 10, fontWeight: '700', color: NAVY, letterSpacing: 0.8, marginBottom: 4 },
  cardName:       { fontSize: 17, fontWeight: '800', color: '#0a0f1c', marginBottom: 8 },
  locationRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardLocation:   { fontSize: 13, color: '#64748b' },
  reraRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rera:           { fontSize: 11, color: '#94a3b8' },
  cardFooter:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e8edf5' },
  cardFooterText: { flex: 1, fontSize: 13, fontWeight: '700', color: NAVY },
  emptyBox:       { alignItems: 'center', paddingTop: 80 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: '#0a0f1c', marginTop: 16, marginBottom: 6 },
  emptyHint:      { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  pageHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5', gap: 12 },
  backBtn:    { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  pageTitle:  { flex: 1, fontSize: 18, fontWeight: '800', color: '#0a0f1c' },

  hero:              { backgroundColor: NAVY, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
  approvalBadge:     { alignSelf: 'flex-start', backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 12 },
  approvalBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  heroName:          { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 10, lineHeight: 34 },
  heroMetaRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroMetaText:      { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  tagsRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag:               { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.12)' },
  tagText:           { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  statsRow:    { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5' },
  statItem:    { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statValue:   { fontSize: 22, fontWeight: '900', color: GOLD, marginBottom: 4 },
  statLabel:   { fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#e8edf5', marginVertical: 14 },

  section:      { backgroundColor: '#fff', marginTop: 12, paddingHorizontal: 20, paddingVertical: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0a0f1c', marginBottom: 14 },
  aboutText:    { fontSize: 14, color: '#475569', lineHeight: 22 },

  amenityGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  amenityCard:  { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e8edf5', paddingHorizontal: 14, paddingVertical: 12 },
  amenityIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  amenityLabel: { fontSize: 13, fontWeight: '600', color: '#334155', flex: 1 },

  docRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  docIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docPdf:  { backgroundColor: '#fef2f2' },
  docImg:  { backgroundColor: '#eff6ff' },
  docName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0a0f1c' },
  docView: { fontSize: 13, fontWeight: '700', color: '#ef4444' },

  unitGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unitCard:   { width: '47.5%', borderRadius: 16, borderWidth: 1.5, padding: 12 },
  unitTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  unitNumber: { fontSize: 14, fontWeight: '800', color: '#0a0f1c' },
  unitPrice:  { fontSize: 13, fontWeight: '700', color: '#0a0f1c', marginBottom: 2 },
  unitSqft:   { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
  unitFacing: { fontSize: 11, color: '#94a3b8' },
  dot:        { width: 7, height: 7, borderRadius: 3.5 },

  stickyBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8edf5', paddingHorizontal: 20, paddingTop: 12 },
  shareBtn:     { backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  modalOuter:          { flex: 1, justifyContent: 'flex-end' },
  backdrop:            { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:               { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: 'center', ...shadow('#000', -4, 0.1, 20, 20) },
  handle:              { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 20 },
  sheetIcon:           { width: 52, height: 52, borderRadius: 16, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  sheetTitle:          { fontSize: 18, fontWeight: '800', color: '#0a0f1c', textAlign: 'center', marginBottom: 4 },
  sheetSub:            { fontSize: 13, color: '#64748b', marginBottom: 24, textAlign: 'center', lineHeight: 18 },
  formGroup:           { width: '100%', marginBottom: 14 },
  label:               { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 6 },
  inputRow:            { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', height: 52, overflow: 'hidden' },
  inputIcon:           { paddingHorizontal: 14 },
  dialCode:            { paddingHorizontal: 10, fontSize: 15, fontWeight: '700', color: '#0a0f1c' },
  dialDiv:             { width: 1, height: 28, backgroundColor: '#e2e8f0' },
  input:               { flex: 1, fontSize: 15, color: '#0a0f1c', fontWeight: '500', paddingRight: 14 },
  generateBtn:         { width: '100%', backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 6 },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn:           { marginTop: 14 },
  cancelBtnText:       { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  qrContainer:         { padding: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e8edf5', marginBottom: 20 },
  urlStrip:            { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  urlText:             { flex: 1, fontSize: 12, color: '#64748b' },
  actions:             { width: '100%', flexDirection: 'row', gap: 12, marginBottom: 16 },
  copyBtn:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  copyBtnDone:         { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  copyBtnText:         { fontSize: 14, fontWeight: '700', color: '#0a0f1c' },
  shareActionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, backgroundColor: GREEN },
  shareActionBtnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  doneBtn:             { paddingVertical: 10 },
  doneBtnText:         { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
});
