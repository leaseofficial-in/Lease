import { useEffect, useState } from 'react';
import { Platform, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createSessionFromOAuthUrl } from '../../lib/oauth';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts } from '../../constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const { setSession, fetchProfile } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const finishSignIn = async () => {
      let session = null;

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        session = await createSessionFromOAuthUrl(window.location.href);
      } else {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (typeof value === 'string') query.set(key, value);
        });

        session = await createSessionFromOAuthUrl(`flatvio://auth/callback?${query.toString()}`);
      }

      if (!session) {
        throw new Error('Google sign-in did not return a session.');
      }

      setSession(session);
      await fetchProfile(session.user.id);
      // AuthGate in _layout.tsx reads the profile and routes to the right dashboard
      // (or role-select if this is a first-time sign-in with no role yet)
      router.replace('/(auth)');
    };

    finishSignIn().catch((error) => {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      if (isMounted) setErrorMessage(message);
    });

    return () => {
      isMounted = false;
    };
  }, [fetchProfile, params, router, setSession]);

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
