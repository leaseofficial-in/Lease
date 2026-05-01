import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/theme';

const PENDING_JOIN_KEY = 'flatvio.pending_join_token';

// Deep link handler: flatvio://join/<token> or https://flatvio.vercel.app/join/<token>
export default function JoinDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { session, profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rentalName, setRentalName] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setError('Invalid invite link.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('rentals')
        .select(`*, property:properties(name, city)`)
        .eq('invite_token', token)
        .gt('invite_expires_at', new Date().toISOString())
        .is('tenant_id', null)
        .maybeSingle();

      if (fetchError || !data) {
        setError('This invite link has expired or already been used.');
        setLoading(false);
        return;
      }

      setRentalName(`${data.property?.name} · ${data.property?.city}`);
    } catch {
      setError('Failed to verify invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!session) {
      await AsyncStorage.setItem(PENDING_JOIN_KEY, token);
      router.replace('/(auth)/login');
      return;
    }
    if (!profile?.role) {
      await AsyncStorage.setItem(PENDING_JOIN_KEY, token);
      router.replace('/(auth)/role-select');
      return;
    }
    router.replace({
      pathname: '/(tenant)/join',
      params: { prefillToken: token },
    });
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white items-center justify-center px-8"
      style={{
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      {loading ? (
        <ActivityIndicator size="large" color={Colors.action} />
      ) : error ? (
        <View className="items-center">
          <Text style={{ color: Colors.primary, fontSize: 32, fontWeight: '700' }} className="mb-4">!</Text>
          <Text className="text-xl font-bold text-primary text-center mb-2">Invalid Link</Text>
          <Text className="text-sm text-muted text-center mb-6">{error}</Text>
          <Button title="Go Home" onPress={() => router.replace('/(auth)')} />
        </View>
      ) : (
        <View className="items-center w-full">
          <Text style={{ color: Colors.primary, fontSize: 32, fontWeight: '700' }} className="mb-4">F</Text>
          <Text className="text-2xl font-bold text-primary text-center mb-2">
            You're invited!
          </Text>
          <Text className="text-base text-muted text-center mb-2">{rentalName}</Text>
          <Text className="text-sm text-muted text-center mb-8">
            {session ? 'Tap below to join this rental.' : 'Sign in or create an account to join this rental.'}
          </Text>
          <Button
            title={session ? 'Join Rental' : 'Sign In to Join'}
            onPress={handleContinue}
            fullWidth
            size="lg"
          />
        </View>
      )}
    </SafeAreaView>
  );
}
