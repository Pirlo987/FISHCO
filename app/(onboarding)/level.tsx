import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';
import { useAuth } from '@/providers/AuthProvider';
import { mergeProfileDraft, readProfileDraft } from '@/lib/profileDraft';

// Persist values as backend-friendly slugs required by the `profiles_level_check` constraint.
const LEVELS = [
  { value: 'beginner', label: 'Débutant', emoji: '🎣', description: 'Je débute dans la pêche' },
  { value: 'intermediate', label: 'Intermédiaire', emoji: '🐟', description: 'J\'ai quelques sorties à mon actif' },
  { value: 'experienced', label: 'Expérimenté', emoji: '🎏', description: 'Je pêche régulièrement' },
  { value: 'expert', label: 'Expert', emoji: '🏆', description: 'La pêche n\'a plus de secrets pour moi' },
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

  return (
    <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.wrapper}>
          {/* Accent coloré fin en haut */}
          <View style={styles.topAccent}>
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              {/* Barre de progression */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressFill}
                  />
                </View>
                <Text style={styles.progressText}>4/5</Text>
              </View>

              <Text style={styles.title}>Ton niveau{'\n'}de pêche</Text>
              <Text style={styles.subtitle}>
                Choisis l'option qui te correspond le mieux
              </Text>
            </View>

            <View style={styles.form}>
              {LEVELS.map((item) => {
                const isSelected = level === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setLevel(item.value)}
                    style={[
                      styles.levelCard,
                      isSelected && styles.levelCardSelected
                    ]}
                  >
                    <View style={styles.levelContent}>
                      <Text style={styles.levelEmoji}>{item.emoji}</Text>
                      <View style={styles.levelTextContainer}>
                        <Text style={[
                          styles.levelLabel,
                          isSelected && styles.levelLabelSelected
                        ]}>
                          {item.label}
                        </Text>
                        <Text style={[
                          styles.levelDescription,
                          isSelected && styles.levelDescriptionSelected
                        ]}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkIcon}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <Pressable 
                style={styles.secondaryWrapper} 
                onPress={() => router.back()}
                disabled={submitting}
              >
                <View style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Retour</Text>
                </View>
              </Pressable>
              
              <Pressable 
                style={styles.primaryWrapper} 
                onPress={onSave}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryText}>
                    {submitting ? 'Chargement…' : 'Continuer'}
                  </Text>
                  {!submitting && (
                    <View style={styles.arrowWrapper}>
                      <Text style={styles.arrowIcon}>→</Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#ffffff' },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
  },
  accentBar: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 20,
  },
  header: { gap: 14 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    width: '80%',
    height: '100%',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    minWidth: 30,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#0f172a',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: { 
    color: '#64748B', 
    fontSize: 15, 
    lineHeight: 22,
  },
  form: { 
    gap: 12,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  levelCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  levelContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  levelEmoji: {
    fontSize: 32,
  },
  levelTextContainer: {
    flex: 1,
    gap: 4,
  },
  levelLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  levelLabelSelected: {
    color: '#1E40AF',
  },
  levelDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 18,
  },
  levelDescriptionSelected: {
    color: '#3B82F6',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: { 
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#ffffff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  secondaryButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  secondaryText: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 17,
  },
  primaryWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryButton: { 
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: { 
    color: '#ffffff', 
    fontWeight: '800', 
    fontSize: 17,
    letterSpacing: 0.3,
  },
  arrowWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});