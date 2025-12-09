import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ThemedSafeArea } from '@/components/SafeArea';

const background = require('../assets/images/fond Connexion.webp');

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#000' }}>
      <ImageBackground source={background} style={styles.background} resizeMode="cover">
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.brand}>FishBook</Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.primaryWrapper} onPress={() => router.replace('/(auth)/login')}>
              <LinearGradient
                colors={['#b5c7ff', '#8ac5ff', '#9db3ff', '#d6b4ff', '#f5c8ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryText}>Se connecter</Text>
              </LinearGradient>
            </Pressable>

            <Pressable style={[styles.primaryWrapper, styles.secondaryWrapper]} onPress={() => router.replace('/(auth)/register')}>
              <View style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Créer un compte</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  header: { alignItems: 'center', marginTop: 12 },
  brand: { color: '#fff', fontSize: 28, fontWeight: '800' },
  actions: { gap: 12 },
  primaryWrapper: {
    borderRadius: 999,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  primaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 999,
  },
  primaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  secondaryWrapper: { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  secondaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
