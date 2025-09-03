import { Stack } from 'expo-router';

export default function AuthStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Connexion' }} />
      <Stack.Screen name="register" options={{ title: 'Créer un compte' }} />
    </Stack>
  );
}

