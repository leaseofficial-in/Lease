import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

function TabIcon({
  mark,
  label,
  focused,
  featured = false,
}: {
  mark: string;
  label: string;
  focused: boolean;
  featured?: boolean;
}) {
  return (
    <View className="items-center pt-1" style={featured ? { transform: [{ translateY: -8 }] } : undefined}>
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: featured ? 42 : 24,
          height: featured ? 42 : 24,
          backgroundColor: focused || featured ? Colors.primary : Colors.fill,
          borderColor: focused || featured ? Colors.primary : Colors.border,
          borderWidth: 1,
        }}
      >
        <Text
          style={{
            color: focused || featured ? Colors.surface : Colors.ink3,
            fontFamily: Fonts.sansSemiBold,
            fontSize: featured ? 18 : 10,
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

export default function LandlordLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 66 : 78,
          paddingBottom: Platform.OS === 'web' ? 6 : 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon mark="P" label="Places" focused={focused} /> }}
      />
      <Tabs.Screen
        name="create-rental"
        options={{ tabBarIcon: ({ focused }) => <TabIcon mark="+" label="Add" focused={focused} featured /> }}
      />
      <Tabs.Screen
        name="payments"
        options={{ tabBarIcon: ({ focused }) => <TabIcon mark="R" label="Rent" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon mark="Y" label="You" focused={focused} /> }}
      />
      <Tabs.Screen name="property/[id]" options={{ href: null }} />
      <Tabs.Screen name="proof/[rentalId]" options={{ href: null }} />
      <Tabs.Screen name="repairs/[rentalId]" options={{ href: null }} />
    </Tabs>
  );
}
