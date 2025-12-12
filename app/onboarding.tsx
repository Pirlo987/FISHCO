import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ThemedSafeArea } from '@/components/SafeArea';

const slides = [
  {
    title: 'Fond connexion',
    image: require('../assets/images/fond-connexion.webp'),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = Dimensions.get('window');

  return (
    <ThemedSafeArea edges={['bottom']} style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image
            source={slides[0].image}
            style={[styles.image, { width, height: height * 0.65 }]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.1)',
              'rgba(255,255,255,0.4)',
              'rgba(255,255,255,0.8)',
              '#ffffff'
            ]}
            locations={[0, 0.4, 0.6, 0.85, 1]}
            style={styles.gradient}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.textBlock}>
            <Text style={styles.heroTitle}>FishBook</Text>
            <Text style={styles.heroSubtitle}>L'endroit des pêcheurs</Text>
          </View>

          <View style={styles.ctaArea}>
            <Pressable style={styles.primaryButton} onPress={() => router.replace('/(auth)/register')}>
              <Text style={styles.primaryText}>Creer un compte</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Se connecter</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '70%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  ctaArea: {
    gap: 12,
    marginTop: 18,
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
});
