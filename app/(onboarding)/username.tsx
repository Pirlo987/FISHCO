import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { mergeProfileDraft, readProfileDraft } from '@/lib/profileDraft';

export default function UsernameStep() {
  const router = useRouter();
  const { session } = useAuth();
  const [username, setUsername] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (!session?.user?.id) {
      setUsername('');
      return;
    }
    readProfileDraft(session).then((draft) => {
      if (!mounted || !draft?.username) return;
      setUsername(String(draft.username));
    });

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const validateUsername = (u: string) => /^[a-z0-9_.]{3,20}$/i.test(u);

  const onFinish = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Champ requis', 'Choisis un pseudo.');
      return;
    }
    if (!validateUsername(trimmed)) {
      Alert.alert('Pseudo invalide', '3-20 caractères, lettres, chiffres, _ et .');
      return;
    }

    setSubmitting(true);
    try {
      if (!session?.user?.id) {
        await mergeProfileDraft(session, { username: trimmed });
        Alert.alert('Connexion requise', 'Connecte-toi pour continuer.');
        router.replace('/(auth)/login');
        return;
      }

      const { data: matches, error: checkErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .limit(1);

      if (checkErr) {
        throw new Error(
          `${checkErr.message || 'Erreur de vérification'}\n\nAssure-toi que la colonne 'username' existe (unique) dans la table 'profiles'.`
        );
      }
      if (matches && matches.length > 0 && matches[0]?.id !== session.user.id) {
        Alert.alert('Pseudo déjà pris', 'Merci d’en choisir un autre.');
        setSubmitting(false);
        return;
      }

      await mergeProfileDraft(session, { username: trimmed });
      router.push('/(onboarding)/photo');
    } catch (e: any) {
      Alert.alert('Validation impossible', String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => router.back();

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Choisis ton pseudo</Text>
          <Text style={styles.subtitle}>Il doit être unique</Text>

          <TextInput
            placeholder="Pseudo (ex: pecheur34)"
            placeholderTextColor="#9CA3AF"
            color="#111827"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            style={styles.input}
          />
          <Text style={styles.help}>3-20 caractères, lettres, chiffres, _ et .</Text>

          <View style={styles.row}>
            <Pressable
              style={[styles.button, styles.secondary]}
              onPress={onBack}
              disabled={submitting}
            >
              <Text style={styles.secondaryText}>Retour</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onFinish} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Vérification…' : 'Continuer'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#6B7280', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
  },
  help: { color: '#9CA3AF', fontSize: 12, marginTop: -4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  button: {
    flex: 1,
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondary: { backgroundColor: '#F3F4F6' },
  buttonText: { color: 'white', fontWeight: '700' },
  secondaryText: { color: '#111827', fontWeight: '600' },
});
