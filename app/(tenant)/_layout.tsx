import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text style={{ fontSize: Platform.OS === 'web' ? 18 : 22 }}>{emoji}</Text>
      <Text
        className="text-xs mt-0.5"
        style={{ color: focused ? Colors.action : Colors.muted, fontWeight: focused ? '600' : '400' }}
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
          backgroundColor: '#fff',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 60 : 72,
          paddingBottom: Platform.OS === 'web' ? 6 : 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏡" label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="repairs"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" label="Repairs" focused={focused} /> }}
      />
      <Tabs.Screen
        name="deposit"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏦" label="Deposit" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }}
      />
      <Tabs.Screen name="join" options={{ href: null }} />
      <Tabs.Screen name="proof/upload" options={{ href: null }} />
      <Tabs.Screen name="agreement" options={{ href: null }} />
      <Tabs.Screen name="rent-history" options={{ href: null }} />
      <Tabs.Screen name="pay-rent" options={{ href: null }} />
    </Tabs>
  );
}
