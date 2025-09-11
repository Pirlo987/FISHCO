import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedSafeArea } from '@/components/SafeArea';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onRegister = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Email et mot de passe sont requis.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Inscription échouée', error.message);
      return;
    }
    Alert.alert('Vérification requise', 'Vérifie tes emails pour confirmer ton compte.');
    router.replace('/(auth)/login');
  };

  return (
    <ThemedSafeArea>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Créer un compte</Text>
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Mot de passe (min 6)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        <Pressable onPress={onRegister} style={[styles.button, loading && { opacity: 0.7 }]} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'En cours…' : "S'inscrire"}</Text>
        </Pressable>
        <Text style={styles.bottomText}>
          Déjà un compte ? <Link href="/(auth)/login">Se connecter</Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 420, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  button: { backgroundColor: '#1e90ff', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
  bottomText: { textAlign: 'center', marginTop: 8 },
});
