import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { Colors } from '../../constants/theme';

function TabIcon({
  shortLabel,
  label,
  focused,
}: {
  shortLabel: string;
  label: string;
  focused: boolean;
}) {
  return (
    <View className="items-center pt-1">
      <View className={`w-8 h-8 rounded-xl items-center justify-center ${focused ? 'bg-blue-50' : 'bg-transparent'}`}>
        <Text className="text-xs font-bold" style={{ color: focused ? Colors.action : Colors.muted }}>
          {shortLabel}
        </Text>
      </View>
      <Text
        className={`text-xs mt-0.5 ${focused ? 'font-semibold' : 'font-normal'}`}
        style={{ color: focused ? Colors.action : Colors.muted }}
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
          height: 72,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon shortLabel="HM" label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="repairs"
        options={{ tabBarIcon: ({ focused }) => <TabIcon shortLabel="FX" label="Repairs" focused={focused} /> }}
      />
      <Tabs.Screen
        name="deposit"
        options={{ tabBarIcon: ({ focused }) => <TabIcon shortLabel="DP" label="Deposit" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon shortLabel="ME" label="Profile" focused={focused} /> }}
      />
      <Tabs.Screen name="join" options={{ href: null }} />
      <Tabs.Screen name="proof/upload" options={{ href: null }} />
      <Tabs.Screen name="agreement" options={{ href: null }} />
      <Tabs.Screen name="rent-history" options={{ href: null }} />
      <Tabs.Screen name="pay-rent" options={{ href: null }} />
    </Tabs>
  );
}
