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
import Svg, { Circle } from 'react-native-svg';
import { Logo } from '../../components/brand/Logo';
import { Colors, Fonts, Shadow } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type FeatureItem = {
  icon: IoniconName;
  title: string;
  body: string;
  color: string;
  bg: string;
};

const FEATURES: FeatureItem[] = [
  {
    icon: 'receipt-outline',
    title: 'Rent & HRA receipts',
    body: 'Tax-ready receipts in one tap.',
    color: Colors.action,
    bg: Colors.actionSoft,
  },
  {
    icon: 'document-text-outline',
    title: 'L&L Agreement',
    body: 'Auto-generated, signed online.',
    color: Colors.success,
    bg: Colors.successSoft,
  },
  {
    icon: 'camera-outline',
    title: 'Move-in proof',
    body: 'Time-stamped room photos.',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    icon: 'construct-outline',
    title: 'Repairs',
    body: 'Track & close, no WhatsApp.',
    color: Colors.warning,
    bg: Colors.warningSoft,
  },
];

const ROLE_CARDS = [
  {
    role: 'landlord' as const,
    label: "I'm a Landlord",
    sub: 'Manage properties & collect rent',
    icon: 'business-outline' as IoniconName,
    color: Colors.action,
    bg: Colors.actionSoft,
    perks: [
      { icon: 'person-add-outline' as IoniconName, text: 'Set rent terms & invite tenants' },
      { icon: 'cash-outline' as IoniconName, text: 'Collect rent & confirm payments' },
      { icon: 'camera-outline' as IoniconName, text: 'Review proof photos & manage deposits' },
    ],
  },
  {
    role: 'tenant' as const,
    label: "I'm a Tenant",
    sub: 'Pay rent & manage your home',
    icon: 'home-outline' as IoniconName,
    color: Colors.success,
    bg: Colors.successSoft,
    perks: [
      { icon: 'link-outline' as IoniconName, text: 'Join your rental via invite link' },
      { icon: 'receipt-outline' as IoniconName, text: 'Pay UPI or cash, get HRA receipts' },
      { icon: 'construct-outline' as IoniconName, text: 'Raise repair requests with photos' },
    ],
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

  const handleGetStarted = () => router.push('/(auth)/login');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Nav ─────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingVertical: 14,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1, borderBottomColor: Colors.border,
        }}>
          <Logo variant="full" size={28} />
          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.8}
            style={{
              paddingHorizontal: 20, paddingVertical: 10,
              borderRadius: 20, borderWidth: 1.5,
              borderColor: Colors.primary,
            }}
          >
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero ─────────────────────────────────── */}
        <View style={{ backgroundColor: Colors.primary, overflow: 'hidden' }}>
          {/* Dot grid */}
          <Svg
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            width="100%"
            height="100%"
            viewBox="0 0 360 320"
            preserveAspectRatio="xMidYMid slice"
          >
            {Array.from({ length: 10 }, (_, row) =>
              Array.from({ length: 10 }, (_, col) => (
                <Circle
                  key={`${row}-${col}`}
                  cx={col * 40 + 10}
                  cy={row * 36 + 18}
                  r={1.8}
                  fill="rgba(255,255,255,0.22)"
                />
              ))
            )}
          </Svg>

          {/* Floating ghost receipt card */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', right: -8, top: 32,
              width: 128, opacity: 0.22,
              transform: [{ rotate: '9deg' }],
            }}
          >
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ width: 48, height: 6, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 3 }} />
                <View style={{ width: 24, height: 6, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 3 }} />
              </View>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 10 }} />
              {[68, 50, 78].map((w, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ width: w * 0.75, height: 5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 3 }} />
                  <View style={{ width: w * 0.38, height: 5, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 3 }} />
                </View>
              ))}
              <View style={{
                marginTop: 6, height: 26, borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <View style={{ width: 56, height: 5, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 3 }} />
              </View>
            </View>
          </View>

          {/* Hero text */}
          <View style={{ paddingHorizontal: 24, paddingTop: 44, paddingBottom: 0 }}>
            <View style={{
              alignSelf: 'flex-start',
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
              marginBottom: 24,
            }}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                Built for Indian rentals
              </Text>
            </View>

            <Text style={{
              color: Colors.surface, fontFamily: Fonts.sansSemiBold,
              fontSize: 40, lineHeight: 46, letterSpacing: -1.2, marginBottom: 2,
            }}>
              Your rental.
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.72)', fontFamily: Fonts.serifItalic,
              fontSize: 42, lineHeight: 50, letterSpacing: -0.5, marginBottom: 20,
            }}>
              On record.
            </Text>

            <Text style={{
              color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.sans,
              fontSize: 14, lineHeight: 22, marginBottom: 32, maxWidth: 285,
            }}>
              Flatvio connects landlords and tenants — rent tracking, HRA receipts, agreements, proof photos and repair requests in one shared workspace.
            </Text>

            <TouchableOpacity
              onPress={handleGetStarted}
              activeOpacity={0.88}
              style={{
                height: 60, borderRadius: 18,
                backgroundColor: Colors.surface,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 14,
                ...Shadow.card,
              }}
            >
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>
                Get Started
              </Text>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: Colors.primary,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="arrow-forward" size={15} color={Colors.surface} />
              </View>
            </TouchableOpacity>

            <Text style={{ color: 'rgba(255,255,255,0.35)', fontFamily: Fonts.sans, fontSize: 12, textAlign: 'center', marginBottom: 28 }}>
              Sign in with Google · Free · 2 minutes to set up
            </Text>
          </View>

          {/* Metric strip */}
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
            {[
              { icon: 'shield-checkmark-outline' as IoniconName, value: '₹0 fee', label: 'No transaction fee' },
              { icon: 'document-text-outline' as IoniconName, value: 'HRA ready', label: 'Tax-compliant receipts' },
              { icon: 'flag-outline' as IoniconName, value: 'India-first', label: 'INR · L&L · PAN' },
            ].map((m, i, arr) => (
              <View
                key={m.value}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 16,
                  borderRightWidth: i < arr.length - 1 ? 1 : 0,
                  borderRightColor: 'rgba(255,255,255,0.1)',
                  gap: 3,
                }}
              >
                <Ionicons name={m.icon} size={14} color="rgba(255,255,255,0.45)" />
                <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
                  {m.value}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.38)', fontFamily: Fonts.sans, fontSize: 10, textAlign: 'center', paddingHorizontal: 4 }}>
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Role picker ───────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6 }}>
            Who are you?
          </Text>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, lineHeight: 30, marginBottom: 18 }}>
            Pick your portal
          </Text>

          <View style={{ gap: 16 }}>
            {ROLE_CARDS.map((card) => {
              const sel = selectedRole === card.role;
              return (
                <TouchableOpacity
                  key={card.role}
                  onPress={() => handleRoleSelect(card.role)}
                  activeOpacity={0.88}
                  style={{
                    borderRadius: 24, overflow: 'hidden',
                    borderWidth: sel ? 2.5 : 1,
                    borderColor: sel ? card.color : Colors.border,
                    backgroundColor: Colors.surface,
                    ...(sel ? Shadow.card : {}),
                  }}
                >
                  {/* Header band */}
                  <View style={{
                    backgroundColor: sel ? card.color : card.bg,
                    paddingHorizontal: 20, paddingVertical: 18,
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                  }}>
                    <View style={{
                      width: 56, height: 56, borderRadius: 18,
                      backgroundColor: sel ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name={card.icon} size={28} color={sel ? '#fff' : card.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: sel ? '#fff' : card.color,
                        fontFamily: Fonts.sansSemiBold, fontSize: 19, lineHeight: 24,
                      }}>
                        {card.label}
                      </Text>
                      <Text style={{
                        color: sel ? 'rgba(255,255,255,0.72)' : Colors.ink3,
                        fontFamily: Fonts.sans, fontSize: 13, marginTop: 2,
                      }}>
                        {card.sub}
                      </Text>
                    </View>
                    <View style={{
                      width: 26, height: 26, borderRadius: 13,
                      backgroundColor: sel ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel
                        ? <Ionicons name="checkmark" size={15} color={card.color} />
                        : <Ionicons name="chevron-forward" size={14} color={card.color} />
                      }
                    </View>
                  </View>

                  {/* Perk list */}
                  <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 10 }}>
                    {card.perks.map((perk) => (
                      <View key={perk.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{
                          width: 28, height: 28, borderRadius: 9,
                          backgroundColor: sel ? card.bg : Colors.fill,
                          alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Ionicons name={perk.icon} size={14} color={sel ? card.color : Colors.muted} />
                        </View>
                        <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, flex: 1 }}>
                          {perk.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedRole && (
            <TouchableOpacity
              onPress={handleGetStarted}
              activeOpacity={0.85}
              style={{
                marginTop: 18, height: 58, borderRadius: 18,
                backgroundColor: Colors.primary,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                ...Shadow.card,
              }}
            >
              <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>
                Continue as {selectedRole === 'landlord' ? 'Landlord' : 'Tenant'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.surface} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Features 2×2 ────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 36 }}>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6 }}>
            What's included
          </Text>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, lineHeight: 30, marginBottom: 18 }}>
            Everything a rental needs.
          </Text>

          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1, gap: 14 }}>
              {FEATURES.slice(0, 2).map((f) => <FeatureTile key={f.title} f={f} />)}
            </View>
            <View style={{ flex: 1, gap: 14, marginTop: 24 }}>
              {FEATURES.slice(2).map((f) => <FeatureTile key={f.title} f={f} />)}
            </View>
          </View>
        </View>

        {/* ── Testimonial ─────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
          <View style={{
            backgroundColor: Colors.surface, borderRadius: 24,
            borderWidth: 1, borderColor: Colors.border,
            padding: 24,
            ...Shadow.card,
          }}>
            <Text style={{
              fontFamily: Fonts.serif, fontSize: 72, lineHeight: 54,
              color: Colors.action, opacity: 0.15, marginBottom: 4, marginLeft: -4,
            }}>
              "
            </Text>
            <View style={{ flexDirection: 'row', gap: 3, marginBottom: 14 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Ionicons key={i} name="star" size={15} color="#F59E0B" />
              ))}
            </View>
            <Text style={{
              color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 15,
              lineHeight: 24, marginBottom: 20,
            }}>
              "Finally, my tenant and I are on the same page. HRA receipts, move-in photos, everything in one place. No more WhatsApp back-and-forth."
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: Colors.actionSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: Colors.action, fontFamily: Fonts.sansBold, fontSize: 17 }}>R</Text>
              </View>
              <View>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>Ravi K.</Text>
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>Landlord · Bangalore</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Bottom CTA ──────────────────────────── */}
        <View style={{
          marginHorizontal: 20, marginTop: 32,
          backgroundColor: Colors.primary, borderRadius: 28,
          padding: 28, alignItems: 'center', overflow: 'hidden',
        }}>
          <View pointerEvents="none" style={{
            position: 'absolute', top: -70, right: -70,
            width: 200, height: 200, borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }} />
          <View pointerEvents="none" style={{
            position: 'absolute', bottom: -80, left: -60,
            width: 180, height: 180, borderRadius: 90,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }} />

          <View style={{
            width: 64, height: 64, borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center', justifyContent: 'center', marginBottom: 18,
          }}>
            <Ionicons name="home-outline" size={32} color="rgba(255,255,255,0.9)" />
          </View>

          <Text style={{
            color: Colors.surface, fontFamily: Fonts.sansSemiBold,
            fontSize: 24, lineHeight: 30, textAlign: 'center', marginBottom: 10,
          }}>
            Set up your rental{'\n'}in 2 minutes.
          </Text>
          <Text style={{
            color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.sans,
            fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 26,
          }}>
            Add a property, invite your tenant, and start tracking rent from day one.
          </Text>

          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.88}
            style={{
              width: '100%', height: 58, borderRadius: 18,
              backgroundColor: Colors.surface,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <Ionicons name="logo-google" size={18} color={Colors.action} />
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
              Get Started — Sign in with Google
            </Text>
          </TouchableOpacity>

          <Text style={{ color: 'rgba(255,255,255,0.28)', fontFamily: Fonts.sans, fontSize: 11, marginTop: 14 }}>
            Free · No credit card · Android, iOS & Web
          </Text>
        </View>

        {/* ── Footer ──────────────────────────────── */}
        <View style={{ paddingTop: 32, paddingBottom: 8, alignItems: 'center', gap: 6 }}>
          <Logo variant="full" size={22} />
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
            flatvio.in · Made for Indian rentals
          </Text>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 4 }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>Privacy Policy</Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>Terms of Use</Text>
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

function FeatureTile({ f }: { f: FeatureItem }) {
  return (
    <View style={{
      backgroundColor: Colors.surface, borderRadius: 22,
      borderWidth: 1, borderColor: Colors.border,
      padding: 18,
      ...Shadow.card,
    }}>
      <View style={{
        width: 54, height: 54, borderRadius: 18,
        backgroundColor: f.bg,
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <Ionicons name={f.icon} size={27} color={f.color} />
      </View>
      <Text style={{
        color: Colors.primary, fontFamily: Fonts.sansSemiBold,
        fontSize: 14, lineHeight: 19, marginBottom: 5,
      }}>
        {f.title}
      </Text>
      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17 }}>
        {f.body}
      </Text>
    </View>
  );
}
