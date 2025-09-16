import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedSafeArea } from '@/components/SafeArea';
import SocialAuthButtons from '@/components/SocialAuthButtons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen() {
  const router = useRouter();
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onRegister = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Email et mot de passe sont requis.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Inscription échouée', error.message);
      return;
    }
    // Démarrer l'onboarding directement, même si la session n'est pas encore active
    await AsyncStorage.setItem('profile_onboarding_pending', '1');
    if (!data.session) {
      Alert.alert(
        'Vérification requise',
        "Vérifie tes emails pour confirmer ton compte. Tu pourras terminer l'onboarding après connexion."
      );
    }
    router.replace('/(onboarding)/name');
  };

  return (
    <ThemedSafeArea edges={['top','bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.appEmoji}>🎣</Text>
            <Text style={styles.appTitle}>Fishco</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoins la communauté Fishco</Text>

            <TextInput
              ref={emailRef}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
              color="#111827"
              returnKeyType="next"
              showSoftInputOnFocus={true}
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextInput
              ref={passwordRef}
              placeholder="Mot de passe (min 6)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
              color="#111827"
              returnKeyType="done"
              showSoftInputOnFocus={true}
            />

            <Pressable
              onPress={onRegister}
              style={[styles.button, loading && { opacity: 0.7 }]}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'En cours…' : "S'inscrire"}
              </Text>
            </Pressable>

            <View style={styles.separatorRow}>
              <View style={styles.separator} />
              <Text style={styles.sepText}>ou</Text>
              <View style={styles.separator} />
            </View>

            <SocialAuthButtons disabled={loading} />

            <Text style={styles.bottomText}>
              Déjà un compte ? <Link href="/(auth)/login">Se connecter</Link>
            </Text>

            <Pressable onPress={() => emailRef.current?.focus()} accessibilityRole="button" style={{ marginTop: 6, alignSelf: 'center' }}>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Problème de clavier ? Appuie ici pour focus email</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 16 },
  appEmoji: { fontSize: 32 },
  appTitle: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#6B7280', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
  },
  button: {
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '700' },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 2,
  },
  separator: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  sepText: { color: '#9CA3AF', fontSize: 12 },
  bottomText: { textAlign: 'center', marginTop: 8 },
});

