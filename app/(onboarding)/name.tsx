import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';

export default function NameStep() {
  const router = useRouter();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [dob, setDob] = React.useState('');

  React.useEffect(() => {
    // Load any existing draft
    AsyncStorage.getItem('profile_draft').then((v) => {
      if (!v) return;
      try {
        const d = JSON.parse(v);
        if (d.firstName) setFirstName(d.firstName);
        if (d.lastName) setLastName(d.lastName);
        if (d.dob) setDob(d.dob);
      } catch {}
    });
  }, []);

  const onNext = async () => {
    if (!firstName || !lastName || !dob) {
      Alert.alert('Champs requis', 'Merci de remplir nom, prénom et date de naissance.');
      return;
    }
    // naive YYYY-MM-DD check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      Alert.alert('Format date', 'Utilise le format YYYY-MM-DD (ex: 1990-05-12).');
      return;
    }
    await AsyncStorage.mergeItem('profile_draft', JSON.stringify({ firstName, lastName, dob }));
    // Mark intro onboarding as seen to avoid forced redirect
    await AsyncStorage.setItem('onboarding_seen', '1');
    router.push('/(onboarding)/country');
  };

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Tes informations</Text>
          <Text style={styles.subtitle}>Nom, prénom et date de naissance</Text>

          <TextInput
            placeholder="Prénom"
            placeholderTextColor="#9CA3AF"
            color="#111827"
            value={firstName}
            onChangeText={setFirstName}
            style={styles.input}
          />
          <TextInput
            placeholder="Nom"
            placeholderTextColor="#9CA3AF"
            color="#111827"
            value={lastName}
            onChangeText={setLastName}
            style={styles.input}
          />
          <TextInput
            placeholder="Date de naissance (YYYY-MM-DD)"
            placeholderTextColor="#9CA3AF"
            color="#111827"
            value={dob}
            onChangeText={setDob}
            style={styles.input}
          />

          <Pressable style={styles.button} onPress={onNext}>
            <Text style={styles.buttonText}>Continuer</Text>
          </Pressable>
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
  button: { backgroundColor: '#1e90ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700' },
});
