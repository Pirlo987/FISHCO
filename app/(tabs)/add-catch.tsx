import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function AddCatchScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [species, setSpecies] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [length, setLength] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSave = async () => {
    if (!session) {
      Alert.alert('Non connecté', 'Veuillez vous connecter.');
      return;
    }
    if (!species.trim()) {
      Alert.alert('Espèce requise', "Merci d'indiquer l'espèce pêchée.");
      return;
    }
    setLoading(true);
    const payload: any = {
      user_id: session.user.id,
      species: species.trim(),
      notes: notes.trim() || null,
      caught_at: new Date().toISOString(),
    };
    if (weight) payload.weight_kg = parseFloat(weight.replace(',', '.'));
    if (length) payload.length_cm = parseFloat(length.replace(',', '.'));

    const { error } = await supabase.from('catches').insert([payload]);
    setLoading(false);
    if (error) {
      Alert.alert('Sauvegarde impossible', error.message);
      return;
    }
    Alert.alert('Ajouté ✅', 'La prise a été enregistrée.');
    router.replace('/(tabs)/history');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.form}>
          <Text style={styles.title}>Ajouter une prise</Text>
          <TextInput placeholder="Espèce (obligatoire)" value={species} onChangeText={setSpecies} style={styles.input} />
          <TextInput placeholder="Poids (kg)" value={weight} onChangeText={setWeight} style={styles.input} keyboardType="decimal-pad" />
          <TextInput placeholder="Taille (cm)" value={length} onChangeText={setLength} style={styles.input} keyboardType="decimal-pad" />
          <TextInput placeholder="Notes (optionnel)" value={notes} onChangeText={setNotes} style={[styles.input, { height: 100 }]} multiline />
          <Pressable onPress={onSave} style={[styles.button, loading && { opacity: 0.7 }]} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Enregistrement…' : 'Enregistrer'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  form: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '600', marginVertical: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  button: { backgroundColor: '#1e90ff', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});

