import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

function TabIcon({ mark, label, focused }: { mark: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: 24,
          height: 24,
          backgroundColor: focused ? Colors.primary : Colors.fill,
          borderColor: focused ? Colors.primary : Colors.border,
          borderWidth: 1,
        }}
      >
        <Text
          style={{
            color: focused ? Colors.surface : Colors.ink3,
            fontFamily: Fonts.sansSemiBold,
            fontSize: 10,
          }}
        >
          {mark}
        </Text>
      </View>
      <Text
        className="mt-0.5"
        style={{
          color: focused ? Colors.primary : Colors.muted,
          fontFamily: focused ? Fonts.sansSemiBold : Fonts.sans,
          fontSize: 10,
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
          height: Platform.OS === 'web' ? 64 : 76,
          paddingBottom: Platform.OS === 'web' ? 6 : 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon mark="H" label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="rent-history"
        options={{ tabBarIcon: ({ focused }) => <TabIcon mark="R" label="Rent" focused={focused} /> }}
      />
      <Tabs.Screen
        name="deposit"
        options={{ tabBarIcon: ({ focused }) => <TabIcon mark="D" label="Deposit" focused={focused} /> }}
      />
      <Tabs.Screen
        name="repairs"
        options={{ tabBarIcon: ({ focused }) => <TabIcon mark="M" label="Repairs" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon mark="Y" label="You" focused={focused} /> }}
      />
      <Tabs.Screen name="join" options={{ href: null }} />
      <Tabs.Screen name="proof/upload" options={{ href: null }} />
      <Tabs.Screen name="agreement" options={{ href: null }} />
      <Tabs.Screen name="pay-rent" options={{ href: null }} />
    </Tabs>
  );
}
