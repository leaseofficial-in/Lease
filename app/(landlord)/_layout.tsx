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

export default function LandlordLayout() {
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
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Properties" focused={focused} /> }}
      />
      <Tabs.Screen
        name="payments"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💰" label="Payments" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }}
      />
      <Tabs.Screen name="create-rental" options={{ href: null }} />
      <Tabs.Screen name="property/[id]" options={{ href: null }} />
      <Tabs.Screen name="proof/[rentalId]" options={{ href: null }} />
    </Tabs>
  );
}
