import { useEffect } from 'react';
import { Platform, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createSessionFromOAuthUrl } from '../../lib/oauth';
import { useAuthStore } from '../../stores/authStore';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const { setSession, fetchProfile } = useAuthStore();

  useEffect(() => {
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
      router.replace('/(auth)/role-select');
    };

    finishSignIn().catch(() => router.replace('/(auth)/login'));
  }, [fetchProfile, params, router, setSession]);

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-base font-semibold text-primary">Finishing sign in...</Text>
    </View>
  );
}
