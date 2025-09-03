import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Actions rapides</ThemedText>
        <ThemedView style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => router.push('/(tabs)/add-catch')} style={{ backgroundColor: '#1e90ff', padding: 12, borderRadius: 8 }}>
            <ThemedText style={{ color: 'white', fontWeight: '600' }}>Ajouter une prise</ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/history')} style={{ backgroundColor: '#10b981', padding: 12, borderRadius: 8 }}>
            <ThemedText style={{ color: 'white', fontWeight: '600' }}>Historique</ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Conseil</ThemedText>
        <ThemedText>
          {`Ajoute ta première prise puis reviens ici pour suivre ta progression !`}
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
