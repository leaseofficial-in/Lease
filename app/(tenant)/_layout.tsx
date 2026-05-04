import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../constants/theme';

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

export default function TenantLayout() {
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
        name="rent-history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="receipt-outline" iconActive="receipt" label="Rent" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="deposit"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="cash-outline" iconActive="cash" label="Deposit" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="repairs"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="hammer-outline" iconActive="hammer" label="Repairs" focused={focused} />
          ),
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
      <Tabs.Screen name="join" options={{ href: null }} />
      <Tabs.Screen name="proof/upload" options={{ href: null }} />
      <Tabs.Screen name="agreement" options={{ href: null }} />
      <Tabs.Screen name="pay-rent" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
