import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createSessionFromOAuthUrl } from '../../lib/oauth';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts } from '../../constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const setSession = useAuthStore((state) => state.setSession);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const [errorMessage, setErrorMessage] = useState('');
  const startedRef = useRef(false);

  const callbackUrl = useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.location.href;
    }

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') query.set(key, value);
      if (Array.isArray(value) && typeof value[0] === 'string') query.set(key, value[0]);
    });
    return `flatvio://auth/callback?${query.toString()}`;
  }, [params]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let active = true;

    const finishSignIn = async () => {
      const session = await createSessionFromOAuthUrl(callbackUrl);
      if (!active) return;

      if (!session) {
        setErrorMessage('Google sign-in did not return a session.');
        return;
      }

      setSession(session);
      void fetchProfile(session.user.id).catch(() => undefined);
      router.replace('/');
    };

    finishSignIn().catch((error) => {
      if (!active) return;
      setErrorMessage(error instanceof Error ? error.message : 'Google sign-in failed.');
    });

    return () => {
      active = false;
    };
  }, [callbackUrl, fetchProfile, router, setSession]);

  if (errorMessage) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text
          style={{
            color: Colors.primary,
            fontFamily: Fonts.sansSemiBold,
            fontSize: 20,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Google sign-in could not finish
        </Text>
        <Text
          style={{
            color: Colors.ink3,
            fontFamily: Fonts.sans,
            fontSize: 14,
            lineHeight: 21,
            marginBottom: 18,
            textAlign: 'center',
          }}
        >
          {errorMessage}
        </Text>
        <Button title="Back to Sign In" onPress={() => router.replace('/(auth)/login')} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-base font-semibold text-primary">Finishing sign in...</Text>
    </View>
  );
}
