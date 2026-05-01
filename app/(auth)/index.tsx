import React from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const heroHeight = Math.max(320, Math.min(height * 0.4, 420));
  const contentWidth = Math.max(280, Math.min(448, width - 48));

  return (
    <View className="flex-1 bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-primary overflow-hidden" style={{ minHeight: heroHeight }}>
          <View
            className="absolute bg-action/20 rounded-full"
            style={{ width: 300, height: 300, top: -80, right: -60 }}
          />
          <View
            className="absolute bg-success/10 rounded-full"
            style={{ width: 200, height: 200, top: 80, left: -40 }}
          />

          <SafeAreaView edges={['top']}>
            <View className="px-8 pt-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-action items-center justify-center mr-2">
                  <Text className="text-white text-lg font-bold">F</Text>
                </View>
                <Text className="text-white text-xl font-bold">Flatvio</Text>
              </View>
            </View>
          </SafeAreaView>

          <View className="flex-1 items-center justify-center px-8 py-8">
            <Text className="text-5xl font-bold text-white text-center leading-tight">
              Renting{'\n'}made{'\n'}
              <Text className="text-action">trustworthy.</Text>
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-t-3xl px-6 pt-6">
          <SafeAreaView edges={['bottom']}>
            <View className="self-center" style={{ width: contentWidth }}>
            <Text className="text-2xl font-bold text-primary mb-2">
              Welcome to Flatvio
            </Text>
            <Text
              className="text-base text-muted mb-6 leading-6"
              style={{ flexShrink: 1, width: contentWidth }}
            >
              The all-in-one app for landlords and tenants.{'\n'}
              Manage rent, deposits, move-in proof,{'\n'}
              and repair requests - all in one place.
            </Text>

            <View className="gap-3 mb-6">
              {[
                ['Photo', 'Move-in & move-out photo proof'],
                ['Rent', 'Online rent collection via UPI'],
                ['Fix', 'Repair request tracking'],
                ['Docs', 'Digital rental agreements'],
              ].map(([label, text]) => (
                <View key={text} className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                    <Text className="text-xs font-semibold text-action">{label}</Text>
                  </View>
                  <Text className="text-sm text-primary flex-1">{text}</Text>
                </View>
              ))}
            </View>

            <Button
              title="Get Started"
              onPress={() => router.push('/(auth)/login')}
              fullWidth
              size="lg"
              style={{ width: contentWidth }}
            />
            <Text
              className="text-xs text-muted text-center mt-4"
              style={{ flexShrink: 1, width: contentWidth }}
            >
              By continuing you agree to our Terms of Service and Privacy Policy
            </Text>
            </View>
          </SafeAreaView>
        </View>
      </ScrollView>
    </View>
  );
}
