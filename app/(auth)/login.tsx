import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Fonts, Shadow } from '../../constants/theme';
import { Logo } from '../../components/brand/Logo';

const TRUST_ITEMS = [
  { icon: 'lock-closed-outline' as const, label: 'Private & secure' },
  { icon: 'shield-checkmark-outline' as const, label: 'No spam, ever' },
  { icon: 'person-outline' as const, label: 'Delete anytime' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: Colors.surface }}>
      <View style={{ flex: 1 }}>

        {/* ── Dark header section ───────────────────── */}
        <View style={{ backgroundColor: Colors.primary, paddingTop: 16, paddingBottom: 40, overflow: 'hidden' }}>
          {/* Dot grid decoration */}
          <Svg
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            width="100%"
            height="100%"
            viewBox="0 0 360 200"
            preserveAspectRatio="xMidYMid slice"
          >
            {Array.from({ length: 7 }, (_, row) =>
              Array.from({ length: 10 }, (_, col) => (
                <Circle
                  key={`${row}-${col}`}
                  cx={col * 40 + 10}
                  cy={row * 32 + 16}
                  r={1.6}
                  fill="rgba(255,255,255,0.18)"
                />
              ))
            )}
          </Svg>

          {/* Decorative circles */}
          <View pointerEvents="none" style={{
            position: 'absolute', top: -50, right: -50,
            width: 160, height: 160, borderRadius: 80,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }} />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginLeft: 20, marginBottom: 28,
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center',
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {/* Logo + headline */}
          <View style={{ paddingHorizontal: 28 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Logo variant="symbol" inverse size={32} />
            </View>

            <Text style={{
              color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.mono,
              fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
            }}>
              Welcome back
            </Text>
            <Text style={{
              color: Colors.surface, fontFamily: Fonts.sansSemiBold,
              fontSize: 36, lineHeight: 42, letterSpacing: -1, marginBottom: 4,
            }}>
              Sign in
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.serifItalic,
              fontSize: 36, lineHeight: 42, letterSpacing: -0.5,
            }}>
              to RentyBase.
            </Text>
          </View>
        </View>

        {/* ── Form section ─────────────────────────── */}
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 }}>
          <Text style={{
            color: Colors.ink3, fontFamily: Fonts.sans,
            fontSize: 15, lineHeight: 23, marginBottom: 28,
          }}>
            Use your Google account to sign in or create a RentyBase account instantly.
          </Text>

          {/* Trust badges */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {TRUST_ITEMS.map((item) => (
              <View
                key={item.label}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  backgroundColor: Colors.successSoft,
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
                }}
              >
                <Ionicons name={item.icon} size={12} color={Colors.success} />
                <Text style={{ color: Colors.success, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Google sign-in button */}
          <TouchableOpacity
            onPress={() => void handleGoogleLogin()}
            disabled={loading}
            activeOpacity={0.88}
            style={{
              height: 60, borderRadius: 18,
              borderWidth: 1.5, borderColor: Colors.border,
              backgroundColor: Colors.surface,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14,
              marginBottom: 16,
              ...Shadow.card,
            }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.action} />
            ) : (
              <>
                {/* Google G */}
                <View style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: Colors.fill,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="logo-google" size={18} color="#4285F4" />
                </View>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Error */}
          {error ? (
            <View style={{
              padding: 14, backgroundColor: Colors.dangerSoft,
              borderRadius: 14, borderWidth: 1, borderColor: '#F5B8B5',
              flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            }}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={{ color: Colors.danger, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Legal */}
          <Text style={{
            color: Colors.muted, fontFamily: Fonts.sans,
            fontSize: 12, textAlign: 'center',
            marginTop: 'auto', lineHeight: 18,
          }}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
