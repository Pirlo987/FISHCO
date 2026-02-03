// Reanimated must be imported at the very top before any other imports
// to avoid Hermes native crashes on initialization.
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keep the splash screen visible until we finish loading critical app state.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Avoid crashing if the splash screen was already controlled elsewhere */
});

function AuthGate({
  children,
  onReady,
}: {
  children: React.ReactNode;
  onReady?: () => void;
}) {
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean | null>(null);
  const [profilePending, setProfilePending] = React.useState<boolean | null>(null);
  const [profileDone, setProfileDone] = React.useState<boolean | null>(null);
  const profileCheckRun = React.useRef(false);
  const hasSignaledReady = React.useRef(false);

  // Re-check onboarding flag when navigation segments change so we don't loop back
  // to onboarding after pressing "Commencer".
  React.useEffect(() => {
    let mounted = true;
    setOnboardingChecked(false);
    Promise.all([
      AsyncStorage.getItem('onboarding_seen'),
      AsyncStorage.getItem('profile_onboarding_pending'),
      AsyncStorage.getItem('profile_onboarding_done'),
    ])
      .then(([seen, pending, done]) => {
        if (mounted) {
          const normalize = (val: string | null) => {
            if (val === '1' || val === 'true') return true;
            if (val === '0' || val === 'false') return false;
            return null;
          };
          const seenFlag = normalize(seen);
          const pendingFlag = normalize(pending);
          const doneFlag = normalize(done);
          // If no session, fall back to false to avoid blocking the splash/ready state
          setHasSeenOnboarding(session ? seenFlag : seenFlag ?? false);
          setProfilePending(session ? pendingFlag : pendingFlag ?? false);
          setProfileDone(session ? doneFlag : doneFlag ?? false);
        }
      })
      .finally(() => {
        if (mounted) setOnboardingChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, [segments, session]);

  // Notify root layout once auth state and onboarding flags are ready so the splash
  // screen can be dismissed.
  React.useEffect(() => {
    if (!initialized || !onboardingChecked) return;
    if (hasSeenOnboarding === null || profilePending === null || profileDone === null) return;
    if (hasSignaledReady.current) return;
    hasSignaledReady.current = true;
    onReady?.();
  }, [initialized, onboardingChecked, hasSeenOnboarding, profilePending, profileDone, onReady]);

  React.useEffect(() => {
    if (!session?.user?.id) return;
    if (!onboardingChecked) return;
    if (profileCheckRun.current) return;
    const needsProfileCheck =
      hasSeenOnboarding === null ||
      profilePending === null ||
      profileDone === null ||
      (profileDone === false && profilePending === false);
    if (!needsProfileCheck) return;

    let cancelled = false;
    const hydrateFromProfile = async () => {
      try {
        profileCheckRun.current = true;
        const { data } = await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle();
        if (cancelled) return;
        const exists = !!data;
        if (exists) {
          setHasSeenOnboarding(true);
          setProfileDone(true);
          setProfilePending(false);
          await Promise.all([
            AsyncStorage.setItem('onboarding_seen', '1'),
            AsyncStorage.setItem('profile_onboarding_done', '1'),
            AsyncStorage.removeItem('profile_onboarding_pending'),
          ]);
        } else {
          setProfilePending(true);
          setProfileDone(false);
        }
      } catch {
        if (cancelled) return;
        setHasSeenOnboarding((prev) => (prev === null ? false : prev));
        setProfilePending((prev) => (prev === null ? false : prev));
        setProfileDone((prev) => (prev === null ? false : prev));
      }
    };
    hydrateFromProfile();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, onboardingChecked, hasSeenOnboarding, profilePending, profileDone]);

  React.useEffect(() => {
    profileCheckRun.current = false;
  }, [session?.user?.id]);

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
    if (session && inAuthGroup && !hasSeenOnboarding && profilePending) {
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
      router.replace('/onboarding');
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
  const [appReady, setAppReady] = React.useState(false);

  const handleAuthReady = React.useCallback(() => {
    setAppReady(true);
  }, []);

  React.useEffect(() => {
    if (loaded && appReady) {
      SplashScreen.hideAsync().catch(() => {
        /* noop */
      });
    }
  }, [loaded, appReady]);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGate onReady={handleAuthReady}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="history" options={{ headerShown: false }} />
            <Stack.Screen name="catches" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthGate>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}
