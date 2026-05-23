import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import api from '@/src/api/client';

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  status: 'Pending' | 'Confirmed' | 'Sold';
  confirmed_at: string | null;
  unit: {
    id: string;
    unit_number: string;
    sq_ft?: number;
    price: number;
    status: string;
    project: { id: string; project_name: string };
  };
  agent: { id: string; name: string; phone: string };
}

type Tab = 'Pending' | 'Confirmed';

const NAVY = '#1A2744';
const GOLD = '#C9A84C';
const RED  = '#ef4444';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function bookingRef(id: string, date: string): string {
  const year = new Date(date).getFullYear();
  const num  = Number.parseInt(id.replaceAll('-', '').slice(0, 8), 16) % 100000;
  return `BK-${year}-${String(num).padStart(5, '0')}`;
}

function InfoRow({ label, value, gold }: Readonly<{ label: string; value: string; gold?: boolean }>) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, gold && s.infoValueGold]}>{value}</Text>
    </View>
  );
}

// ── Pending Card: Confirm booking (initial payment received) or Reject ──
function PendingCard({
  booking, onConfirm, onReject, loading,
}: Readonly<{
  booking: Booking; onConfirm: () => void; onReject: () => void; loading: boolean;
}>) {
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.bookingRef}>{bookingRef(booking.id, booking.booking_date)}</Text>
        <View style={s.pendingBadge}>
          <Text style={s.pendingBadgeText}>Pending Verify</Text>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.infoBlock}>
        <InfoRow
          label="Plot"
          value={booking.unit.sq_ft
            ? `${booking.unit.unit_number} · ${booking.unit.sq_ft.toLocaleString('en-IN')} sqft`
            : booking.unit.unit_number}
        />
        <InfoRow label="Customer"       value={booking.customer_name} />
        <InfoRow label="Mobile"         value={booking.customer_phone} />
        <InfoRow label="Agent"          value={booking.agent.name} />
        <InfoRow label="Booked On"      value={formatDate(booking.booking_date)} />
        <InfoRow label="Booking Amount" value={formatINR(booking.unit.price)} gold />
      </View>

      <View style={s.divider} />

      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.holdBtn, loading && s.btnDisabled]}
          onPress={onReject}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={s.holdBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.confirmBtn, loading && s.btnDisabled]}
          onPress={onConfirm}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check" size={13} color="#fff" />
              <Text style={s.confirmBtnText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Confirmed Card: Full payment received → Mark as Sold ──
function ConfirmedCard({
  booking, onMarkSold, loading,
}: Readonly<{
  booking: Booking; onMarkSold: () => void; loading: boolean;
}>) {
  return (
    <View style={[s.card, s.cardConfirmed]}>
      <View style={s.cardTop}>
        <Text style={s.bookingRef}>{bookingRef(booking.id, booking.booking_date)}</Text>
        <View style={s.confirmedBadge}>
          <Text style={s.confirmedBadgeText}>Booking Confirmed</Text>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.infoBlock}>
        <InfoRow
          label="Plot"
          value={booking.unit.sq_ft
            ? `${booking.unit.unit_number} · ${booking.unit.sq_ft.toLocaleString('en-IN')} sqft`
            : booking.unit.unit_number}
        />
        <InfoRow label="Customer"       value={booking.customer_name} />
        <InfoRow label="Mobile"         value={booking.customer_phone} />
        <InfoRow label="Agent"          value={booking.agent.name} />
        <InfoRow label="Booked On"      value={formatDate(booking.booking_date)} />
        {!!booking.confirmed_at && (
          <InfoRow label="Confirmed On" value={formatDate(booking.confirmed_at)} />
        )}
        <InfoRow label="Full Amount"    value={formatINR(booking.unit.price)} gold />
      </View>

      <View style={s.divider} />

      <TouchableOpacity
        style={[s.soldBtn, loading && s.btnDisabled]}
        onPress={onMarkSold}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Feather name="lock" size={13} color="#fff" />
            <Text style={s.soldBtnText}>Mark as Sold</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function OwnerBookings() {
  const [tab, setTab]                   = useState<Tab>('Pending');
  const [refreshing, setRefreshing]     = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const pendingQuery = useQuery<Booking[]>({
    queryKey: ['owner-bookings', 'Pending'],
    queryFn: () => api.get('/owner/bookings?status=Pending').then((r) => r.data.data),
  });

  const confirmedQuery = useQuery<Booking[]>({
    queryKey: ['owner-bookings', 'Confirmed'],
    queryFn: () => api.get('/owner/bookings?status=Confirmed').then((r) => r.data.data),
  });

  const activeQuery   = tab === 'Pending' ? pendingQuery : confirmedQuery;
  const bookings      = activeQuery.data ?? [];
  const pendingCount  = pendingQuery.data?.length ?? 0;
  const confirmedCount = confirmedQuery.data?.length ?? 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['owner-reports'] });
  };

  const verifyMutation = useMutation({
    mutationFn: ({ id, confirmed }: { id: string; confirmed: boolean }) =>
      api.post(`/owner/bookings/${id}/verify`, { confirmed }),
    onMutate: ({ id }) => setProcessingId(id),
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message ?? 'Action failed.'),
    onSettled: () => { setProcessingId(null); invalidate(); },
  });

  const soldMutation = useMutation({
    mutationFn: (id: string) => api.post(`/owner/bookings/${id}/sold`, {}),
    onMutate: (id) => setProcessingId(id),
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message ?? 'Action failed.'),
    onSettled: () => { setProcessingId(null); invalidate(); },
  });

  const handleConfirm = (b: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Confirm Booking',
      `Confirm initial payment received for Plot #${b.unit.unit_number} from ${b.customer_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => verifyMutation.mutate({ id: b.id, confirmed: true }) },
      ],
    );
  };

  const handleReject = (b: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Reject Booking',
      `Reject booking for Plot #${b.unit.unit_number} and return it to available?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => verifyMutation.mutate({ id: b.id, confirmed: false }) },
      ],
    );
  };

  const handleMarkSold = (b: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Mark as Sold',
      `Full payment received for Plot #${b.unit.unit_number}?\nThis will mark the unit as sold and process commission.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as Sold', onPress: () => soldMutation.mutate(b.id) },
      ],
    );
  };

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await activeQuery.refetch();
    setRefreshing(false);
  };

  const renderBookingCard = (item: Booking) => {
    if (tab === 'Pending') {
      return (
        <PendingCard
          key={item.id}
          booking={item}
          onConfirm={() => handleConfirm(item)}
          onReject={() => handleReject(item)}
          loading={processingId === item.id}
        />
      );
    }
    return (
      <ConfirmedCard
        key={item.id}
        booking={item}
        onMarkSold={() => handleMarkSold(item)}
        loading={processingId === item.id}
      />
    );
  };

  const renderListContent = () => {
    if (activeQuery.isLoading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      );
    }
    if (activeQuery.isError) {
      return (
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.centerText}>Could not load bookings</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => activeQuery.refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GOLD} />
        }
      >
        {bookings.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <Feather name="check-circle" size={36} color={GOLD} />
            </View>
            <Text style={s.emptyTitle}>
              {tab === 'Pending' ? 'No pending bookings' : 'No confirmed bookings'}
            </Text>
            <Text style={s.emptyHint}>
              {tab === 'Pending'
                ? 'New bookings from agents will appear here'
                : 'Confirmed bookings awaiting full payment will appear here'}
            </Text>
          </View>
        ) : (
          bookings.map(renderBookingCard)
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Bookings</Text>
        {(pendingCount + confirmedCount) > 0 && (
          <View style={s.totalBadge}>
            <Text style={s.totalBadgeText}>{pendingCount + confirmedCount} Active</Text>
          </View>
        )}
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'Pending' && s.tabActive]}
          onPress={() => setTab('Pending')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabText, tab === 'Pending' && s.tabTextActive]}>
            Pending Verification
          </Text>
          {pendingCount > 0 && (
            <View style={[s.tabBadge, tab === 'Pending' && s.tabBadgeActive]}>
              <Text style={s.tabBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tab, tab === 'Confirmed' && s.tabActive]}
          onPress={() => setTab('Confirmed')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabText, tab === 'Confirmed' && s.tabTextActive]}>
            Awaiting Full Payment
          </Text>
          {confirmedCount > 0 && (
            <View style={[s.tabBadge, tab === 'Confirmed' && s.tabBadgeActive]}>
              <Text style={s.tabBadgeText}>{confirmedCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Tab description ── */}
      <View style={s.tabHint}>
        <Feather
          name={tab === 'Pending' ? 'info' : 'dollar-sign'}
          size={12}
          color="#94a3b8"
        />
        <Text style={s.tabHintText}>
          {tab === 'Pending'
            ? 'Confirm once initial payment (booking amount) is received'
            : 'Mark as Sold once full payment is completed'}
        </Text>
      </View>

      {/* ── List ── */}
      {renderListContent()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    backgroundColor: NAVY,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  totalBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: NAVY },
  tabText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  tabTextActive: { color: NAVY },
  tabBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeActive: { backgroundColor: NAVY },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // Hint
  tabHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  tabHintText: { fontSize: 11, color: '#94a3b8', flex: 1 },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: NAVY },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // List
  list: { padding: 16, gap: 12, paddingBottom: 40 },

  // Card base
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  cardConfirmed: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  bookingRef: { fontSize: 15, fontWeight: '800', color: '#0a0f1c', letterSpacing: 0.3 },

  // Badges
  pendingBadge: {
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#A16207' },
  confirmedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  confirmedBadgeText: { fontSize: 11, fontWeight: '700', color: '#065F46' },

  // Divider
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },

  // Info rows
  infoBlock: { gap: 9 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#0a0f1c', fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 16 },
  infoValueGold: { color: GOLD, fontSize: 15, fontWeight: '900' },

  // Pending card buttons
  actionRow: { flexDirection: 'row', gap: 10 },
  holdBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: NAVY,
  },
  confirmBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Confirmed card button
  soldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: RED,
  },
  soldBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  btnDisabled: { opacity: 0.5 },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#FEFCE8', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0a0f1c', marginBottom: 6 },
  emptyHint: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 32 },
});
