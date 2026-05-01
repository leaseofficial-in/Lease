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

export default function LandlordLayout() {
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
        options={{ tabBarIcon: ({ focused }) => <TabIcon shortLabel="PR" label="Properties" focused={focused} /> }}
      />
      <Tabs.Screen
        name="payments"
        options={{ tabBarIcon: ({ focused }) => <TabIcon shortLabel="PA" label="Payments" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon shortLabel="ME" label="Profile" focused={focused} /> }}
      />
      <Tabs.Screen name="create-rental" options={{ href: null }} />
      <Tabs.Screen name="property/[id]" options={{ href: null }} />
      <Tabs.Screen name="proof/[rentalId]" options={{ href: null }} />
    </Tabs>
  );
}
