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
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';
import { useAuth } from '@/providers/AuthProvider';
import { COUNTRIES, findCountryByName, iso2ToFlag, Country } from '@/lib/countries';
import { mergeProfileDraft, readProfileDraft } from '@/lib/profileDraft';

export default function PhoneStep() {
  const router = useRouter();
  const { session } = useAuth();
  const [phone, setPhone] = React.useState('');
  const [dialCode, setDialCode] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [countryOpen, setCountryOpen] = React.useState(false);
  const [countryQuery, setCountryQuery] = React.useState('');
  const [selected, setSelected] = React.useState<Country | null>(null);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);

  const phoneRef = React.useRef<TextInput>(null);

  const formatTwoByTwo = React.useCallback((value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 15);
    const groups = digits.match(/.{1,2}/g) || [];
    return { digits, formatted: groups.join(' ') };
  }, []);

  const hydratePhone = React.useCallback(
    (raw: string, dial?: string) => {
      const digitsOnly = raw.replace(/[^0-9]/g, '');
      const dialDigits = (dial || '').replace(/[^0-9]/g, '');
      const local = dialDigits && digitsOnly.startsWith(dialDigits) ? digitsOnly.slice(dialDigits.length) : digitsOnly;
      const { formatted } = formatTwoByTwo(local);
      setPhone(formatted);
    },
    [formatTwoByTwo]
  );

  React.useEffect(() => {
    let mounted = true;
    if (!session?.user?.id) {
      setPhone('');
      setDialCode('');
      setCountry('');
      setSelected(null);
      return;
    }
    readProfileDraft(session).then((draft) => {
      if (!mounted || !draft) return;
      if (draft.phone) hydratePhone(String(draft.phone), draft.dialCode || dialCode);
      if (draft.country) {
        const found = findCountryByName(String(draft.country));
        if (found) setSelected(found);
        setCountry(String(draft.country));
      }
      if (draft.dialCode) {
        setDialCode(String(draft.dialCode));
      } else if (draft.country) {
        const found = findCountryByName(String(draft.country));
        if (found) setDialCode(found.dialCode);
      }
    });

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const onNext = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      Alert.alert('Champ requis', "Merci d'indiquer ton numero de telephone.");
      return;
    }
    const { digits } = formatTwoByTwo(trimmed);
    const minDigits = selected?.dialCode === '+1' ? 10 : selected?.dialCode === '+33' ? 9 : 8;
    if (digits.length < minDigits) {
      Alert.alert('Numero invalide', `Entre un numero valide (${minDigits} chiffres minimum pour ton pays).`);
      return;
    }
    if (!dialCode) {
      Alert.alert('Pays requis', "Choisis ton pays pour recuperer l'indicatif.");
      return;
    }
    const full = `${dialCode}${digits}`;
    await mergeProfileDraft(session, { phone: full, dialCode, country });
    router.push('/(onboarding)/level');
  };

  const filtered = React.useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, 30);
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 30);
  }, [countryQuery]);

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
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              {/* Barre de progression */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: '50%' }]}
                  />
                </View>
                <Text style={styles.progressText}>3/6</Text>
              </View>

              <Text style={styles.title}>Numéro de{'\n'}téléphone</Text>
              <Text style={styles.subtitle}>
                Il peut aider à sécuriser ton compte
              </Text>
            </View>

            <View style={styles.form}>
              {/* Numéro de téléphone avec indicatif */}
              <View style={[styles.field, countryOpen && styles.fieldActive]}>
                <Text style={styles.label}>Numéro de téléphone</Text>
                <View style={[
                  styles.phoneContainer,
                  focusedField === 'phone' && styles.phoneContainerFocused
                ]}>
                  {/* Indicatif */}
                  <Pressable 
                    onPress={() => setCountryOpen((v) => !v)}
                    style={styles.dialCodeSection}
                  >
                    <Text style={styles.flagText}>
                      {selected ? iso2ToFlag(selected.iso2) : '🌍'}
                    </Text>
                    <Text style={styles.dialCodeText}>
                      {dialCode || '+00'}
                    </Text>
                    <Text style={styles.chevron}>▼</Text>
                  </Pressable>

                  {/* Séparateur */}
                  <View style={styles.separator} />

                  {/* Input numéro */}
                  <TextInput
                    ref={phoneRef}
                    placeholder="06 12 34 56 78"
                    placeholderTextColor="#94A3B8"
                    color="#0f172a"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    value={phone}
                    onChangeText={(t) => {
                      const { formatted } = formatTwoByTwo(t);
                      setPhone(formatted);
                    }}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    style={styles.phoneInput}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                {countryOpen && (
                  <View style={styles.dropdown}>
                    <View style={styles.searchContainer}>
                      <TextInput
                        placeholder="Rechercher un pays"
                        placeholderTextColor="#94A3B8"
                        color="#0f172a"
                        value={countryQuery}
                        onChangeText={setCountryQuery}
                        style={styles.searchInput}
                        autoFocus
                      />
                    </View>
                    <ScrollView
                      keyboardShouldPersistTaps="always"
                      style={styles.dropdownList}
                      nestedScrollEnabled
                    >
                      {filtered.map((item) => (
                        <Pressable
                          key={item.iso2}
                          style={styles.dropdownItem}
                          onPress={async () => {
                            setSelected(item);
                            setDialCode(item.dialCode);
                            setCountry(item.name);
                            setCountryOpen(false);
                            setCountryQuery('');
                            await mergeProfileDraft(session, {
                              country: item.name,
                              dialCode: item.dialCode,
                            });
                            phoneRef.current?.focus();
                          }}
                        >
                          <Text style={styles.dropdownText}>
                            {iso2ToFlag(item.iso2)}  {item.name}
                          </Text>
                          <Text style={styles.dropdownSubtext}>{item.dialCode}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {selected && phone && (
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
                      Format final : {dialCode} {phone}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <Pressable style={styles.secondaryWrapper} onPress={() => router.back()}>
                <View style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Retour</Text>
                </View>
              </Pressable>
              
              <Pressable style={styles.primaryWrapper} onPress={onNext}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryText}>Continuer</Text>
                  <View style={styles.arrowWrapper}>
                    <Text style={styles.arrowIcon}>→</Text>
                  </View>
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
    width: '100%',
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
  form: { gap: 18, marginBottom: 300 },
  field: { 
    gap: 8, 
    position: 'relative',
    zIndex: 1,
  },
  fieldActive: {
    zIndex: 1000,
  },
  label: { 
    color: '#1E293B', 
    fontWeight: '700', 
    fontSize: 15,
    marginLeft: 2,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  phoneContainerFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
  },
  dialCodeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  flagText: {
    fontSize: 20,
  },
  dialCodeText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    color: '#64748B',
    fontSize: 10,
  },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
    maxHeight: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    zIndex: 1000,
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownText: { 
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  dropdownSubtext: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  infoBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
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
  infoIcon: { 
    fontSize: 16,
  },
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
