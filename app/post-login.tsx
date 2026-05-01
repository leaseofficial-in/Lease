import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Profile } from '../types';
import { Colors, Fonts } from '../constants/theme';

type Destination = '/(auth)' | '/(auth)/role-select' | '/(landlord)' | '/(tenant)';

export default function PostLoginScreen() {
  const { setSession, setProfile } = useAuthStore();
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let active = true;

    const routeAfterLogin = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!active) return;

      if (!session) {
        setDestination('/(auth)');
        return;
      }

      setSession(session);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;

      const typedProfile = profile ? (profile as Profile) : null;
      setProfile(typedProfile);

      if (typedProfile?.role === 'landlord') {
        setDestination('/(landlord)');
      } else if (typedProfile?.role === 'tenant') {
        setDestination('/(tenant)');
      } else {
        setDestination('/(auth)/role-select');
      }
    };

    routeAfterLogin().catch(() => {
      if (active) setDestination('/(auth)/role-select');
    });

    return () => {
      active = false;
    };
  }, [setProfile, setSession]);

  if (destination) {
    return <Redirect href={destination} />;
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
        Opening Flatvio...
      </Text>
    </View>
  );
}
