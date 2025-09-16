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
  const [dobDate, setDobDate] = React.useState<Date | null>(null);
  const [showPicker, setShowPicker] = React.useState(false);

  // Optional native date picker (fallback to text input if not installed)
  let DateTimePicker: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch {}

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  React.useEffect(() => {
    // Load any existing draft
    AsyncStorage.getItem('profile_draft').then((v) => {
      if (!v) return;
      try {
        const d = JSON.parse(v);
        if (d.firstName) setFirstName(d.firstName);
        if (d.lastName) setLastName(d.lastName);
        if (d.dob) {
          setDob(d.dob);
          const parts = String(d.dob).split('-');
          if (parts.length === 3) {
            const year = Number(parts[0]);
            const month = Number(parts[1]) - 1;
            const day = Number(parts[2]);
            const maybe = new Date(year, month, day);
            if (!isNaN(maybe.getTime())) setDobDate(maybe);
          }
        }
      } catch {}
    });
  }, []);

  const onNext = async () => {
    const finalDob = dobDate ? formatDate(dobDate) : dob;
    if (!firstName || !lastName || !finalDob) {
      Alert.alert('Champs requis', 'Merci de remplir nom, prénom et date de naissance.');
      return;
    }
    // naive YYYY-MM-DD check
    if (!dobDate && !/^\d{4}-\d{2}-\d{2}$/.test(finalDob)) {
      Alert.alert('Format date', 'Utilise le format YYYY-MM-DD (ex: 1990-05-12).');
      return;
    }
    await AsyncStorage.mergeItem('profile_draft', JSON.stringify({ firstName, lastName, dob: finalDob }));
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
          {DateTimePicker ? (
            <View style={{ gap: 8 }}>
              <Pressable
                onPress={() => setShowPicker((v) => !v)}
                style={[styles.input, { justifyContent: 'center' }]}
              >
                <Text style={{ color: dobDate || dob ? '#111827' : '#9CA3AF' }}>
                  {dobDate ? formatDate(dobDate) : dob || 'Date de naissance'}
                </Text>
              </Pressable>
              {showPicker && (
                <DateTimePicker
                  value={dobDate ?? new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e: any, selected?: Date) => {
                    if (Platform.OS === 'android') setShowPicker(false);
                    if (selected) {
                      setDobDate(selected);
                      setDob(formatDate(selected));
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>
          ) : (
            <TextInput
              placeholder="Date de naissance (YYYY-MM-DD)"
              placeholderTextColor="#9CA3AF"
              color="#111827"
              value={dob}
              onChangeText={setDob}
              style={styles.input}
            />
          )}

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
