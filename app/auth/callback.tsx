import { useEffect } from 'react';
import { Platform, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createSessionFromOAuthUrl } from '../../lib/oauth';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();

  useEffect(() => {
    const finishSignIn = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        await createSessionFromOAuthUrl(window.location.href);
        router.replace('/(auth)/role-select');
        return;
      }

      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') query.set(key, value);
      });

      await createSessionFromOAuthUrl(`flatvio://auth/callback?${query.toString()}`);
      router.replace('/(auth)/role-select');
    };

    finishSignIn().catch(() => router.replace('/(auth)/login'));
  }, [params, router]);

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-base font-semibold text-primary">Finishing sign in...</Text>
    </View>
  );
}
