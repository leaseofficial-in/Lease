import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { createSessionFromOAuthUrl } from '../../lib/oauth';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const setSession = useAuthStore((state) => state.setSession);
  const [done, setDone] = useState(false);
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

    const finish = (session: Session) => {
      if (!active) return;
      setSession(session);
      setDone(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session);
    });

    createSessionFromOAuthUrl(callbackUrl)
      .then((session) => {
        if (!session) {
          if (!active) return;
          setErrorMessage('Google sign-in did not return a session.');
          return;
        }
        finish(session);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Google sign-in failed.');
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [callbackUrl, setSession]);

  if (done) {
    return <Redirect href="/post-login" />;
  }

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
        <Button title="Back to Sign In" onPress={() => setDone(true)} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-base font-semibold text-primary">Finishing sign in...</Text>
    </View>
  );
}
