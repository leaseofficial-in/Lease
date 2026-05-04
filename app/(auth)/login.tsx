import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Fonts } from '../../constants/theme';
import { Cap, DisplayText, SerifItalic } from '../../components/ui/V2';
import { Logo } from '../../components/brand/Logo';

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
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: Colors.fill,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 36,
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>

        <View style={{ marginBottom: 52 }}>
          <View
            style={{
              width: 52, height: 52, borderRadius: 16,
              backgroundColor: Colors.primary,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 22,
            }}
          >
            <Logo variant="symbol" inverse size={30} />
          </View>
          <Cap style={{ marginBottom: 8 }}>Welcome back</Cap>
          <DisplayText style={{ fontSize: 40, lineHeight: 42, marginBottom: 12 }}>
            Sign in{'\n'}<SerifItalic>to Flatvio.</SerifItalic>
          </DisplayText>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 23 }}>
            Use your Google account to sign in or create a Flatvio account instantly.
          </Text>
        </View>

        {/* Google sign-in */}
        <TouchableOpacity
          onPress={() => void handleGoogleLogin()}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            height: 56,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: Colors.border,
            backgroundColor: Colors.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {loading ? (
            <ActivityIndicator color={Colors.action} />
          ) : (
            <>
              <View
                style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: Colors.fill,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontFamily: Fonts.sansBold, color: '#4285F4' }}>G</Text>
              </View>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {error ? (
          <View
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: Colors.dangerSoft,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: Colors.danger, fontFamily: Fonts.sans, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              {error}
            </Text>
          </View>
        ) : null}

        <Text
          style={{
            color: Colors.muted,
            fontFamily: Fonts.sans,
            fontSize: 12,
            textAlign: 'center',
            marginTop: 'auto',
            lineHeight: 18,
          }}
        >
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}
