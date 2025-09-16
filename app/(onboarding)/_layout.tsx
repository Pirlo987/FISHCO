import { Stack } from 'expo-router';

export default function OnboardingProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="name" />
      <Stack.Screen name="country" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="level" />
      <Stack.Screen name="username" />
      <Stack.Screen name="photo" />
    </Stack>
  );
}

