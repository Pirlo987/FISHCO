import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';
import { useAuth } from '@/providers/AuthProvider';
import { mergeProfileDraft, readProfileDraft } from '@/lib/profileDraft';

// Persist values as backend-friendly slugs required by the `profiles_level_check` constraint.
const LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'experienced', label: 'Expérimenté' },
  { value: 'expert', label: 'Expert' },
] as const;

export type LevelValue = (typeof LEVELS)[number]['value'];

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();

export default function LevelStep() {
  const router = useRouter();
  const { session } = useAuth();
  const [level, setLevel] = React.useState<LevelValue | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (!session?.user?.id) {
      setLevel(null);
      return;
    }
    readProfileDraft(session).then((draft) => {
      if (!mounted || !draft || !draft.level) return;
      const raw = String(draft.level);
      const direct = LEVELS.find((option) => option.value === raw);
      if (direct) {
        setLevel(direct.value);
        return;
      }
      const simplified = normalize(raw);
      const fallback = LEVELS.find((option) => normalize(option.label) === simplified);
      if (fallback) setLevel(fallback.value);
    });

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const onSave = async () => {
    if (!level) {
      Alert.alert('Sélection requise', 'Choisis ton niveau de pêche.');
      return;
    }
    setSubmitting(true);
    try {
      await mergeProfileDraft(session, { level });
      if (!session?.user?.id) {
        Alert.alert('Connexion requise', 'Connecte-toi pour continuer.');
        router.replace('/(auth)/login');
        return;
      }
      router.push('/(onboarding)/username');
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => router.back();

  return (
    <ThemedSafeArea>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Ton niveau de pêche</Text>
          <Text style={styles.subtitle}>Choisis l’option qui te correspond</Text>

          <View style={styles.levels}>
            {LEVELS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setLevel(item.value)}
                style={[styles.levelBtn, level === item.value && styles.levelSelected]}
              >
                <Text
                  style={[styles.levelText, level === item.value && styles.levelTextSelected]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <Pressable
              style={[styles.button, styles.secondary]}
              onPress={onBack}
              disabled={submitting}
            >
              <Text style={styles.secondaryText}>Retour</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onSave} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Chargement…' : 'Continuer'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#6B7280', marginBottom: 6 },
  levels: { gap: 10 },
  levelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  levelSelected: { backgroundColor: '#EAF2FF', borderColor: '#1e90ff' },
  levelText: { fontWeight: '600', color: '#111827' },
  levelTextSelected: { color: '#1e90ff' },
  row: { flexDirection: 'row', gap: 10 },
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
