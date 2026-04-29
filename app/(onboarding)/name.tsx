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
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedSafeArea } from '@/components/SafeArea';
import { mergeProfileDraft, readProfileDraft } from '@/lib/profileDraft';
import { useLanguage } from '@/providers/LanguageProvider';

export default function NameStep() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [focusedField, setFocusedField] = React.useState<string | null>(null);

  // Refs pour naviguer entre les inputs
  const lastNameRef = React.useRef<TextInput>(null);
  const dobRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    let mounted = true;
    if (!session?.user?.id) {
      setFirstName('');
      setLastName('');
      setDob('');
      return;
    }

    readProfileDraft(session).then((draft) => {
      if (!mounted || !draft) return;
      setFirstName(draft.firstName ? String(draft.firstName) : '');
      setLastName(draft.lastName ? String(draft.lastName) : '');
      const storedDob = draft.dob ? String(draft.dob) : '';
      // Convertir AAAA-MM-JJ en JJ/MM/AAAA pour l'affichage
      if (storedDob && /^\d{4}-\d{2}-\d{2}$/.test(storedDob)) {
        const [year, month, day] = storedDob.split('-');
        setDob(`${day}/${month}/${year}`);
      } else {
        setDob(storedDob);
      }
    });

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const formatDateInput = (text: string) => {
    // Supprimer tous les caractères non numériques
    const numbers = text.replace(/[^\d]/g, '');
    
    // Limiter à 8 chiffres (JJMMAAAA)
    const limited = numbers.slice(0, 8);
    
    // Ajouter les slashes automatiquement
    let formatted = limited;
    if (limited.length >= 3) {
      formatted = `${limited.slice(0, 2)}/${limited.slice(2)}`;
    }
    if (limited.length >= 5) {
      formatted = `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
    
    setDob(formatted);
  };

  const onNext = async () => {
    if (!firstName || !lastName || !dob) {
      Alert.alert(t('onboard_name_required'), t('onboard_name_required_msg'));
      return;
    }

    // Vérifier le format JJ/MM/AAAA
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      Alert.alert(t('onboard_name_date_format'), t('onboard_name_date_format_msg'));
      return;
    }
    
    // Convertir JJ/MM/AAAA en AAAA-MM-JJ pour le backend
    const [day, month, year] = dob.split('/');
    const formattedDob = `${year}-${month}-${day}`;

    // Vérifier l'âge minimum (13 ans)
    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear()
      - (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
    if (age < 13) {
      Alert.alert(t('onboard_name_age_title'), t('onboard_name_age_msg'));
      return;
    }

    await mergeProfileDraft(session, { firstName, lastName, dob: formattedDob });
    await AsyncStorage.setItem('onboarding_seen', '1');
    router.push('/(onboarding)/country');
  };

  return (
    <ThemedSafeArea edges={['top']} style={{ backgroundColor: '#ffffff' }}>
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
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              {/* Barre de progression */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#1E3A5F', '#0F2744']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressFill}
                  />
                </View>
                <Text style={styles.progressText}>{t('onboard_name_step')}</Text>
              </View>

              <Text style={styles.title}>{t('onboard_name_title')}</Text>
              <Text style={styles.subtitle}>{t('onboard_name_subtitle')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('onboard_name_first')}</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'firstName' && styles.inputContainerFocused
                ]}>
                  <TextInput
                    placeholder={t('onboard_name_first_ph')}
                    placeholderTextColor="#94A3B8"
                    color="#0f172a"
                    value={firstName}
                    onChangeText={setFirstName}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    style={styles.input}
                    returnKeyType="next"
                    autoCapitalize="words"
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('onboard_name_last')}</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'lastName' && styles.inputContainerFocused
                ]}>
                  <TextInput
                    ref={lastNameRef}
                    placeholder={t('onboard_name_last_ph')}
                    placeholderTextColor="#94A3B8"
                    color="#0f172a"
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    style={styles.input}
                    returnKeyType="next"
                    autoCapitalize="words"
                    onSubmitEditing={() => dobRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('onboard_name_dob')}</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'dob' && styles.inputContainerFocused
                ]}>
                  <TextInput
                    ref={dobRef}
                    placeholder={t('onboard_name_dob_ph')}
                    placeholderTextColor="#94A3B8"
                    color="#0f172a"
                    value={dob}
                    onChangeText={formatDateInput}
                    onFocus={() => setFocusedField('dob')}
                    onBlur={() => setFocusedField(null)}
                    style={styles.input}
                    returnKeyType="done"
                    keyboardType="numeric"
                    maxLength={10}
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </View>

            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 50 }]}>
            <Pressable style={styles.primaryWrapper} onPress={onNext}>
              <View style={styles.primaryButton}>
                <Text style={styles.primaryText}>{t('onboard_continue')}</Text>
              </View>
            </Pressable>
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
    width: '16.67%',
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
  form: { gap: 18 },
  field: { gap: 8 },
  label: { 
    color: '#1E293B', 
    fontWeight: '700', 
    fontSize: 15,
    marginLeft: 2,
  },
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  primaryWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
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
    backgroundColor: '#0f172a',
  },
  primaryText: { 
    color: '#ffffff', 
    fontWeight: '800', 
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
