import React from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/brand/Logo';
import { HeroLoop } from '../../components/brand/HeroLoop';
import { Cap, DisplayText, SerifItalic } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(280, Math.min(448, width - 48));

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-4 pb-5">
          <Logo variant="full" size={42} />
        </View>

        <View className="px-6">
          <Cap style={{ marginBottom: 12 }}>Flatvio / Est 2026</Cap>
          <DisplayText style={{ fontSize: 54, lineHeight: 55 }}>
            Renting,{'\n'}finally <SerifItalic>trustworthy.</SerifItalic>
          </DisplayText>
          <Text
            style={{
              color: Colors.ink3,
              fontFamily: Fonts.sans,
              fontSize: 15,
              lineHeight: 23,
              marginTop: 14,
              maxWidth: 560,
            }}
          >
            Move in with proof, rent with clarity, and keep every agreement traceable from
            the first key handoff.
          </Text>
        </View>

        <View className="px-6 pt-7">
          <HeroLoop />
        </View>

        <View className="px-6 pt-6">
          <View className="self-center" style={{ width: contentWidth }}>
            <View className="gap-3 mb-6">
              {[
                ['Proof', 'Move-in and move-out records'],
                ['Rent', 'Monthly tracking for both sides'],
                ['Repairs', 'Maintenance requests with status'],
              ].map(([label, text]) => (
                <View key={text} className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-white border border-border items-center justify-center mr-3">
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 11 }}>
                      {label.slice(0, 2)}
                    </Text>
                  </View>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 14, flex: 1 }}>
                    {text}
                  </Text>
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
              style={{
                color: Colors.muted,
                fontFamily: Fonts.mono,
                fontSize: 10,
                letterSpacing: 1,
                lineHeight: 16,
                marginTop: 14,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              By continuing / Terms / Privacy
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
