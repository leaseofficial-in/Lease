import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Fonts, Shadow } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  icon,
  iconActive,
  label,
  focused,
}: {
  icon: IoniconName;
  iconActive: IoniconName;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 10, gap: 3 }}>
      <Ionicons
        name={focused ? iconActive : icon}
        size={22}
        color={focused ? Colors.action : Colors.muted}
      />
      <Text
        style={{
          fontSize: 10,
          fontFamily: focused ? Fonts.sansSemiBold : Fonts.sans,
          color: focused ? Colors.action : Colors.muted,
          lineHeight: 13,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function AddTabIcon() {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateY: -14 }],
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: Colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          ...Shadow.card,
          shadowOpacity: 0.2,
          elevation: 10,
        }}
      >
        <Ionicons name="add" size={28} color={Colors.surface} />
      </View>
    </View>
  );
}

export default function LandlordLayout() {
  const { profile } = useAuthStore();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['landlord-unread-notifications', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .eq('read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30_000,
  });

  const { data: openRepairCount = 0 } = useQuery({
    queryKey: ['landlord-open-repairs-count', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('id, rental:rentals!inner(landlord_id)')
        .eq('rental.landlord_id', profile!.id)
        .eq('status', 'open');
      if (error) return 0;
      return data?.length ?? 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 60_000,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 64 : 82,
          paddingBottom: Platform.OS === 'web' ? 4 : 18,
          paddingTop: 0,
          elevation: 0,
          shadowOpacity: 0,
          overflow: 'visible',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home-outline" iconActive="home" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="wallet-outline" iconActive="wallet" label="Rent" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create-rental"
        options={{
          tabBarIcon: () => <AddTabIcon />,
        }}
      />
      <Tabs.Screen
        name="repairs"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="construct-outline" iconActive="construct" label="Repairs" focused={focused} />
          ),
          tabBarBadge: openRepairCount > 0 ? openRepairCount : undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.danger, fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 },
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="notifications-outline" iconActive="notifications" label="Inbox" focused={focused} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.danger, fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="person-outline" iconActive="person" label="Profile" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="property/[id]" options={{ href: null }} />
      <Tabs.Screen name="proof/[rentalId]" options={{ href: null }} />
      <Tabs.Screen name="repairs/[rentalId]" options={{ href: null }} />
    </Tabs>
  );
}
