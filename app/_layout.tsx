// Reanimated must be imported at the very top before any other imports
// to avoid Hermes native crashes on initialization.
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean | null>(null);
  const [profilePending, setProfilePending] = React.useState<boolean | null>(null);
  const [profileDone, setProfileDone] = React.useState<boolean | null>(null);

  // Re-check onboarding flag when navigation segments change so we don't loop back
  // to onboarding after pressing "Commencer".
  React.useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem('onboarding_seen'),
      AsyncStorage.getItem('profile_onboarding_pending'),
      AsyncStorage.getItem('profile_onboarding_done'),
    ])
      .then(([seen, pending, done]) => {
        if (mounted) {
          setHasSeenOnboarding(!!seen);
          setProfilePending(!!pending);
          setProfileDone(!!done);
        }
      })
      .finally(() => {
        if (mounted) setOnboardingChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, [segments]);

  React.useEffect(() => {
    if (!initialized || !onboardingChecked || hasSeenOnboarding === null || profilePending === null || profileDone === null) return;

    const firstSeg = Array.isArray(segments) && segments.length > 0 ? (segments as any)[0] : undefined;
    const inAuthGroup = typeof pathname === 'string' && (
      pathname.startsWith('/(auth)/') || pathname === '/login' || pathname === '/register' || firstSeg === '(auth)'
    );
    const inOnboarding = typeof pathname === 'string' && (
      pathname.startsWith('/(onboarding)/') || pathname === '/onboarding' || firstSeg === '(onboarding)'
    );

    // New session on an auth screen and onboarding not yet seen => jump straight to profile flow
    if (session && inAuthGroup && !hasSeenOnboarding) {
      router.replace('/(onboarding)/name');
      return;
    }

    if (!hasSeenOnboarding && !inOnboarding && !inAuthGroup) {
      router.replace('/onboarding');
      return;
    }

    // If profile onboarding flagged as pending, drive user to profile onboarding flow
    // Only after the user has seen the intro onboarding to avoid bouncing from tabs
    if (profilePending && !profileDone && hasSeenOnboarding && !inOnboarding) {
      router.replace('/(onboarding)/name');
      return;
    }

    if (!session && !inAuthGroup && !inOnboarding) {
      router.replace('/(auth)/login');
      return;
    }

    // Do not auto-jump to tabs from auth screens; let those screens decide
  }, [segments, pathname, session, initialized, onboardingChecked, hasSeenOnboarding, profilePending, profileDone]);

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
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="catches" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthGate>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}
