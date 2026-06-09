import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/api/client';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { shadow } from '@/src/lib/shadow';

const NAVY = '#1e3c6e';
const MAROON = '#7a2030';
const GREEN = '#16a34a';
const AMBER = '#f59e0b';
const RED = '#ef4444';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchProject {
  id: string; name: string; location: string;
  unitCount: number; isPublished: boolean;
}
interface SearchPlot {
  id: string; unitNumber: string; sqFt: number; price: number;
  facing: string | null; status: string; projectId: string; projectName: string;
}
interface SearchBooking {
  id: string; customerName: string; customerPhone: string;
  date: string; status: string; unitNumber: string; projectName: string;
}
interface SearchPerson {
  id: string; name: string; phone: string;
  type: 'Agent' | 'Customer'; isActive: boolean; sales: number;
}
interface SearchResults {
  projects: SearchProject[];
  plots: SearchPlot[];
  bookings: SearchBooking[];
  people: SearchPerson[];
}

type Filter = 'All' | 'Plots' | 'Bookings' | 'Agents' | 'Customers' | 'Projects';

const STATUS_COLOR: Record<string, string> = {
  Available: GREEN,
  Booked: AMBER,
  Sold: RED,
  Pending: AMBER,
  Confirmed: GREEN,
  Rejected: RED,
};

const BOOKING_SHORT: Record<string, string> = {
  Pending: 'Pending Verify',
  Confirmed: 'Confirmed',
  Sold: 'Sold',
  Rejected: 'Rejected',
};

function formatPrice(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Result row components ─────────────────────────────────────────────────────

function SectionHeader({ title, count }: Readonly<{ title: string; count: number }>) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCount}><Text style={s.sectionCountText}>{count}</Text></View>
    </View>
  );
}

function ProjectRow({ item }: Readonly<{ item: SearchProject }>) {
  return (
    <View style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: NAVY + '12' }]}>
        <Feather name="home" size={16} color={NAVY} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={s.rowSub}>
          <Feather name="map-pin" size={10} color="#94a3b8" /> {item.location} · {item.unitCount} units
        </Text>
      </View>
      <View style={[s.badge, item.isPublished ? s.badgeGreen : s.badgeAmber]}>
        <Text style={[s.badgeText, { color: item.isPublished ? GREEN : AMBER }]}>
          {item.isPublished ? 'Active' : 'Draft'}
        </Text>
      </View>
    </View>
  );
}

function PlotRow({ item }: Readonly<{ item: SearchPlot }>) {
  const color = STATUS_COLOR[item.status] ?? '#64748b';
  return (
    <View style={s.row}>
      <View style={[s.rowDot, { backgroundColor: color }]} />
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {item.unitNumber} — {item.projectName}
        </Text>
        <Text style={s.rowSub}>
          {item.sqFt.toLocaleString()} sqft · {formatPrice(item.price / item.sqFt)}/sqft
          {item.facing ? ` · ${item.facing}` : ''}
        </Text>
      </View>
      <View style={[s.badge, { backgroundColor: color + '18' }]}>
        <Text style={[s.badgeText, { color }]}>{item.status}</Text>
      </View>
    </View>
  );
}

function BookingRow({ item }: Readonly<{ item: SearchBooking }>) {
  const color = STATUS_COLOR[item.status] ?? '#64748b';
  const shortId = item.id.slice(0, 8).toUpperCase();
  return (
    <View style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: MAROON + '10' }]}>
        <Feather name="clipboard" size={15} color={MAROON} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>
          BK-{shortId} · {item.customerName}
        </Text>
        <Text style={s.rowSub}>
          {item.unitNumber} · {formatDate(item.date)}
        </Text>
      </View>
      <View style={[s.badge, { backgroundColor: color + '18' }]}>
        <Text style={[s.badgeText, { color }]}>{BOOKING_SHORT[item.status] ?? item.status}</Text>
      </View>
    </View>
  );
}

function PersonRow({ item }: Readonly<{ item: SearchPerson }>) {
  const isAgent = item.type === 'Agent';
  const color = isAgent ? NAVY : '#7c3aed';
  const initials = item.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  return (
    <View style={s.row}>
      <View style={[s.rowAvatar, { backgroundColor: color + '14' }]}>
        <Text style={[s.rowAvatarText, { color }]}>{initials}</Text>
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {item.name} — <Text style={{ color, fontWeight: '600' }}>{item.type}</Text>
        </Text>
        <Text style={s.rowSub}>
          {item.phone}
          {isAgent ? ` · ${item.sales} bookings` : ''}
          {isAgent ? ` · ${item.isActive ? 'Active' : 'Inactive'}` : ''}
        </Text>
      </View>
    </View>
  );
}

// ─── Filter pills ─────────────────────────────────────────────────────────────

function FilterPills({
  filters, active, onSelect,
}: Readonly<{ filters: Filter[]; active: Filter; onSelect: (f: Filter) => void }>) {
  return (
    <View style={s.pillWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pillRow}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.pill, active === f && s.pillActive]}
            onPress={() => onSelect(f)}
            activeOpacity={0.8}
          >
            <Text style={[s.pillText, active === f && s.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GlobalSearchScreen() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const inputRef = useRef<TextInput>(null);

  const { data, isFetching, isError, refetch } = useQuery<SearchResults>({
    queryKey: ['global-search', query],
    queryFn: () => api.get('/search', { params: { q: query } }).then((r) => r.data),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
    retry: 1,
  });

  const results = data ?? { projects: [], plots: [], bookings: [], people: [] };

  // Role-based filter pills
  const filters: Filter[] = (() => {
    if (user?.role === 'Admin') return ['All', 'Plots', 'Bookings', 'Agents', 'Customers'];
    if (user?.role === 'Agent') return ['All', 'Plots', 'Bookings', 'Customers'];
    return ['All', 'Projects', 'Plots', 'Bookings'];
  })();

  const agents = results.people.filter((p) => p.type === 'Agent');
  const customers = results.people.filter((p) => p.type === 'Customer');

  const showProjects  = activeFilter === 'All' || activeFilter === 'Projects';
  const showPlots     = activeFilter === 'All' || activeFilter === 'Plots';
  const showBookings  = activeFilter === 'All' || activeFilter === 'Bookings';
  const showAgents    = activeFilter === 'All' || activeFilter === 'Agents';
  const showCustomers = activeFilter === 'All' || activeFilter === 'Customers';

  const hasResults =
    results.projects.length > 0 || results.plots.length > 0 ||
    results.bookings.length > 0 || results.people.length > 0;

  const clearSearch = useCallback(() => {
    setQuery('');
    setActiveFilter('All');
    inputRef.current?.focus();
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Search bar */}
      <View style={s.searchBar}>
        <View style={s.searchInputWrap}>
          <Feather name="search" size={17} color="#94a3b8" style={s.searchIcon} />
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            placeholder="Search plots, bookings, agents..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={17} color="#94a3b8" />
            </TouchableOpacity>
          )}
          {isFetching && <ActivityIndicator size="small" color={NAVY} style={{ marginLeft: 6 }} />}
        </View>
      </View>

      {/* Filter pills */}
      <FilterPills filters={filters} active={activeFilter} onSelect={setActiveFilter} />

      {/* Results */}
      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.results, s.resultsGrow]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Empty states */}
        {query.trim().length < 2 && (
          <View style={s.emptyState}>
            <Feather name="search" size={40} color="#e2e8f0" />
            <Text style={s.emptyTitle}>Search anything</Text>
            <Text style={s.emptySub}>
              Find plots, bookings, agents{user?.role === 'Owner' ? ' and projects' : ', customers'}
            </Text>
          </View>
        )}

        {query.trim().length >= 2 && !isFetching && isError && (
          <View style={s.emptyState}>
            <Feather name="wifi-off" size={40} color="#fca5a5" />
            <Text style={s.emptyTitle}>Search failed</Text>
            <Text style={s.emptySub}>Could not reach the server. Check your connection.</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
              <Text style={s.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {query.trim().length >= 2 && !isFetching && !isError && !hasResults && (
          <View style={s.emptyState}>
            <Feather name="inbox" size={40} color="#e2e8f0" />
            <Text style={s.emptyTitle}>No results</Text>
            <Text style={s.emptySub}>Nothing matched "{query}"</Text>
          </View>
        )}

        {/* Projects */}
        {showProjects && results.projects.length > 0 && (
          <View style={s.section}>
            <SectionHeader title="PROJECTS" count={results.projects.length} />
            {results.projects.map((item) => <ProjectRow key={item.id} item={item} />)}
          </View>
        )}

        {/* Plots */}
        {showPlots && results.plots.length > 0 && (
          <View style={s.section}>
            <SectionHeader title="PLOTS" count={results.plots.length} />
            {results.plots.map((item) => <PlotRow key={item.id} item={item} />)}
          </View>
        )}

        {/* Bookings */}
        {showBookings && results.bookings.length > 0 && (
          <View style={s.section}>
            <SectionHeader title="BOOKINGS" count={results.bookings.length} />
            {results.bookings.map((item) => <BookingRow key={item.id} item={item} />)}
          </View>
        )}

        {/* Agents */}
        {showAgents && agents.length > 0 && (
          <View style={s.section}>
            <SectionHeader title="AGENTS" count={agents.length} />
            {agents.map((item) => <PersonRow key={item.id} item={item} />)}
          </View>
        )}

        {/* Customers */}
        {showCustomers && customers.length > 0 && (
          <View style={s.section}>
            <SectionHeader title="CUSTOMERS" count={customers.length} />
            {customers.map((item) => <PersonRow key={item.id} item={item} />)}
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  flex: { flex: 1 },

  searchBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1, fontSize: 15, color: '#0a0f1c', padding: 0,
  },

  pillWrap: {
    height: 52,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
    justifyContent: 'center',
  },
  pillRow: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  pillActive: { backgroundColor: NAVY, borderColor: NAVY },
  pillText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  pillTextActive: { color: '#fff' },

  results: { padding: 16 },
  resultsGrow: { flexGrow: 1 },

  emptyState: {
    alignItems: 'center', paddingTop: 80, gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0a0f1c' },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    marginTop: 12, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: NAVY, borderRadius: 20,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  section: {
    backgroundColor: '#fff', borderRadius: 18,
    marginBottom: 14,
    ...shadow('#000', 3, 0.05, 10, 2),
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  sectionCount: {
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  sectionCountText: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rowAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  rowAvatarText: { fontSize: 12, fontWeight: '800' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0a0f1c', marginBottom: 2 },
  rowSub: { fontSize: 12, color: '#64748b' },

  badge: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeAmber: { backgroundColor: '#fef9c3' },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
