import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts } from '../../constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const { completeOAuthSignIn } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState('');
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    let isMounted = true;

    const finishSignIn = async () => {
      let callbackUrl = '';

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        callbackUrl = window.location.href;
      } else {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (typeof value === 'string') query.set(key, value);
          if (Array.isArray(value) && typeof value[0] === 'string') query.set(key, value[0]);
        });
        callbackUrl = `flatvio://auth/callback?${query.toString()}`;
      }

      await completeOAuthSignIn(callbackUrl);
      router.replace('/');
    };

    finishSignIn().catch((error) => {
      if (!isMounted) return;
      setErrorMessage(error instanceof Error ? error.message : 'Google sign-in failed.');
    });

    return () => {
      isMounted = false;
    };
  }, [completeOAuthSignIn, params, router]);

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
