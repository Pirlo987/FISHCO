import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const LEVELS = ['Débutant', 'Intermédiaire', 'Expérimenté', 'Expert'] as const;
type Level = typeof LEVELS[number];

export default function LevelStep() {
  const router = useRouter();
  const { session } = useAuth();
  const [level, setLevel] = React.useState<Level | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('profile_draft').then((v) => {
      if (!v) return;
      try {
        const d = JSON.parse(v);
        if (d.level) setLevel(d.level);
      } catch {}
    });
  }, []);

  const onSave = async () => {
    if (!level) {
      Alert.alert('Sélection requise', 'Choisis ton niveau de pêche.');
      return;
    }
    const raw = await AsyncStorage.getItem('profile_draft');
    const draft = raw ? JSON.parse(raw) : {};
    const payload = { ...draft, level };

    if (!session?.user?.id) {
      await AsyncStorage.setItem('profile_draft', JSON.stringify(payload));
      Alert.alert('Connexion requise', 'Connecte-toi pour enregistrer ton profil.');
      router.replace('/(auth)/login');
      return;
    }

    setSubmitting(true);
    const row = {
      id: session.user.id,
      first_name: payload.firstName ?? null,
      last_name: payload.lastName ?? null,
      dob: payload.dob ?? null,
      country: payload.country ?? null,
      fishing_level: payload.level ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase.from('profiles').upsert(row);

    setSubmitting(false);

    if (upsertErr) {
      const msg = upsertErr.message || 'Erreur inconnue';
      Alert.alert('Enregistrement du profil impossible', `${msg}\n\nAssure-toi que la table 'profiles' existe bien dans le schéma public et que les policies RLS permettent l'upsert par l'utilisateur courant.`);
      return;
    }

    await AsyncStorage.removeItem('profile_draft');
    await AsyncStorage.removeItem('profile_onboarding_pending');
    router.replace('/(tabs)');
  };

  const onBack = () => router.back();

  return (
    <ThemedSafeArea>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Ton niveau de pêche</Text>
          <Text style={styles.subtitle}>Choisis l’option qui te correspond</Text>

          <View style={styles.levels}>
            {LEVELS.map((l) => (
              <Pressable
                key={l}
                onPress={() => setLevel(l)}
                style={[styles.levelBtn, level === l && styles.levelSelected]}
              >
                <Text style={[styles.levelText, level === l && styles.levelTextSelected]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <Pressable style={[styles.button, styles.secondary]} onPress={onBack} disabled={submitting}>
              <Text style={styles.secondaryText}>Retour</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onSave} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Enregistrement…' : 'Terminer'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 480, gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#6B7280', marginBottom: 6 },
  levels: { gap: 10 },
  levelBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  levelSelected: { backgroundColor: '#EAF2FF', borderColor: '#1e90ff' },
  levelText: { fontWeight: '600', color: '#111827' },
  levelTextSelected: { color: '#1e90ff' },
  row: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, backgroundColor: '#1e90ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  secondary: { backgroundColor: '#F3F4F6' },
  buttonText: { color: 'white', fontWeight: '700' },
  secondaryText: { color: '#111827', fontWeight: '600' },
});
