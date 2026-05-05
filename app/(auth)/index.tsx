import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '../../components/brand/Logo';
import { Colors, Fonts } from '../../constants/theme';

type FeatureItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  color: string;
  bg: string;
};

const FEATURES: FeatureItem[] = [
  {
    icon: 'receipt-outline',
    title: 'Rent collection & HRA receipts',
    body: 'Track every payment, mark it paid or overdue, and generate tax-ready HRA receipts in one tap.',
    color: Colors.action,
    bg: Colors.actionSoft,
  },
  {
    icon: 'document-text-outline',
    title: 'Leave & License agreement',
    body: 'Auto-generate a signed rental agreement with all terms — rent, deposit, dates, and clauses.',
    color: Colors.success,
    bg: Colors.successSoft,
  },
  {
    icon: 'camera-outline',
    title: 'Move-in & move-out proof',
    body: 'Tenants upload room photos at check-in and check-out. Both sides keep a time-stamped record.',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    icon: 'construct-outline',
    title: 'Repairs & maintenance',
    body: 'Tenants raise requests with photos. Landlords track, update, and close them — no more lost WhatsApp threads.',
    color: Colors.warning,
    bg: Colors.warningSoft,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { role, ref } = useLocalSearchParams<{ role?: string; ref?: string }>();

  useEffect(() => {
    if (role === 'landlord' || role === 'tenant') {
      void AsyncStorage.setItem('flatvio.pending_role', role);
    }
    if (typeof ref === 'string' && ref.trim()) {
      void AsyncStorage.setItem('flatvio.pending_referrer_tenant', ref.trim());
    }
  }, [ref, role]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Nav bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            backgroundColor: Colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <Logo variant="full" size={28} />
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: Colors.primary,
              backgroundColor: Colors.surface,
            }}
          >
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View
          style={{
            backgroundColor: Colors.primary,
            paddingHorizontal: 24,
            paddingTop: 40,
            paddingBottom: 44,
          }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 5,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: Fonts.sansMedium, fontSize: 12 }}>
              For landlords & tenants in India
            </Text>
          </View>

          <Text
            style={{
              color: Colors.surface,
              fontFamily: Fonts.sansSemiBold,
              fontSize: 34,
              lineHeight: 40,
              letterSpacing: -0.5,
              marginBottom: 14,
            }}
          >
            Manage your rental{'\n'}without the chaos.
          </Text>

          <Text
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontFamily: Fonts.sans,
              fontSize: 15,
              lineHeight: 23,
              marginBottom: 32,
            }}
          >
            Flatvio gives landlords and tenants a shared workspace for rent tracking, agreements, proof photos, deposit records, and repair requests — all in one place.
          </Text>

          {/* Primary CTA */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
            style={{
              height: 54,
              borderRadius: 16,
              backgroundColor: Colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
              Get Started — it's free
            </Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>

          <Text
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontFamily: Fonts.sans,
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Sign in with Google · No credit card needed
          </Text>
        </View>

        {/* Stats row */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: Colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          {[
            { value: '2 sides', label: 'Landlord & Tenant portals' },
            { value: 'HRA ready', label: 'Tax-compliant receipts' },
            { value: 'India-first', label: 'INR, L&L, PAN support' },
          ].map((stat, i, arr) => (
            <View
              key={stat.value}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 16,
                borderRightWidth: i < arr.length - 1 ? 1 : 0,
                borderRightColor: Colors.border,
              }}
            >
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 13, marginBottom: 2 }}>
                {stat.value}
              </Text>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 10, textAlign: 'center', paddingHorizontal: 4 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8 }}>
          <Text
            style={{
              color: Colors.muted,
              fontFamily: Fonts.sansSemiBold,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            What's included
          </Text>
          <Text
            style={{
              color: Colors.primary,
              fontFamily: Fonts.sansSemiBold,
              fontSize: 22,
              lineHeight: 28,
              marginBottom: 20,
            }}
          >
            Everything a rental needs,{'\n'}nothing it doesn't.
          </Text>

          <View style={{ gap: 12 }}>
            {FEATURES.map((f) => (
              <View
                key={f.title}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  padding: 18,
                  flexDirection: 'row',
                  gap: 14,
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: f.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name={f.icon} size={20} color={f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: Colors.primary,
                      fontFamily: Fonts.sansSemiBold,
                      fontSize: 14,
                      lineHeight: 20,
                      marginBottom: 4,
                    }}
                  >
                    {f.title}
                  </Text>
                  <Text
                    style={{
                      color: Colors.ink3,
                      fontFamily: Fonts.sans,
                      fontSize: 13,
                      lineHeight: 19,
                    }}
                  >
                    {f.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Who it's for */}
        <View style={{ paddingHorizontal: 20, paddingTop: 28, gap: 12 }}>
          <Text
            style={{
              color: Colors.muted,
              fontFamily: Fonts.sansSemiBold,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            Two portals, one app
          </Text>

          {[
            {
              role: 'Landlord',
              icon: 'business-outline' as const,
              color: Colors.action,
              bg: Colors.actionSoft,
              points: [
                'Track rent across all properties',
                'Generate agreements & receipts',
                'Review move-in/out proof photos',
                'Manage deposit deductions',
              ],
            },
            {
              role: 'Tenant',
              icon: 'home-outline' as const,
              color: Colors.success,
              bg: Colors.successSoft,
              points: [
                'Pay rent and download HRA receipts',
                'Sign your agreement digitally',
                'Upload move-in photos on day one',
                'Raise repair requests with photos',
              ],
            },
          ].map((card) => (
            <View
              key={card.role}
              style={{
                backgroundColor: Colors.surface,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: Colors.border,
                padding: 18,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    backgroundColor: card.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={card.icon} size={18} color={card.color} />
                </View>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
                  {card.role}
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {card.points.map((p) => (
                  <View key={p} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: card.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    >
                      <Ionicons name="checkmark" size={11} color={card.color} />
                    </View>
                    <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, flex: 1 }}>
                      {p}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 32,
            backgroundColor: Colors.primary,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: Colors.surface,
              fontFamily: Fonts.sansSemiBold,
              fontSize: 20,
              lineHeight: 26,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Ready to simplify your rental?
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontFamily: Fonts.sans,
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 22,
              lineHeight: 21,
            }}
          >
            Set up your first property in under 5 minutes.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 14,
              backgroundColor: Colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
              Get Started
            </Text>
            <Ionicons name="arrow-forward" size={17} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ paddingTop: 28, paddingBottom: 8, alignItems: 'center', gap: 6 }}>
          <Logo variant="full" size={22} />
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
            flatvio.in · Made for Indian rentals
          </Text>
          {Platform.OS === 'web' && (
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
              © {new Date().getFullYear()} Flatvio
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
