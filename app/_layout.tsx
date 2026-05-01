import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts as useGeistFonts,
} from '@expo-google-fonts/geist';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  useFonts as useInstrumentFonts,
} from '@expo-google-fonts/instrument-serif';
import { useAuthStore } from '../stores/authStore';
import { registerForPushNotifications } from '../lib/notifications';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { ToastHost } from '../components/ui/ToastHost';
import { WebContainer } from '../components/ui/WebContainer';
import { ConfirmHost } from '../components/ui/ConfirmHost';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
});

function AuthGate() {
  const { session, profile, isInitialized } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isInitialized) return;

    const root = segments[0];
    const currentPath = segments.join('/');
    const inAuthFlow = root === '(auth)' || root === 'auth';
    const inJoinFlow = root === 'join';

    if (!session) {
      if (!inAuthFlow && !inJoinFlow) router.replace('/(auth)');
      return;
    }

    if (!profile?.role) {
      if (currentPath !== '(auth)/role-select' && root !== 'auth') {
        router.replace('/(auth)/role-select');
      }
      return;
    }

    if (inAuthFlow) {
      router.replace(profile.role === 'landlord' ? '/(landlord)' : '/(tenant)');
    }
  }, [isInitialized, session, profile, segments, router]);

  useEffect(() => {
    if (session?.user.id) {
      registerForPushNotifications(session.user.id);
    }
  }, [session]);

  return null;
}

export default function RootLayout() {
  const { isInitialized, initialize } = useAuthStore();
  const [geistLoaded] = useGeistFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const [serifLoaded] = useInstrumentFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized || !geistLoaded || !serifLoaded) {
    return <LoadingScreen message="Starting Flatvio..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WebContainer>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <AuthGate />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(landlord)" />
            <Stack.Screen name="(tenant)" />
            <Stack.Screen name="auth/callback" />
            <Stack.Screen name="join/[token]" />
          </Stack>
          <ConfirmHost />
          <ToastHost />
        </QueryClientProvider>
      </WebContainer>
    </GestureHandlerRootView>
  );
}
