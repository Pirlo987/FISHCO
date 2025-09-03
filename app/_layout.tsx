import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean | null>(null);

  // Re-check onboarding flag when navigation segments change so we don't loop back
  // to onboarding after pressing "Commencer".
  React.useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('onboarding_seen')
      .then((v) => {
        if (mounted) setHasSeenOnboarding(!!v);
      })
      .finally(() => {
        if (mounted) setOnboardingChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, [segments]);

  React.useEffect(() => {
    if (!initialized || !onboardingChecked || hasSeenOnboarding === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const atOnboarding = segments[0] === 'onboarding';

    if (!hasSeenOnboarding && !atOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (!session && !inAuthGroup && !atOnboarding) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && inAuthGroup) {
      router.replace('/(tabs)');
      return;
    }
  }, [segments, session, initialized, onboardingChecked, hasSeenOnboarding]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGate>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthGate>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
