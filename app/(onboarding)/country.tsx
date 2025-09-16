import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';
import { COUNTRIES, findCountryByName, iso2ToFlag, Country } from '@/lib/countries';

export default function CountryStep() {
  const router = useRouter();
  const [input, setInput] = React.useState('');
  const [selected, setSelected] = React.useState<Country | null>(null);
  const [showList, setShowList] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('profile_draft').then((v) => {
      if (!v) return;
      try {
        const d = JSON.parse(v);
        if (d.country) {
          const found = findCountryByName(d.country);
          if (found) {
            setInput(found.name);
            setSelected(found);
          } else {
            setInput(String(d.country));
          }
        }
      } catch {}
    });
  }, []);

  const onNext = async () => {
    const cleaned = input.trim();
    if (!cleaned) {
      Alert.alert('Champ requis', 'Merci d’indiquer ton pays de résidence.');
      return;
    }
    let country: Country | undefined = selected ?? findCountryByName(cleaned);
    if (!country) {
      const loose = COUNTRIES.find((c) => c.name.toLowerCase() === cleaned.toLowerCase());
      if (loose) country = loose;
    }
    if (!country) {
      Alert.alert('Sélection requise', 'Choisis un pays dans la liste.');
      return;
    }
    await AsyncStorage.mergeItem('profile_draft', JSON.stringify({ country: country.name, dialCode: country.dialCode }));
    router.push('/(onboarding)/phone');
  };

  const onBack = () => router.back();

  const filtered = React.useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, 20);
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [input]);

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Pays de résidence</Text>
          <Text style={styles.subtitle}>Où habites-tu ?</Text>

          <View style={{ position: 'relative' }}>
            <TextInput
              placeholder="Pays (ex: France)"
              placeholderTextColor="#9CA3AF"
              color="#111827"
              value={input}
              onChangeText={(t) => {
                setInput(t);
                setSelected(null);
                setShowList(true);
              }}
              onFocus={() => setShowList(true)}
              style={styles.input}
            />
            {showList && (
              <View style={styles.dropdown}>
                <FlatList
                  keyboardShouldPersistTaps="always"
                  data={filtered}
                  keyExtractor={(item) => item.iso2}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelected(item);
                        setInput(item.name);
                        setShowList(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>
                        {iso2ToFlag(item.iso2)}  {item.name}  <Text style={{ color: '#6B7280' }}>{item.dialCode}</Text>
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </View>

          {selected && (
            <Text style={{ color: '#6B7280' }}>Indicatif: {iso2ToFlag(selected.iso2)} {selected.dialCode}</Text>
          )}

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
  card: { width: '100%', maxWidth: 480, gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#6B7280', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 },
  row: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, backgroundColor: '#1e90ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  secondary: { backgroundColor: '#F3F4F6' },
  buttonText: { color: 'white', fontWeight: '700' },
  secondaryText: { color: '#111827', fontWeight: '600' },
  dropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    maxHeight: 220,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    zIndex: 10,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownText: { color: '#111827' },
});

