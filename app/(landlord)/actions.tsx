import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { AppNotification } from '../../types';
import { formatRelativeTime } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Cap, Chip, DisplayText } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';
import { markNotificationRead, markNotificationsRead, routeForNotification } from '../../lib/notificationActions';

export default function LandlordActionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['landlord-notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as AppNotification[];
    },
    enabled: !!profile?.id,
  });

  const unread = notifications?.filter((item) => !item.read) ?? [];
  const read = notifications?.filter((item) => item.read) ?? [];

  const refreshNotifications = async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['landlord-unread-notifications', profile?.id] });
  };

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.read) {
      await markNotificationRead(notification.id);
      await queryClient.invalidateQueries({ queryKey: ['landlord-notifications', profile?.id] });
      await queryClient.invalidateQueries({ queryKey: ['landlord-unread-notifications', profile?.id] });
    }
    router.push(routeForNotification(notification));
  };

  const markAllRead = async () => {
    await markNotificationsRead(unread.map((item) => item.id));
    await refreshNotifications();
  };

  return (
  <DashboardShell role="landlord">
    <SafeAreaView className="flex-1" edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refreshNotifications} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-start justify-between">
            <View>
              <Cap>Action Center</Cap>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, marginTop: 4 }}>
                What needs attention
              </Text>
            </View>
            {unread.length > 0 && (
              <TouchableOpacity onPress={markAllRead} activeOpacity={0.75}>
                <Cap style={{ color: Colors.primary }}>Mark all read</Cap>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="px-5 pt-4 gap-4">
          <Card>
            <Cap>Unread</Cap>
            <View className="flex-row items-end justify-between mt-2">
              <DisplayText style={{ fontSize: 42, lineHeight: 44 }}>{String(unread.length)}</DisplayText>
              <Chip tone={unread.length ? 'warn' : 'good'}>
                {unread.length ? 'Needs review' : 'Current'}
              </Chip>
            </View>
          </Card>

          {isLoading ? (
            <Card>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans }}>Loading actions...</Text>
            </Card>
          ) : !notifications?.length ? (
            <EmptyState
              title="No actions yet"
              subtitle="Tenant activity, proof, repairs, and payments will appear here."
              icon={<Text style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 32 }}>A</Text>}
            />
          ) : (
            <>
              {unread.length > 0 && (
                <View>
                  <Cap style={{ marginBottom: 12 }}>New ({unread.length})</Cap>
                  {unread.map((notification) => (
                    <ActionRow key={notification.id} notification={notification} onPress={() => handleOpen(notification)} />
                  ))}
                </View>
              )}

              {read.length > 0 && (
                <View>
                  <Cap style={{ marginTop: unread.length ? 14 : 0, marginBottom: 12 }}>
                    Recent ({read.length})
                  </Cap>
                  {read.map((notification) => (
                    <ActionRow key={notification.id} notification={notification} onPress={() => handleOpen(notification)} />
                  ))}
                </View>
              )}
            </>
          )}

          {!isLoading && notifications?.length === 0 && (
            <Button title="Refresh" variant="secondary" onPress={refreshNotifications} fullWidth />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  </DashboardShell>
  );
}

function ActionRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const tone = notification.read ? 'default' : toneFor(notification.type);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78}>
      <Card className="mb-3" style={{ borderColor: notification.read ? Colors.border : Colors.warningSoft }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center gap-2 mb-2">
              <Chip tone={tone}>{labelFor(notification.type)}</Chip>
              {!notification.read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.warning }} />}
            </View>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 4 }} numberOfLines={2}>
              {notification.body}
            </Text>
          </View>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
            {formatRelativeTime(notification.created_at)}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function labelFor(type: AppNotification['type']) {
  switch (type) {
    case 'payment_received':
      return 'Payment';
    case 'proof_submitted':
      return 'Proof';
    case 'repair_update':
      return 'Repair';
    case 'rent_due':
      return 'Rent';
    default:
      return 'Update';
  }
}

function toneFor(type: AppNotification['type']) {
  switch (type) {
    case 'payment_received':
      return 'good' as const;
    case 'proof_submitted':
      return 'warn' as const;
    case 'repair_update':
      return 'bad' as const;
    default:
      return 'default' as const;
  }
}
