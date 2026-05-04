import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useRepairs, useUpdateRepairStatus } from '../../../hooks/useRepairs';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { supabase } from '../../../lib/supabase';
import { RepairRequest, RepairStatus } from '../../../types';
import { formatRelativeTime, repairPriorityLabel, repairStatusLabel } from '../../../lib/formatters';
import { Card } from '../../../components/ui/Card';
import { StatusPill } from '../../../components/ui/StatusPill';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { Cap, Chip } from '../../../components/ui/V2';
import { Colors, Fonts } from '../../../constants/theme';
import { isDevAuthUserId } from '../../../lib/devAuth';
import { markLandlordActionsViewed } from '../../../lib/landlordActionViews';
import { markNotificationsRead } from '../../../lib/notificationActions';

const NEXT_STATUS: Partial<Record<RepairStatus, RepairStatus>> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
};

const NEXT_LABEL: Partial<Record<RepairStatus, string>> = {
  open: 'Start Work',
  in_progress: 'Mark Resolved',
  resolved: 'Close Request',
};

export default function LandlordRepairsScreen() {
  const { rentalId } = useLocalSearchParams<{ rentalId: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const isLocalDevUser = isDevAuthUserId(profile?.id);
  const { data, isLoading, refetch, isRefetching } = useRepairs(isLocalDevUser ? undefined : rentalId);
  const updateStatus = useUpdateRepairStatus();
  const repairs = isLocalDevUser ? [] : data ?? [];

  useEffect(() => {
    const ids = repairs.map((repair) => repair.id);
    if (!profile?.id || !ids.length) return;

    markLandlordActionsViewed(profile.id, 'repairs', ids).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-viewed-actions', profile.id, 'repairs'] });
    });
  }, [profile?.id, queryClient, repairs]);

  useEffect(() => {
    if (!profile?.id || !rentalId) return;

    supabase
      .from('notifications')
      .select('id')
      .eq('user_id', profile.id)
      .eq('read', false)
      .eq('type', 'repair_update')
      .contains('data', { rental_id: rentalId })
      .then(({ data }) => {
        const ids = data?.map((item) => item.id) ?? [];
        if (!ids.length) return;
        markNotificationsRead(ids).then(() => {
          void queryClient.invalidateQueries({ queryKey: ['landlord-unread-notifications', profile.id] });
          void queryClient.invalidateQueries({ queryKey: ['landlord-notifications', profile.id] });
        });
      });
  }, [profile?.id, queryClient, rentalId]);

  const handleAdvance = async (repair: RepairRequest) => {
    const next = NEXT_STATUS[repair.status];
    if (!next) return;
    setActioningId(repair.id);
    try {
      await updateStatus.mutateAsync({ repairId: repair.id, status: next, rentalId });
      showToast(`Marked as ${repairStatusLabel[next]}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update status', 'error');
    } finally {
      setActioningId(null);
    }
  };

  if (isLoading) return <LoadingScreen />;

  const needsAction = repairs.filter((r) => r.status === 'open');
  const inProgress = repairs.filter((r) => r.status === 'in_progress');
  const closed = repairs.filter((r) => r.status === 'resolved' || r.status === 'closed');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Cap>Maintenance</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginTop: 2 }}>
            Repair Requests
          </Text>
        </View>
        {repairs.length > 0 && (
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
            {needsAction.length} new
          </Text>
        )}
      </View>

      {!repairs.length ? (
        <EmptyState
          title="No repair requests"
          subtitle={
            isLocalDevUser
              ? 'Local demo mode skips live maintenance records.'
              : "Your tenant hasn't raised any maintenance issues yet."
          }
          icon={<Ionicons name="construct-outline" size={32} color={Colors.muted} />}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <Metric label="New" value={String(needsAction.length)} tone="bad" />
              <Metric label="In work" value={String(inProgress.length)} tone="warn" />
              <Metric label="Closed" value={String(closed.length)} tone="good" />
            </View>

            {needsAction.length > 0 && (
              <>
                <Cap style={{ marginBottom: 12 }}>Needs review ({needsAction.length})</Cap>
                {needsAction.map((r) => (
                  <RepairCard
                    key={r.id}
                    repair={r}
                    onAdvance={handleAdvance}
                    advancing={actioningId === r.id}
                  />
                ))}
              </>
            )}

            {inProgress.length > 0 && (
              <>
                <Cap style={{ marginTop: needsAction.length ? 20 : 0, marginBottom: 12 }}>
                  In progress ({inProgress.length})
                </Cap>
                {inProgress.map((r) => (
                  <RepairCard
                    key={r.id}
                    repair={r}
                    onAdvance={handleAdvance}
                    advancing={actioningId === r.id}
                  />
                ))}
              </>
            )}

            {closed.length > 0 && (
              <>
                <Cap style={{ marginTop: 20, marginBottom: 12 }}>Closed ({closed.length})</Cap>
                {closed.map((r) => (
                  <RepairCard
                    key={r.id}
                    repair={r}
                    onAdvance={handleAdvance}
                    advancing={actioningId === r.id}
                  />
                ))}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? Colors.success : tone === 'warn' ? Colors.warning : Colors.danger;
  const bg = tone === 'good' ? Colors.successSoft : tone === 'warn' ? Colors.warningSoft : Colors.dangerSoft;
  return (
    <View style={{ flex: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: bg }}>
      <Text style={{ color, fontFamily: Fonts.sansSemiBold, fontSize: 22 }}>{value}</Text>
      <Text style={{ color, fontFamily: Fonts.sansMedium, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function RepairCard({
  repair,
  onAdvance,
  advancing,
}: {
  repair: RepairRequest;
  onAdvance: (r: RepairRequest) => void;
  advancing: boolean;
}) {
  const isClosed = repair.status === 'closed';
  const priorityTone = repair.priority === 'urgent' || repair.priority === 'high'
    ? 'bad'
    : repair.priority === 'medium'
    ? 'warn'
    : 'default';

  return (
    <Card style={{ marginBottom: 12, opacity: isClosed ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16, flex: 1, marginRight: 12 }}>
          {repair.title}
        </Text>
        <StatusPill kind="repair" value={repair.status} />
      </View>
      <Text
        numberOfLines={3}
        style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 12 }}
      >
        {repair.description}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Chip tone={priorityTone}>{repairPriorityLabel[repair.priority]}</Chip>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
          Reported {formatRelativeTime(repair.created_at)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
            {statusHint(repair.status)}
          </Text>
        </View>

        {NEXT_STATUS[repair.status] && (
          <TouchableOpacity
            onPress={() => onAdvance(repair)}
            disabled={advancing}
            style={{ backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}
            activeOpacity={0.75}
          >
            <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
              {advancing ? 'Saving...' : NEXT_LABEL[repair.status]}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

function statusHint(status: RepairStatus) {
  switch (status) {
    case 'open':
      return 'New tenant request. Start work when you begin handling it.';
    case 'in_progress':
      return 'Work has started. Mark resolved after the issue is fixed.';
    case 'resolved':
      return 'Resolved. Close the request once no follow-up is needed.';
    case 'closed':
      return 'Closed request.';
    default:
      return '';
  }
}
