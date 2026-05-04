import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { AppNotification } from '../../types';
import { formatRelativeTime } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { markNotificationRead, markNotificationsRead } from '../../lib/notificationActions';

const notifIcon: Record<AppNotification['type'], { name: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  rent_due:         { name: 'calendar-outline',     color: Colors.warning, bg: Colors.warningSoft },
  payment_received: { name: 'checkmark-circle-outline', color: Colors.success, bg: Colors.successSoft },
  proof_submitted:  { name: 'camera-outline',        color: Colors.action,  bg: Colors.actionSoft },
  repair_update:    { name: 'construct-outline',     color: '#7C3AED',     bg: '#EDE9FE' },
  general:          { name: 'notifications-outline', color: Colors.muted,  bg: Colors.fill },
};

export default function TenantNotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tenant-notifications', profile?.id],
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

  const unread = notifications?.filter((n) => !n.read) ?? [];
  const read = notifications?.filter((n) => n.read) ?? [];

  const refresh = async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['tenant-unread-notifications', profile?.id] });
  };

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.read) {
      await markNotificationRead(notification.id);
      await queryClient.invalidateQueries({ queryKey: ['tenant-notifications', profile?.id] });
      await queryClient.invalidateQueries({ queryKey: ['tenant-unread-notifications', profile?.id] });
    }
  };

  const markAllRead = async () => {
    await markNotificationsRead(unread.map((n) => n.id));
    await refresh();
  };

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
          <Cap>Updates</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginTop: 2 }}>
            Notifications
          </Text>
        </View>
        {unread.length > 0 && (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.75}>
            <Cap style={{ color: Colors.primary }}>Mark all read</Cap>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {!isLoading && !notifications?.length ? (
          <EmptyState
            title="No notifications yet"
            subtitle="Updates about your rental, proof, and repairs will appear here."
            icon={<Ionicons name="notifications-outline" size={36} color={Colors.muted} />}
          />
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 0 }}>
            {unread.length > 0 && (
              <>
                <Cap style={{ marginBottom: 10 }}>New ({unread.length})</Cap>
                {unread.map((n) => (
                  <NotifRow key={n.id} notification={n} onPress={() => void handleOpen(n)} />
                ))}
              </>
            )}
            {read.length > 0 && (
              <>
                <Cap style={{ marginTop: unread.length ? 20 : 0, marginBottom: 10 }}>Earlier</Cap>
                {read.map((n) => (
                  <NotifRow key={n.id} notification={n} onPress={() => {}} dimmed />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotifRow({
  notification,
  onPress,
  dimmed = false,
}: {
  notification: AppNotification;
  onPress: () => void;
  dimmed?: boolean;
}) {
  const style = notifIcon[notification.type];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78} style={{ marginBottom: 10 }}>
      <Card style={{ opacity: dimmed ? 0.6 : 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: style.bg, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <Ionicons name={style.name} size={18} color={style.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, flex: 1, marginRight: 8 }}>
                {notification.title}
              </Text>
              {!dimmed && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.action }} />
              )}
            </View>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 }}>
              {notification.body}
            </Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 5 }}>
              {formatRelativeTime(notification.created_at)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
