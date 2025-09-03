import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function OnboardingScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const onStart = async () => {
    await AsyncStorage.setItem('onboarding_seen', '1');
    router.replace(session ? '/(tabs)' : '/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue sur Fishco 🎣</Text>
      <Text style={styles.subtitle}>Ajoute tes prises et consulte ton historique.</Text>
      <Pressable style={styles.button} onPress={onStart}>
        <Text style={styles.buttonText}>Commencer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: '#1e90ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: 'white', fontWeight: '600' },
});

