import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Fonts } from '../../constants/theme';
import { Cap, DisplayText, SerifItalic } from '../../components/ui/V2';
import { Logo } from '../../components/brand/Logo';
import {
  DEV_AUTH_INPUT_PHONE,
  DEV_AUTH_OTP,
  isDevAuthEnabled,
} from '../../lib/devAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle, signInWithDevOtp } = useAuthStore();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'demo' | null>(null);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoadingProvider('google');
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoadingProvider('demo');
    try {
      await signInWithDevOtp(DEV_AUTH_INPUT_PHONE, DEV_AUTH_OTP);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Local demo login failed.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ flex: 1, backgroundColor: Colors.surface }}>
      <View className="flex-1 px-6 pt-4 pb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-fill items-center justify-center mb-10"
          activeOpacity={0.75}
        >
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>{'<'}</Text>
        </TouchableOpacity>

        <View className="mb-10">
          <View className="w-12 h-12 rounded-2xl bg-primary items-center justify-center mb-5">
            <Logo variant="symbol" inverse size={30} />
          </View>
          <Cap style={{ marginBottom: 8 }}>Welcome back</Cap>
          <DisplayText style={{ fontSize: 42, lineHeight: 43, marginBottom: 12 }}>
            Sign in <SerifItalic>to Flatvio.</SerifItalic>
          </DisplayText>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 }}>
            Continue with Google for now. Phone OTP can be enabled later when Twilio is ready.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={loadingProvider !== null}
          activeOpacity={0.85}
          className="h-14 rounded-2xl border border-border bg-white flex-row items-center justify-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {loadingProvider === 'google' ? (
            <ActivityIndicator color={Colors.action} />
          ) : (
            <>
              <View className="w-7 h-7 rounded-full bg-fill items-center justify-center mr-3">
                <Text className="text-sm font-bold text-primary">G</Text>
              </View>
              <Text className="text-base font-semibold text-primary">Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {isDevAuthEnabled() && (
          <View className="mt-4">
            <Button
              title="Use Local Demo Account"
              variant="secondary"
              onPress={handleDemoLogin}
              loading={loadingProvider === 'demo'}
              disabled={loadingProvider !== null}
              fullWidth
              size="lg"
            />
            <Text className="text-xs text-muted text-center mt-2">
              Demo login uses {DEV_AUTH_INPUT_PHONE} / {DEV_AUTH_OTP}.
            </Text>
          </View>
        )}

        {error ? (
          <Text className="text-sm text-danger text-center mt-6 leading-5">{error}</Text>
        ) : null}

        <Text className="text-xs text-muted text-center mt-auto leading-5">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}
