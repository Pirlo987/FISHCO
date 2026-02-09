import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { ThemedSafeArea } from '@/components/SafeArea';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { COUNTRIES, iso2ToFlag } from '@/lib/countries';

type ProfileRow = {
  country: string | null;
  level: string | null;
  phone: string | null;
  dob: string | null;
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  experienced: 'Expérimenté',
  expert: 'Expert',
};

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ProfileRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [readOnly, setReadOnly] = React.useState(true);
  const [showCountryList, setShowCountryList] = React.useState(false);

  React.useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .from('profiles')
      .select('country,level,phone,dob')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        const row = (data ?? null) as ProfileRow | null;
        setProfile(row);
        setForm(row);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ? String(err.message) : 'Chargement impossible');
        setProfile(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const onChangeField = (key: keyof ProfileRow, value: string) => {
    setForm((prev) => ({ ...(prev || { country: null, level: null, phone: null, dob: null }), [key]: value }));
  };

  const onSave = async () => {
    if (!session?.user?.id) {
      Alert.alert('Connexion requise', 'Connecte-toi pour modifier ces informations.');
      return;
    }
    const payload: Partial<ProfileRow> = {
      country: form?.country ?? null,
      level: form?.level ?? null,
      phone: form?.phone ?? null,
      dob: form?.dob ?? null,
    };
    setSaving(true);
    try {
      const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', session.user.id);
      if (updateError) throw updateError;
      setProfile((prev) => ({ ...(prev || {}), ...payload }));
      setReadOnly(true);
      Alert.alert('Enregistré', 'Tes informations ont été mises à jour.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ? String(e.message) : 'Impossible de mettre à jour les informations.');
    } finally {
      setSaving(false);
    }
  };

  const levelLabel = profile?.level ? LEVEL_LABELS[profile.level] ?? profile.level : null;
  const filteredCountries = React.useMemo(() => {
    const query = (form?.country ?? '').trim().toLowerCase();
    if (!query) return COUNTRIES.slice(0, 15);
    return COUNTRIES.filter((country) => country.name.toLowerCase().includes(query)).slice(0, 15);
  }, [form?.country]);

  const toggleEdit = () => {
    if (readOnly) {
      setForm(profile);
      setReadOnly(false);
      setShowCountryList(false);
    } else {
      setForm(profile);
      setReadOnly(true);
      setShowCountryList(false);
    }
  };

  React.useEffect(() => {
    if (readOnly) setShowCountryList(false);
  }, [readOnly]);

  const onSignOut = async () => {
    await signOut();
    router.back();
  };

  return (
    <ThemedSafeArea style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Informations</Text>
        <Pressable onPress={toggleEdit} hitSlop={10} style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color="#111827" />
          <Text style={styles.editText}>{readOnly ? 'Modifier les informations' : 'Annuler'}</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
        </View>
      ) : !session ? (
        <View style={styles.loadingRow}>
          <Text style={styles.errorText}>Connecte-toi pour consulter ces informations.</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingRow}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pays</Text>
            {readOnly ? (
              <Text style={styles.fieldValue}>{profile?.country || '—'}</Text>
            ) : (
              <View style={{ gap: 8 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Ton pays"
                  value={form?.country ?? ''}
                  onFocus={() => setShowCountryList(true)}
                  onChangeText={(text) => {
                    onChangeField('country', text);
                    setShowCountryList(true);
                  }}
                />
                {showCountryList && filteredCountries.length > 0 ? (
                  <View style={styles.countryDropdown}>
                    {filteredCountries.map((country) => (
                      <Pressable
                        key={country.iso2}
                        style={styles.countryOption}
                        onPress={() => {
                          onChangeField('country', country.name);
                          setShowCountryList(false);
                        }}>
                        <Text style={styles.countryOptionText}>
                          {iso2ToFlag(country.iso2)} {country.name}
                        </Text>
                        <Text style={styles.countryDial}>{country.dialCode}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Niveau</Text>
            {readOnly ? (
              <Text style={styles.fieldValue}>{levelLabel || '—'}</Text>
            ) : (
              <TextInput
                style={styles.input}
                placeholder={levelLabel || 'Débutant, Intermédiaire...'}
                value={form?.level ?? ''}
                onChangeText={(text) => onChangeField('level', text)}
              />
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Téléphone</Text>
            {readOnly ? (
              <Text style={styles.fieldValue}>{profile?.phone || '—'}</Text>
            ) : (
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="+33 6 00 00 00 00"
                value={form?.phone ?? ''}
                onChangeText={(text) => onChangeField('phone', text)}
              />
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date de naissance</Text>
            {readOnly ? (
              <Text style={styles.fieldValue}>{profile?.dob || '—'}</Text>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={form?.dob ?? ''}
                  onChangeText={(text) => onChangeField('dob', text)}
                />
                <Text style={styles.fieldHint}>Format AAAA-MM-JJ (ex: 1990-05-12)</Text>
              </>
            )}
          </View>
        </ScrollView>
      )}
      {session && !readOnly ? (
        <Pressable onPress={onSave} style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }]} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
        </Pressable>
      ) : null}
      {session && readOnly ? (
        <Pressable onPress={onSignOut} style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.85 }]}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      ) : null}
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  editText: { fontWeight: '600', color: '#111827', fontSize: 13 },
  loadingRow: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#b91c1c', textAlign: 'center' },
  form: { flexGrow: 1, gap: 18, paddingVertical: 16 },
  field: { gap: 6 },
  fieldLabel: { fontWeight: '600', color: '#374151' },
  fieldValue: { fontWeight: '600', color: '#111827' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldHint: { color: '#6B7280', fontSize: 12 },
  countryDropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    maxHeight: 220,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  countryOptionText: { fontSize: 15, color: '#111827' },
  countryDial: { color: '#6B7280', fontSize: 12 },
  saveButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveText: { color: '#fff', fontWeight: '700' },
  logoutButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  logoutText: { color: '#B91C1C', fontWeight: '700' },
});
