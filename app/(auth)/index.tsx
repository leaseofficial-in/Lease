import React, { useEffect } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/brand/Logo';
import { HeroLoop } from '../../components/brand/HeroLoop';
import { Cap, DisplayText, SerifItalic } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(280, Math.min(448, width - 48));

  useEffect(() => {
    if (role === 'landlord' || role === 'tenant') {
      void AsyncStorage.setItem('flatvio.pending_role', role);
    }
  }, [role]);

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
            <View style={{ gap: 12, marginBottom: 24 }}>
              {([
                ['camera-outline', 'Move-in and move-out proof photos'],
                ['receipt-outline', 'Monthly rent tracking for both sides'],
                ['construct-outline', 'Maintenance requests with live status'],
              ] as [React.ComponentProps<typeof Ionicons>['name'], string][]).map(([icon, text]) => (
                <View key={text} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: Colors.surface,
                      borderWidth: 1, borderColor: Colors.border,
                      alignItems: 'center', justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={icon} size={18} color={Colors.action} />
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
