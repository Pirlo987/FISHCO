import React from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [focused, setFocused] = React.useState(false);

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
      Alert.alert('Pseudo invalide', '3-20 caracteres, lettres, chiffres, _ et .');
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
          `${checkErr.message || 'Erreur de verification'}\n\nAssure-toi que la colonne 'username' existe (unique) dans la table 'profiles'.`
        );
      }
      if (matches && matches.length > 0 && matches[0]?.id !== session.user.id) {
        Alert.alert('Pseudo deja pris', 'Merci den choisir un autre.');
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

  return (
    <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.wrapper}>
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
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={['#3B82F6', '#2563EB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressFill}
                    />
                  </View>
                  <Text style={styles.progressText}>5/6</Text>
                </View>

                <Text style={styles.title}>Choisis ton pseudo</Text>
                <Text style={styles.subtitle}>Unique, simple a retenir, et sans espace.</Text>
              </View>

              <View style={styles.form}>
                <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
                  <TextInput
                    placeholder="Pseudo (ex: pecheur34)"
                    placeholderTextColor="#94A3B8"
                    color="#0f172a"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={username}
                    onChangeText={setUsername}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={styles.input}
                    maxLength={20}
                    returnKeyType="done"
                    onSubmitEditing={onFinish}
                  />
                </View>
                <View style={styles.infoCard}>
                  <LinearGradient
                    colors={['#FEF3C7', '#FDE68A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.infoBackground}
                  />
                  <View style={styles.infoAccent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoIcon}>⚠️</Text>
                    <Text style={styles.infoText}>
                      Ce pseudo sera visible sur FishBook et ne pourra pas etre modifie par la suite.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryWrapper} onPress={() => router.back()} disabled={submitting}>
                  <View style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Retour</Text>
                  </View>
                </Pressable>

                <Pressable style={styles.primaryWrapper} onPress={onFinish} disabled={submitting}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.primaryButton, submitting && { opacity: 0.85 }]}
                  >
                    <Text style={styles.primaryText}>{submitting ? 'Verification...' : 'Continuer'}</Text>
                    <View style={styles.arrowWrapper}>
                      <Text style={styles.arrowIcon}>→</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
  accentBar: { flex: 1 },
  scrollView: { flex: 1 },
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
    width: '83%',
    height: '100%',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    minWidth: 30,
    textAlign: 'right',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  form: { gap: 16 },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  inputContainerFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
  },
  input: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  infoBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.88,
  },
  infoAccent: {
    width: 4,
    backgroundColor: '#F59E0B',
  },
  infoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoIcon: { fontSize: 16 },
  infoText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
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
