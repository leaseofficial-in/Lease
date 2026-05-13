import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { RepairRequest } from '../../types';
import { formatRelativeTime, repairPriorityLabel } from '../../lib/formatters';
import { StatusPill } from '../../components/ui/StatusPill';
import { EmptyState } from '../../components/ui/EmptyState';
import { Cap, Chip } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';

type RepairFilter = 'open' | 'in_progress' | 'all';

interface RepairWithRental extends RepairRequest {
  rental: { id: string; property: { name: string; city: string } | null };
}

const PRIORITY_ORDER: Record<RepairRequest['priority'], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function AllRepairsScreen() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [filter, setFilter] = useState<RepairFilter>('open');

  const { data: repairs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['all-landlord-repairs', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select(`
          *,
          rental:rentals!inner(
            id,
            property:properties(name, city)
          )
        `)
        .eq('rental.landlord_id', profile!.id)
        .in('status', ['open', 'in_progress', 'resolved'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as RepairWithRental[];
    },
    enabled: !!profile?.id,
  });

  const openCount = repairs?.filter((r) => r.status === 'open').length ?? 0;
  const inProgressCount = repairs?.filter((r) => r.status === 'in_progress').length ?? 0;

  const filtered = React.useMemo(() => {
    if (!repairs) return [];
    let list = repairs;
    if (filter === 'open') list = repairs.filter((r) => r.status === 'open');
    else if (filter === 'in_progress') list = repairs.filter((r) => r.status === 'in_progress');
    return [...list].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [repairs, filter]);

  const FILTERS: { key: RepairFilter; label: string; count?: number }[] = [
    { key: 'open', label: 'New', count: openCount },
    { key: 'in_progress', label: 'In Progress', count: inProgressCount },
    { key: 'all', label: 'All' },
  ];

  return (
  <DashboardShell role="landlord">
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Cap>Landlord</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, marginTop: 4 }}>
            Repairs
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 16 }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>In Progress</Text>
            <Text style={{ color: Colors.warning, fontFamily: Fonts.serif, fontSize: 36, lineHeight: 40, letterSpacing: -1 }}>{inProgressCount}</Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 4 }}>{openCount} new · awaiting</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 16 }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Avg Response</Text>
            <Text style={{ color: Colors.action, fontFamily: Fonts.serif, fontSize: 36, lineHeight: 40, letterSpacing: -1 }}>
              {openCount + inProgressCount > 0 ? '< 24' : '—'}
            </Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 4 }}>hours to first reply</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((f) => {
              const isSelected = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7,
                    borderRadius: 20, borderWidth: 1.5,
                    borderColor: isSelected ? Colors.primary : Colors.border,
                    backgroundColor: isSelected ? Colors.primary : Colors.surface,
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                  }}
                >
                  <Text style={{
                    color: isSelected ? Colors.surface : Colors.primary,
                    fontFamily: Fonts.sansSemiBold, fontSize: 13,
                  }}>
                    {f.label}
                  </Text>
                  {(f.count ?? 0) > 0 && (
                    <View style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : Colors.dangerSoft,
                      borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
                    }}>
                      <Text style={{
                        color: isSelected ? Colors.surface : Colors.danger,
                        fontFamily: Fonts.sansSemiBold, fontSize: 11,
                      }}>
                        {f.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        <View style={{ paddingHorizontal: 20 }}>
          {isLoading ? (
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 14, textAlign: 'center', marginTop: 48 }}>
              Loading…
            </Text>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={filter === 'open' ? 'No new repairs' : filter === 'in_progress' ? 'Nothing in progress' : 'No repairs yet'}
              subtitle="Repair requests raised by your tenants across all properties will appear here."
              icon={<Ionicons name="construct-outline" size={40} color={Colors.muted} />}
            />
          ) : (
            filtered.map((repair, idx) => {
              const isFeatured = repair.status === 'in_progress' && idx === 0;
              return (
                <TouchableOpacity
                  key={repair.id}
                  onPress={() => router.push({
                    pathname: '/(landlord)/repairs/[rentalId]',
                    params: { rentalId: repair.rental.id },
                  })}
                  activeOpacity={0.82}
                >
                  <View style={{
                    marginBottom: 12,
                    backgroundColor: Colors.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: isFeatured ? Colors.accent : Colors.border,
                    borderLeftWidth: isFeatured ? 4 : 1,
                    borderLeftColor: isFeatured ? Colors.accent : Colors.border,
                    padding: 14,
                  }}>
                    <Text numberOfLines={1} style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11, marginBottom: 6 }}>
                      {repair.rental?.property?.name ?? 'Property'} · {repair.rental?.property?.city}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15, flex: 1, marginRight: 10 }}>
                        {repair.title}
                      </Text>
                      <StatusPill kind="repair" value={repair.status} />
                    </View>
                    <Text
                      numberOfLines={2}
                      style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 10 }}
                    >
                      {repair.description}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <PriorityChip priority={repair.priority} />
                      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
                        {formatRelativeTime(repair.created_at)}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  </DashboardShell>
  );
}

function PriorityChip({ priority }: { priority: RepairRequest['priority'] }) {
  const tone =
    priority === 'urgent' || priority === 'high' ? ('bad' as const)
    : priority === 'medium' ? ('warn' as const)
    : ('default' as const);
  return <Chip tone={tone}>{repairPriorityLabel[priority]}</Chip>;
}
