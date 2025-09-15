import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';

export default function CountryStep() {
  const router = useRouter();
  const [country, setCountry] = React.useState('');

  React.useEffect(() => {
    AsyncStorage.getItem('profile_draft').then((v) => {
      if (!v) return;
      try {
        const d = JSON.parse(v);
        if (d.country) setCountry(d.country);
      } catch {}
    });
  }, []);

  const onNext = async () => {
    if (!country) {
      Alert.alert('Champ requis', 'Merci d’indiquer ton pays de résidence.');
      return;
    }
    await AsyncStorage.mergeItem('profile_draft', JSON.stringify({ country }));
    router.push('/(onboarding)/level');
  };

  const onBack = () => router.back();

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Pays de résidence</Text>
          <Text style={styles.subtitle}>Où habites-tu ?</Text>

          <TextInput
            placeholder="Pays (ex: France)"
            placeholderTextColor="#9CA3AF"
            color="#111827"
            value={country}
            onChangeText={setCountry}
            style={styles.input}
          />

          <View style={styles.row}>
            <Pressable style={[styles.button, styles.secondary]} onPress={onBack}>
              <Text style={styles.secondaryText}>Retour</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onNext}>
              <Text style={styles.buttonText}>Continuer</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 480, gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#6B7280', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 },
  row: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, backgroundColor: '#1e90ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  secondary: { backgroundColor: '#F3F4F6' },
  buttonText: { color: 'white', fontWeight: '700' },
  secondaryText: { color: '#111827', fontWeight: '600' },
});
