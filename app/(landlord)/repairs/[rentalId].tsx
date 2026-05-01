import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRepairs, useUpdateRepairStatus } from '../../../hooks/useRepairs';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { RepairRequest, RepairStatus } from '../../../types';
import { formatRelativeTime, repairPriorityLabel, repairStatusLabel } from '../../../lib/formatters';
import { Card } from '../../../components/ui/Card';
import { StatusPill } from '../../../components/ui/StatusPill';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { Cap, Chip } from '../../../components/ui/V2';
import { Colors, Fonts } from '../../../constants/theme';
import { isDevAuthUserId } from '../../../lib/devAuth';

const NEXT_STATUS: Partial<Record<RepairStatus, RepairStatus>> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
};

const NEXT_LABEL: Partial<Record<RepairStatus, string>> = {
  open: 'Start',
  in_progress: 'Resolve',
  resolved: 'Close',
};

export default function LandlordRepairsScreen() {
  const { rentalId } = useLocalSearchParams<{ rentalId: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const isLocalDevUser = isDevAuthUserId(profile?.id);
  const { data, isLoading } = useRepairs(isLocalDevUser ? undefined : rentalId);
  const updateStatus = useUpdateRepairStatus();
  const repairs = isLocalDevUser ? [] : data ?? [];

  const handleAdvance = async (repair: RepairRequest) => {
    const next = NEXT_STATUS[repair.status];
    if (!next) return;
    try {
      await updateStatus.mutateAsync({ repairId: repair.id, status: next, rentalId });
      showToast(`Marked as ${repairStatusLabel[next]}`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  if (isLoading) return <LoadingScreen />;

  const open = repairs.filter((r) => r.status === 'open' || r.status === 'in_progress');
  const closed = repairs.filter((r) => r.status === 'resolved' || r.status === 'closed');

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <View className="px-5 py-4 flex-row items-center bg-white border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-fill items-center justify-center mr-3"
          activeOpacity={0.75}
        >
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>
            Repair Requests
          </Text>
          {repairs.length > 0 && (
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 }}>
              {open.length} open, {closed.length} closed
            </Text>
          )}
        </View>
      </View>

      {!repairs.length ? (
        <EmptyState
          title="No repair requests"
          subtitle={
            isLocalDevUser
              ? 'Local demo mode skips live maintenance records.'
              : "Your tenant hasn't raised any maintenance issues yet."
          }
          icon={<Text style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 32 }}>M</Text>}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-4 pb-8">
            {open.length > 0 && (
              <>
                <Cap style={{ marginBottom: 12 }}>Active ({open.length})</Cap>
                {open.map((r) => (
                  <RepairCard
                    key={r.id}
                    repair={r}
                    onAdvance={handleAdvance}
                    advancing={updateStatus.isPending}
                  />
                ))}
              </>
            )}

            {closed.length > 0 && (
              <>
                <Cap style={{ marginTop: 16, marginBottom: 12 }}>Closed ({closed.length})</Cap>
                {closed.map((r) => (
                  <RepairCard key={r.id} repair={r} onAdvance={handleAdvance} advancing={false} />
                ))}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
  const isDone = repair.status === 'resolved' || repair.status === 'closed';
  const priorityTone = repair.priority === 'urgent' || repair.priority === 'high'
    ? 'bad'
    : repair.priority === 'medium'
    ? 'warn'
    : 'default';

  return (
    <Card className={`mb-3 ${isDone ? 'opacity-60' : ''}`}>
      <View className="flex-row items-start justify-between mb-2">
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
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Chip tone={priorityTone}>{repairPriorityLabel[repair.priority]}</Chip>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
            {formatRelativeTime(repair.created_at)}
          </Text>
        </View>

        {NEXT_STATUS[repair.status] && (
          <TouchableOpacity
            onPress={() => onAdvance(repair)}
            disabled={advancing}
            className="bg-primary px-3 py-2 rounded-full"
            activeOpacity={0.75}
          >
            <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
              {NEXT_LABEL[repair.status]}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}
