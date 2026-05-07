import '../global.css';
import React, { useEffect } from 'react';
import { Text, TextInput, View, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SpeedInsights } from '@vercel/speed-insights/react';
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

// Prevent OS-level accessibility font scaling from breaking layouts.
// Applied globally so every Text and TextInput in the app inherits this.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Text as any).defaultProps = { ...((Text as any).defaultProps ?? {}), allowFontScaling: false };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(TextInput as any).defaultProps = { ...((TextInput as any).defaultProps ?? {}), allowFontScaling: false };

type ErrorBoundaryState = { error: Error | null };

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
          <Text
            style={styles.errorRetry}
            onPress={() => this.setState({ error: null })}
          >
            Tap to retry
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0A0A0A', marginBottom: 10 },
  errorMessage: { fontSize: 14, color: '#6B6B6B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  errorRetry: { fontSize: 15, fontWeight: '600', color: '#1A56FF' },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      // Only retry on network failures; skip retries on 4xx RLS/auth/permission errors.
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        const msg = error instanceof Error ? error.message : '';
        if (msg.includes('PGRST') || msg.includes('JWT') || msg.includes('permission')) return false;
        return true;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

function AuthGate() {
  const { session, profile, isInitialized, isProfileLoading } = useAuthStore();
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

    if (isProfileLoading) return;

    if (!profile?.role) {
      if (currentPath !== '(auth)/role-select' && root !== 'auth') {
        router.replace('/(auth)/role-select');
      }
      return;
    }

    if (inAuthFlow) {
      router.replace(profile.role === 'landlord' ? '/(landlord)' : '/(tenant)');
    }
  }, [isInitialized, isProfileLoading, session, profile, segments, router]);

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
    return <LoadingScreen message="Starting RentyBase..." />;
  }

  return (
    <AppErrorBoundary>
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
              <Stack.Screen name="agreement/[rentalId]" />
              <Stack.Screen name="receipt/[paymentId]" />
              <Stack.Screen name="join/[token]" />
            </Stack>
            <ConfirmHost />
            <ToastHost />
          </QueryClientProvider>
          {Platform.OS === 'web' && <SpeedInsights />}
        </WebContainer>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
