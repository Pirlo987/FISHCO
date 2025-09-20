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
  FlatList,
} from 'react-native';
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
      if (draft.phone) setPhone(String(draft.phone));
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
      Alert.alert('Champ requis', 'Merci d’indiquer ton numéro de téléphone.');
      return;
    }
    const digits = trimmed.replace(/[^0-9]/g, '');
    if (digits.length < 8) {
      Alert.alert('Numéro invalide', 'Entre un numéro de téléphone valide (au moins 8 chiffres).');
      return;
    }
    if (!dialCode) {
      Alert.alert('Pays requis', 'Choisis ton pays pour récupérer l’indicatif.');
      return;
    }
    const full = `${dialCode}${digits}`;
    await mergeProfileDraft(session, { phone: full, dialCode, country });
    router.push('/(onboarding)/level');
  };

  const onBack = () => router.back();

  const filtered = React.useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, 30);
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 30);
  }, [countryQuery]);

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Ton numéro de téléphone</Text>
          <Text style={styles.subtitle}>Il peut aider à sécuriser ton compte</Text>

          <View style={[styles.phoneRow, { position: 'relative' }] }>
            <Pressable style={styles.dialCodeBox} onPress={() => setCountryOpen((v) => !v)}>
              <Text style={styles.dialCodeText}>
                {(selected ? iso2ToFlag(selected.iso2) + ' ' : '') + (dialCode || '+??')}
              </Text>
            </Pressable>
            <TextInput
              placeholder="Numéro de téléphone"
              placeholderTextColor="#9CA3AF"
              color="#111827"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              value={phone}
              onChangeText={setPhone}
              style={[styles.input, { flex: 1 }]}
            />

            {countryOpen && (
              <View style={styles.pickerPanel}>
                <TextInput
                  placeholder="Rechercher un pays"
                  placeholderTextColor="#9CA3AF"
                  color="#111827"
                  value={countryQuery}
                  onChangeText={setCountryQuery}
                  style={[styles.input, { margin: 8 }]}
                  autoFocus
                />
                <FlatList
                  keyboardShouldPersistTaps="always"
                  data={filtered}
                  keyExtractor={(item) => item.iso2}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.pickerItem}
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
                      }}
                    >
                      <Text style={styles.dropdownText}>
                        {iso2ToFlag(item.iso2)}  {item.name}{' '}
                        <Text style={{ color: '#6B7280' }}>{item.dialCode}</Text>
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </View>

          <View style={styles.row}>
            <Pressable style={[styles.button, styles.secondary]} onPress={onBack}>
              <Text style={styles.secondaryText}>Retour</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onNext}>
              <Text style={styles.buttonText}>Continuer</Text>
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
    gap: 12,
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
  phoneRow: { flexDirection: 'row', gap: 8 },
  dialCodeBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  dialCodeText: { color: '#111827', fontWeight: '600' },
  pickerPanel: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    maxHeight: 320,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    zIndex: 20,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownText: { color: '#111827' },
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
