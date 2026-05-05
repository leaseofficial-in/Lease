import React, { useEffect, useState } from 'react';
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
    title: 'Rent & HRA receipts',
    body: 'Track payments, mark paid or overdue, get tax-ready HRA receipts.',
    color: Colors.action,
    bg: Colors.actionSoft,
  },
  {
    icon: 'document-text-outline',
    title: 'Leave & License agreement',
    body: 'Auto-generate a signed agreement with all terms in one tap.',
    color: Colors.success,
    bg: Colors.successSoft,
  },
  {
    icon: 'camera-outline',
    title: 'Move-in & move-out proof',
    body: 'Time-stamped room photos at check-in and check-out. No disputes.',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    icon: 'construct-outline',
    title: 'Repairs & maintenance',
    body: 'Photo-backed requests. Track and close — no lost WhatsApp threads.',
    color: Colors.warning,
    bg: Colors.warningSoft,
  },
];

const ROLE_CARDS = [
  {
    role: 'landlord' as const,
    label: 'I\'m a Landlord',
    sub: 'Manage properties, rent & tenants',
    icon: 'business-outline' as const,
    color: Colors.action,
    bg: Colors.actionSoft,
    border: Colors.action,
  },
  {
    role: 'tenant' as const,
    label: 'I\'m a Tenant',
    sub: 'Pay rent, view agreement & raise requests',
    icon: 'home-outline' as const,
    color: Colors.success,
    bg: Colors.successSoft,
    border: Colors.success,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { role, ref } = useLocalSearchParams<{ role?: string; ref?: string }>();
  const [selectedRole, setSelectedRole] = useState<'landlord' | 'tenant' | null>(null);

  useEffect(() => {
    if (role === 'landlord' || role === 'tenant') {
      setSelectedRole(role);
      void AsyncStorage.setItem('flatvio.pending_role', role);
    }
    if (typeof ref === 'string' && ref.trim()) {
      void AsyncStorage.setItem('flatvio.pending_referrer_tenant', ref.trim());
    }
  }, [ref, role]);

  const handleRoleSelect = async (r: 'landlord' | 'tenant') => {
    setSelectedRole(r);
    await AsyncStorage.setItem('flatvio.pending_role', r);
  };

  const handleGetStarted = () => {
    router.push('/(auth)/login');
  };

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
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: Colors.primary,
              backgroundColor: Colors.surface,
            }}
          >
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
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
              Built for Indian rentals
            </Text>
          </View>

          <Text
            style={{
              color: Colors.surface,
              fontFamily: Fonts.sansSemiBold,
              fontSize: 36,
              lineHeight: 42,
              letterSpacing: -0.8,
              marginBottom: 14,
            }}
          >
            Your rental.{'\n'}On record.
          </Text>

          <Text
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontFamily: Fonts.sans,
              fontSize: 15,
              lineHeight: 24,
              marginBottom: 32,
            }}
          >
            Flatvio connects landlords and tenants — rent tracking, HRA receipts, agreements, deposit records, and repair requests in one shared workspace.
          </Text>

          {/* Primary CTA */}
          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.85}
            style={{
              height: 60,
              borderRadius: 16,
              backgroundColor: Colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>
              Get Started
            </Text>
            <Ionicons name="arrow-forward" size={19} color={Colors.primary} />
          </TouchableOpacity>

          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontFamily: Fonts.sans,
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Sign in with Google · Free to use · Takes 2 minutes
          </Text>
        </View>

        {/* Trust bar */}
        <View
          style={{
            backgroundColor: Colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
            paddingHorizontal: 20,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="location-outline" size={14} color={Colors.muted} />
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, flex: 1 }}>
            Used by landlords and tenants across Bangalore, Hyderabad, Mumbai, Pune, and more
          </Text>
        </View>

        {/* Role selector */}
        <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
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
            Who are you?
          </Text>
          <Text
            style={{
              color: Colors.primary,
              fontFamily: Fonts.sansSemiBold,
              fontSize: 20,
              lineHeight: 26,
              marginBottom: 16,
            }}
          >
            Pick your portal
          </Text>

          <View style={{ gap: 12 }}>
            {ROLE_CARDS.map((card) => {
              const isSelected = selectedRole === card.role;
              return (
                <TouchableOpacity
                  key={card.role}
                  onPress={() => handleRoleSelect(card.role)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: isSelected ? card.bg : Colors.surface,
                    borderRadius: 18,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? card.border : Colors.border,
                    padding: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: isSelected ? card.color : card.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Ionicons
                      name={card.icon}
                      size={22}
                      color={isSelected ? Colors.surface : card.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: Colors.primary,
                        fontFamily: Fonts.sansSemiBold,
                        fontSize: 16,
                        lineHeight: 22,
                        marginBottom: 2,
                      }}
                    >
                      {card.label}
                    </Text>
                    <Text
                      style={{
                        color: Colors.muted,
                        fontFamily: Fonts.sans,
                        fontSize: 13,
                        lineHeight: 18,
                      }}
                    >
                      {card.sub}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={card.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedRole && (
            <TouchableOpacity
              onPress={handleGetStarted}
              activeOpacity={0.85}
              style={{
                marginTop: 16,
                height: 56,
                borderRadius: 16,
                backgroundColor: Colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
                Continue as {selectedRole === 'landlord' ? 'Landlord' : 'Tenant'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.surface} />
            </TouchableOpacity>
          )}
        </View>

        {/* Features */}
        <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 8 }}>
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
              fontSize: 20,
              lineHeight: 26,
              marginBottom: 16,
            }}
          >
            Everything a rental needs.
          </Text>

          <View style={{ gap: 10 }}>
            {FEATURES.map((f) => (
              <View
                key={f.title}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  gap: 14,
                  alignItems: 'center',
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
                      marginBottom: 2,
                    }}
                  >
                    {f.title}
                  </Text>
                  <Text
                    style={{
                      color: Colors.muted,
                      fontFamily: Fonts.sans,
                      fontSize: 12,
                      lineHeight: 17,
                    }}
                  >
                    {f.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonial */}
        <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 20,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Ionicons key={i} name="star" size={14} color="#F59E0B" />
              ))}
            </View>
            <Text
              style={{
                color: Colors.primary,
                fontFamily: Fonts.sans,
                fontSize: 14,
                lineHeight: 22,
                marginBottom: 14,
              }}
            >
              "Finally, my tenant and I are on the same page. Rent receipts for HRA, move-in photos, everything is in one place. No more WhatsApp back-and-forth."
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: Colors.actionSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>R</Text>
              </View>
              <View>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
                  Ravi K.
                </Text>
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                  Landlord, Bangalore
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom CTA */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 28,
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
              fontSize: 22,
              lineHeight: 28,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Set up your rental{'\n'}in 2 minutes.
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontFamily: Fonts.sans,
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 22,
              lineHeight: 21,
            }}
          >
            Add your property, invite your tenant, and start tracking rent from day one.
          </Text>
          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.85}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 14,
              backgroundColor: Colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
              Get Started — Sign in with Google
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontFamily: Fonts.sans,
              fontSize: 11,
              marginTop: 10,
            }}
          >
            Free · No credit card · Works on Android, iOS & web
          </Text>
        </View>

        {/* Footer */}
        <View style={{ paddingTop: 28, paddingBottom: 8, alignItems: 'center', gap: 6 }}>
          <Logo variant="full" size={22} />
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
            flatvio.in · Made for Indian rentals
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
              Privacy Policy
            </Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
              Terms of Use
            </Text>
          </View>
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
