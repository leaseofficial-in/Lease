import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts } from '../../constants/theme';
import { formatCurrency } from '../../lib/formatters';

const PENDING_JOIN_KEY = 'flatvio.pending_join_token';

export default function JoinDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { session, profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rental, setRental] = useState<{ name: string; city: string; rent: number } | null>(null);

  useEffect(() => {
    void validateToken();
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
        .select('monthly_rent, property:properties(name, city)')
        .eq('invite_token', token)
        .gt('invite_expires_at', new Date().toISOString())
        .is('tenant_id', null)
        .maybeSingle();

      if (fetchError || !data) {
        setError('This invite link has expired or already been used. Ask your landlord for a fresh one.');
        setLoading(false);
        return;
      }
      setRental({
        name: (data.property as { name: string; city: string } | null)?.name ?? 'your rental',
        city: (data.property as { name: string; city: string } | null)?.city ?? '',
        rent: data.monthly_rent,
      });
    } catch {
      setError('Failed to verify invite. Check your connection and try again.');
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
    router.replace({ pathname: '/(tenant)/join', params: { prefillToken: token } });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: Colors.surface }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.action} />
        ) : error ? (
          <View style={{ alignItems: 'center', width: '100%' }}>
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: Colors.dangerSoft,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Ionicons name="link-outline" size={30} color={Colors.danger} />
            </View>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 22, textAlign: 'center', marginBottom: 10 }}>
              Link not valid
            </Text>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 32 }}>
              {error}
            </Text>
            <Button title="Go to Home" onPress={() => router.replace('/(auth)')} fullWidth />
          </View>
        ) : (
          <View style={{ alignItems: 'center', width: '100%' }}>
            <View style={{
              width: 72, height: 72, borderRadius: 22,
              backgroundColor: Colors.successSoft,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Ionicons name="home" size={34} color={Colors.success} />
            </View>

            <Text style={{
              color: Colors.muted, fontFamily: Fonts.mono,
              fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10,
            }}>
              You're invited
            </Text>
            <Text style={{
              color: Colors.primary, fontFamily: Fonts.sansSemiBold,
              fontSize: 26, textAlign: 'center', lineHeight: 32, marginBottom: 4,
            }}>
              {rental?.name}
            </Text>
            {rental?.city ? (
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 14, marginBottom: 6 }}>
                {rental.city}
              </Text>
            ) : null}
            {rental?.rent ? (
              <View style={{
                backgroundColor: Colors.actionSoft, borderRadius: 20,
                paddingHorizontal: 16, paddingVertical: 6, marginBottom: 28,
              }}>
                <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
                  {formatCurrency(rental.rent)} / month
                </Text>
              </View>
            ) : null}

            <Text style={{
              color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13,
              textAlign: 'center', lineHeight: 20, marginBottom: 32,
            }}>
              {session
                ? 'Your landlord has invited you to join this rental on Flatvio.'
                : 'Sign in to join this rental. It takes under a minute.'}
            </Text>

            <Button
              title={session ? 'Join Rental' : 'Sign In to Join'}
              onPress={handleContinue}
              fullWidth
              size="lg"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
