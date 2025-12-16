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
import { ThemedSafeArea } from '@/components/SafeArea';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { COUNTRIES, findCountryByName, iso2ToFlag, Country } from '@/lib/countries';
import { mergeProfileDraft, readProfileDraft } from '@/lib/profileDraft';

// Liste locale étendue de villes avec leur pays
const LOCAL_CITIES = [
  { name: 'Paris', country: 'France', countryCode: 'FR' },
  { name: 'Lyon', country: 'France', countryCode: 'FR' },
  { name: 'Marseille', country: 'France', countryCode: 'FR' },
  { name: 'Toulouse', country: 'France', countryCode: 'FR' },
  { name: 'Bordeaux', country: 'France', countryCode: 'FR' },
  { name: 'Lille', country: 'France', countryCode: 'FR' },
  { name: 'Nantes', country: 'France', countryCode: 'FR' },
  { name: 'Strasbourg', country: 'France', countryCode: 'FR' },
  { name: 'Montpellier', country: 'France', countryCode: 'FR' },
  { name: 'Rennes', country: 'France', countryCode: 'FR' },
  { name: 'Nice', country: 'France', countryCode: 'FR' },
  { name: 'Grenoble', country: 'France', countryCode: 'FR' },
  { name: 'Dijon', country: 'France', countryCode: 'FR' },
  { name: 'Tours', country: 'France', countryCode: 'FR' },
  { name: 'Clermont-Ferrand', country: 'France', countryCode: 'FR' },
  { name: 'Nancy', country: 'France', countryCode: 'FR' },
  { name: 'Metz', country: 'France', countryCode: 'FR' },
  { name: 'Reims', country: 'France', countryCode: 'FR' },
  { name: 'Rouen', country: 'France', countryCode: 'FR' },
  { name: 'Le Havre', country: 'France', countryCode: 'FR' },
  { name: 'Brest', country: 'France', countryCode: 'FR' },
  { name: 'Angers', country: 'France', countryCode: 'FR' },
  { name: 'Toulon', country: 'France', countryCode: 'FR' },
  { name: 'Bruxelles', country: 'Belgique', countryCode: 'BE' },
  { name: 'Anvers', country: 'Belgique', countryCode: 'BE' },
  { name: 'Gand', country: 'Belgique', countryCode: 'BE' },
  { name: 'Charleroi', country: 'Belgique', countryCode: 'BE' },
  { name: 'Liège', country: 'Belgique', countryCode: 'BE' },
  { name: 'Genève', country: 'Suisse', countryCode: 'CH' },
  { name: 'Lausanne', country: 'Suisse', countryCode: 'CH' },
  { name: 'Zurich', country: 'Suisse', countryCode: 'CH' },
  { name: 'Berne', country: 'Suisse', countryCode: 'CH' },
  { name: 'Bâle', country: 'Suisse', countryCode: 'CH' },
  { name: 'Montréal', country: 'Canada', countryCode: 'CA' },
  { name: 'Québec', country: 'Canada', countryCode: 'CA' },
  { name: 'Toronto', country: 'Canada', countryCode: 'CA' },
  { name: 'Vancouver', country: 'Canada', countryCode: 'CA' },
  { name: 'Ottawa', country: 'Canada', countryCode: 'CA' },
  { name: 'Londres', country: 'Royaume-Uni', countryCode: 'GB' },
  { name: 'Manchester', country: 'Royaume-Uni', countryCode: 'GB' },
  { name: 'Birmingham', country: 'Royaume-Uni', countryCode: 'GB' },
  { name: 'Madrid', country: 'Espagne', countryCode: 'ES' },
  { name: 'Barcelone', country: 'Espagne', countryCode: 'ES' },
  { name: 'Valence', country: 'Espagne', countryCode: 'ES' },
  { name: 'Séville', country: 'Espagne', countryCode: 'ES' },
  { name: 'Berlin', country: 'Allemagne', countryCode: 'DE' },
  { name: 'Munich', country: 'Allemagne', countryCode: 'DE' },
  { name: 'Hambourg', country: 'Allemagne', countryCode: 'DE' },
  { name: 'Francfort', country: 'Allemagne', countryCode: 'DE' },
  { name: 'Rome', country: 'Italie', countryCode: 'IT' },
  { name: 'Milan', country: 'Italie', countryCode: 'IT' },
  { name: 'Naples', country: 'Italie', countryCode: 'IT' },
  { name: 'Turin', country: 'Italie', countryCode: 'IT' },
  { name: 'Lisbonne', country: 'Portugal', countryCode: 'PT' },
  { name: 'Porto', country: 'Portugal', countryCode: 'PT' },
  { name: 'Amsterdam', country: 'Pays-Bas', countryCode: 'NL' },
  { name: 'Rotterdam', country: 'Pays-Bas', countryCode: 'NL' },
  { name: 'La Haye', country: 'Pays-Bas', countryCode: 'NL' },
  { name: 'Copenhague', country: 'Danemark', countryCode: 'DK' },
  { name: 'Stockholm', country: 'Suède', countryCode: 'SE' },
  { name: 'Oslo', country: 'Norvège', countryCode: 'NO' },
  { name: 'Dublin', country: 'Irlande', countryCode: 'IE' },
  { name: 'Vienne', country: 'Autriche', countryCode: 'AT' },
  { name: 'Prague', country: 'République tchèque', countryCode: 'CZ' },
  { name: 'Varsovie', country: 'Pologne', countryCode: 'PL' },
  { name: 'Budapest', country: 'Hongrie', countryCode: 'HU' },
  { name: 'Athènes', country: 'Grèce', countryCode: 'GR' },
];

export default function CountryStep() {
  const router = useRouter();
  const { session } = useAuth();
  const [cityInput, setCityInput] = React.useState('');
  const [showCityList, setShowCityList] = React.useState(false);
  const [countryInput, setCountryInput] = React.useState('');
  const [selectedCountry, setSelectedCountry] = React.useState<Country | null>(null);
  const [showCountryList, setShowCountryList] = React.useState(false);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);
  const [remoteCities, setRemoteCities] = React.useState<any[]>([]);
  const [cityLoading, setCityLoading] = React.useState(false);

  const countryRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    let mounted = true;
    if (!session?.user?.id) {
      setCountryInput('');
      setSelectedCountry(null);
      setCityInput('');
      return;
    }

    readProfileDraft(session).then((draft) => {
      if (!mounted || !draft) return;
      if (draft.city) {
        setCityInput(String(draft.city));
      }
      if (draft.country) {
        const found = findCountryByName(String(draft.country));
        if (found) {
          setCountryInput(found.name);
          setSelectedCountry(found);
        } else {
          setCountryInput(String(draft.country));
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const filteredCountries = React.useMemo(() => {
    const q = countryInput.trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, 20);
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [countryInput]);

  // Combiner les résultats locaux et de l'API
  const filteredCities = React.useMemo(() => {
    const q = cityInput.trim().toLowerCase();
    if (!q) return LOCAL_CITIES.slice(0, 10);

    // Recherche locale
    const localResults = LOCAL_CITIES
      .filter((c) => c.name.toLowerCase().includes(q))
      .map(c => ({
        name: c.name,
        country: c.country,
        country_code: c.countryCode,
        source: 'local'
      }));

    // Combiner avec les résultats de l'API
    const apiResults = remoteCities.map(c => ({
      ...c,
      source: 'api'
    }));

    // Dédupliquer par nom de ville
    const combined = [...localResults, ...apiResults];
    const seen = new Set<string>();
    const unique = combined.filter((c) => {
      const lower = c.name.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    return unique.slice(0, 15);
  }, [cityInput, remoteCities]);

  // Recherche de villes via l'API geocoding
  React.useEffect(() => {
    const q = cityInput.trim();
    if (q.length < 2) {
      setRemoteCities([]);
      return;
    }
    const controller = new AbortController();
    setCityLoading(true);
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=fr&format=json`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json || !Array.isArray(json.results)) {
          setRemoteCities([]);
          return;
        }
        setRemoteCities(json.results.slice(0, 10));
      })
      .catch(() => setRemoteCities([]))
      .finally(() => setCityLoading(false));
    return () => controller.abort();
  }, [cityInput]);

  const handleCitySelect = async (city: any) => {
    setCityInput(city.name);
    setShowCityList(false);
    
    // Auto-remplir le pays
    if (city.country_code) {
      const country = COUNTRIES.find(
        c => c.iso2.toUpperCase() === city.country_code.toUpperCase()
      );
      if (country) {
        setSelectedCountry(country);
        setCountryInput(country.name);
        await mergeProfileDraft(session, { 
          city: city.name,
          country: country.name,
          dialCode: country.dialCode
        });
      }
    }
    
    Keyboard.dismiss();
  };

  const onNext = async () => {
    const countryName = countryInput.trim();
    const cityName = cityInput.trim();

    if (!cityName) {
      Alert.alert('Champ requis', 'Merci d indiquer ta ville.');
      return;
    }
    if (!countryName) {
      Alert.alert('Champ requis', 'Merci d indiquer ton pays de residence.');
      return;
    }

    let country: Country | undefined = selectedCountry ?? findCountryByName(countryName);
    if (!country) {
      const loose = COUNTRIES.find((c) => c.name.toLowerCase() === countryName.toLowerCase());
      if (loose) country = loose;
    }
    if (!country) {
      Alert.alert('Selection requise', 'Choisis un pays dans la liste.');
      return;
    }

    await mergeProfileDraft(session, {
      country: country.name,
      dialCode: country.dialCode,
      city: cityName,
    });
    router.push('/(onboarding)/phone');
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
                    style={styles.progressFill}
                  />
                </View>
                <Text style={styles.progressText}>2/6</Text>
              </View>

              <Text style={styles.title}>Ville et{'\n'}pays</Text>
              <Text style={styles.subtitle}>
                On se rapproche de toi pour mieux personnaliser l'expérience
              </Text>
            </View>

            <View style={styles.form}>
              {/* VILLE EN PREMIER */}
              <View style={[styles.field, showCityList && styles.fieldActive]}>
                <Text style={styles.label}>Ville</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'city' && styles.inputContainerFocused
                ]}>
                  <TextInput
                    placeholder="Ville (ex: Paris)"
                    placeholderTextColor="#94A3B8"
                    color="#0f172a"
                    value={cityInput}
                    onChangeText={(t) => {
                      setCityInput(t);
                      setShowCityList(true);
                    }}
                    onFocus={() => {
                      setFocusedField('city');
                      setShowCityList(true);
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      setTimeout(() => setShowCityList(false), 200);
                    }}
                    style={styles.input}
                    returnKeyType="next"
                    autoCapitalize="words"
                    autoCorrect={false}
                    onSubmitEditing={() => {
                      Keyboard.dismiss();
                      countryRef.current?.focus();
                    }}
                    blurOnSubmit={false}
                  />
                </View>
                {showCityList && filteredCities.length > 0 && (
                  <View style={styles.dropdown}>
                    <ScrollView
                      keyboardShouldPersistTaps="always"
                      style={styles.dropdownList}
                      nestedScrollEnabled
                    >
                      {filteredCities.map((item, idx) => (
                        <Pressable
                          key={`${item.name}-${idx}`}
                          style={styles.dropdownItem}
                          onPress={() => handleCitySelect(item)}
                        >
                          <View style={styles.cityItem}>
                            <Text style={styles.dropdownText}>{item.name}</Text>
                            {item.country && (
                              <Text style={styles.dropdownSubtext}>
                                {item.country}
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {cityLoading && <Text style={styles.loadingText}>Recherche...</Text>}
              </View>

              {/* PAYS EN SECOND */}
              <View style={[styles.field, showCountryList && styles.fieldActive]}>
                <Text style={styles.label}>Pays de résidence</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'country' && styles.inputContainerFocused
                ]}>
                  <TextInput
                    ref={countryRef}
                    placeholder="Pays (ex: France)"
                    placeholderTextColor="#94A3B8"
                    color="#0f172a"
                    value={countryInput}
                    onChangeText={(t) => {
                      setCountryInput(t);
                      setSelectedCountry(null);
                      setShowCountryList(true);
                    }}
                    onFocus={() => {
                      setFocusedField('country');
                      setShowCountryList(true);
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      setTimeout(() => setShowCountryList(false), 200);
                    }}
                    style={styles.input}
                    returnKeyType="done"
                    autoCapitalize="words"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
                {showCountryList && filteredCountries.length > 0 && (
                  <View style={styles.dropdown}>
                    <ScrollView
                      keyboardShouldPersistTaps="always"
                      style={styles.dropdownList}
                      nestedScrollEnabled
                    >
                      {filteredCountries.map((item) => (
                        <Pressable
                          key={item.iso2}
                          style={styles.dropdownItem}
                          onPress={async () => {
                            setSelectedCountry(item);
                            setCountryInput(item.name);
                            setShowCountryList(false);
                            await mergeProfileDraft(session, { country: item.name, dialCode: item.dialCode });
                            Keyboard.dismiss();
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

              {selectedCountry && (
                <View style={styles.infoCard}>
                  <View style={styles.infoAccent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                    <Text style={styles.infoText}>
                      Indicatif téléphonique : {iso2ToFlag(selectedCountry.iso2)} {selectedCountry.dialCode}
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
    width: '33.33%',
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
  dropdown: {
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
    maxHeight: 320,
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
  dropdownList: {
    maxHeight: 320,
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
  cityItem: {
    flex: 1,
  },
  dropdownText: { 
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownSubtext: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  loadingText: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 2,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  infoAccent: {
    width: 4,
    backgroundColor: '#3B82F6',
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
