import React from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { events } from '@/lib/events';
import { useAuth } from '@/providers/AuthProvider';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
// Use legacy API to avoid SDK 54 deprecation warnings
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { ThemedSafeArea } from '@/components/SafeArea';
import { FISH_SPECIES, normalizeName, type Species } from '@/constants/species';

export default function AddCatchScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [species, setSpecies] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [length, setLength] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [image, setImage] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [speciesOptions, setSpeciesOptions] = React.useState<Species[]>(FISH_SPECIES);
  const [errors, setErrors] = React.useState<{ species?: string; weight?: string; length?: string; image?: string }>({});
  const [speciesFocused, setSpeciesFocused] = React.useState(false);

  // ---- Permissions ----
  const ensureLibraryPermission = React.useCallback(async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted || (Platform.OS === 'ios' && (current as any).accessPrivileges === 'limited')) return true;
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (req.granted || (Platform.OS === 'ios' && (req as any).accessPrivileges === 'limited')) return true;
    Alert.alert('Permission requise', "Autorise l'accÃ¨s Ã  la photothÃ¨que pour sÃ©lectionner une image.");
    return false;
  }, []);

  const requestCameraPermission = React.useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorise l'accÃ¨s Ã  la camÃ©ra pour prendre une photo.");
      return false;
    }
    return true;
  }, []);

  // ---- SÃ©lection / Prise de photo ----
  const onPickImage = React.useCallback(async () => {
    const ok = await ensureLibraryPermission();
    if (!ok) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // expo-image-picker >=16
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled) setImage(res.assets[0]);
  }, [ensureLibraryPermission]);

  const onTakePhoto = React.useCallback(async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled) setImage(res.assets[0]);
  }, [requestCameraPermission]);

  // ---- Helpers ----
  // Liste des espÃ¨ces (DB -> repli local)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('species')
          .select('*');
        if (!error && data && Array.isArray(data)) {
          const mapped: Species[] = (data as any[])
            .map((r) => {
              const name = r.name ?? r.nom ?? r['Nom commun'] ?? r['nom commun'] ?? r.french_name ?? r.label ?? r.title ?? '';
              const image = r.image_url ?? r.image ?? r.photo_url ?? r.url ?? r.image_path ?? r.url_path ?? undefined;
              return { name, image } as Species;
            })
            .filter((s) => s.name);
          // Deduplicate by normalized name to avoid duplicate keys in lists
          const byKey = new Map<string, Species>();
          for (const s of mapped) {
            const key = normalizeName(s.name);
            if (!byKey.has(key)) byKey.set(key, s);
          }
          if (!cancelled) setSpeciesOptions(Array.from(byKey.values()));
          return;
        }
      } catch {}
      if (!cancelled) setSpeciesOptions(FISH_SPECIES);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const speciesSuggestions = React.useMemo(() => {
    const q = normalizeName(species);
    if (!q) return speciesOptions.slice(0, 8);
    return speciesOptions
      .filter((s) => normalizeName(s.name).includes(q))
      .slice(0, 8);
  }, [species, speciesOptions]);
  React.useEffect(() => {
    if (errors.species && species.trim()) setErrors((e) => ({ ...e, species: undefined }));
  }, [species]);
  React.useEffect(() => {
    if (errors.image && image?.uri) setErrors((e) => ({ ...e, image: undefined }));
  }, [image]);
  const isPositiveNumber = (v: string) => {
    if (!v || !v.trim()) return false;
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) && n > 0;
  };
  const validate = () => {
    const next: { species?: string; weight?: string; length?: string; image?: string } = {};
    if (!species.trim()) next.species = "EspÃ¨ce requise";
    if (!isPositiveNumber(weight)) next.weight = 'Poids requis (> 0)';
    if (!isPositiveNumber(length)) next.length = 'Taille requise (> 0)';
    if (!image?.uri) next.image = 'Photo requise';
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const prepareImageForUpload = async (asset: ImagePicker.ImagePickerAsset) => {
    // ðŸ”’ Normalise TOUT en JPEG pour garantir un fichier local file:// lisible
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: manipulated.uri, ext: 'jpg', contentType: 'image/jpeg' };
  };

  // â¬‡ï¸ Upload bytes rÃ©els (ArrayBuffer), fini les fichiers 0 bytes
  const uploadToSupabase = async (
    localUri: string,
    ext: string,
    contentType: string,
    userId: string
  ) => {
    // Chemin: catches/{user_id}/YYYYMMDDHHmmss-{rand}.{ext}
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const rand = Math.random().toString(36).slice(2, 8);
    const filePath = `catches/${userId}/${stamp}-${rand}.${ext}`;

    // 1) VÃ©rification du fichier local
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) throw new Error('Local file not found: ' + localUri);

    // 2) Lecture en base64 puis conversion en ArrayBuffer (octets)
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    if (!base64 || base64.length < 10) throw new Error('Empty base64 data');
    const arrayBuffer = decode(base64);

    // 3) Upload des octets Ã  Supabase
    const { error } = await supabase.storage
      .from('catch-photos')
      .upload(filePath, arrayBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return filePath; // ðŸ‘‰ Ã  stocker en BDD (colonne photo_path)
  };

  // ---- Submit ----
  const onSave = async () => {
    if (!session) {
      Alert.alert('Non connectÃ©', 'Veuillez vous connecter.');
      return;
    }
    if (!validate()) { Alert.alert('Champs requis', 'ComplÃ¨te les champs obligatoires.'); return; }
    if (!species.trim()) {
      Alert.alert('EspÃ¨ce requise', "Merci d'indiquer l'espÃ¨ce pÃªchÃ©e.");
      return;
    }

    setLoading(true);

    let photoPath: string | undefined = undefined;
    if (!image?.uri) {
      setLoading(false);
      setErrors((e) => ({ ...e, image: 'Photo requise' }));
      Alert.alert('Photo requise', "Ajoute une photo pour enregistrer la prise.");
      return;
    }
    try {
      if (image?.uri) {
        const prep = await prepareImageForUpload(image);
        photoPath = await uploadToSupabase(prep.uri, prep.ext, prep.contentType, session.user.id);
      }
    } catch (e: any) {
      console.warn('Image upload failed:', e?.message ?? e);
      const msg = `${e?.message || e}`;
      if (/row-level security/i.test(msg)) {
        Alert.alert(
          'RLS Supabase',
          "Upload bloquÃ© par RLS. VÃ©rifie :\nâ€¢ bucket `catch-photos`\nâ€¢ chemin `catches/{auth.uid()}/...`\nâ€¢ policies INSERT/UPDATE/DELETE actives"
        );
      } else {
        Alert.alert('Photo non importÃ©e', "Impossible d'importer la photo. La prise sera enregistrÃ©e sans image.");
      }
    }

    const payload: any = {
      user_id: session.user.id,
      species: species.trim(),
      notes: notes.trim() || null,
      caught_at: new Date().toISOString(),
    };
    if (photoPath) payload.photo_path = photoPath; // âœ… on nâ€™envoie la colonne que si on a une photo
    if (weight) payload.weight_kg = parseFloat(weight.replace(',', '.'));
    if (length) payload.length_cm = parseFloat(length.replace(',', '.'));

    const { error } = await supabase.from('catches').insert([payload]);
    setLoading(false);
    if (error) {
      Alert.alert('Sauvegarde impossible', error.message);
      return;
    }
    Alert.alert('AjoutÃ© âœ”ï¸', 'La prise a Ã©tÃ© enregistrÃ©e.');
    // Notifier les autres Ã©crans (Explorer) qu'une prise vient d'Ãªtre ajoutÃ©e
    try {
      events.emit('catch:added', { species: species.trim(), photoPath });
    } catch {}
    router.replace('/(tabs)/history');
  };

  // ---- UI ----
  return (
    <ThemedSafeArea edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.container, { paddingTop: 16 + insets.top }] }>
        <View style={styles.form}>
          {image?.uri ? (
            <View style={[styles.hero, { marginTop: -insets.top, marginHorizontal: -16 }] }>
              <Image source={{ uri: image.uri }} style={styles.heroImage} contentFit="cover" />
            </View>
          ) : null}
          <Text style={styles.title}>Ajouter une prise</Text>
          {!!errors.species && <Text style={styles.errorText}>{errors.species}</Text>}
          <TextInput placeholder="Esp��ce (obligatoire)" placeholderTextColor="#9CA3AF" value={species} onChangeText={(t) => { setSpecies(t); if (errors.species) setErrors((e) => ({ ...e, species: undefined })); }} onFocus={() => setSpeciesFocused(true)} onBlur={() => setTimeout(() => setSpeciesFocused(false), 120)} style={[styles.input, errors.species && styles.inputError]} autoCapitalize="words" autoCorrect={false} />
          {speciesFocused && !!species.trim() && !!speciesSuggestions.length && (
            <View style={styles.suggestions}>
              {speciesSuggestions.map((s, i) => (
                <Pressable key={`${normalizeName(s.name)}-${i}`} onPress={() => { setSpecies(s.name); if (errors.species) setErrors((e) => ({ ...e, species: undefined })); setSpeciesFocused(false); try { Keyboard.dismiss(); } catch {} }} style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput placeholder="Poids (kg)*" placeholderTextColor="#9CA3AF" value={weight} onChangeText={(t) => { setWeight(t); if (errors.weight) setErrors((e) => ({ ...e, weight: undefined })); }} style={[styles.input, errors.weight && styles.inputError]} keyboardType="decimal-pad" />
          {!!errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
          <TextInput placeholder="Taille (cm)*" placeholderTextColor="#9CA3AF" value={length} onChangeText={(t) => { setLength(t); if (errors.length) setErrors((e) => ({ ...e, length: undefined })); }} style={[styles.input, errors.length && styles.inputError]} keyboardType="decimal-pad" />
          {!!errors.length && <Text style={styles.errorText}>{errors.length}</Text>}
          <TextInput placeholder="Notes (optionnel)" placeholderTextColor="#9CA3AF" value={notes} onChangeText={setNotes} style={[styles.input, { height: 100 }]} multiline />

          {image?.uri ? (
            <Pressable onPress={() => setImage(null)} style={[styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Retirer la photo</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={onPickImage} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Choisir une photo</Text>
              </Pressable>
              <Pressable onPress={onTakePhoto} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Prendre une photo</Text>
              </Pressable>
            </View>
          )}
          {!!errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
          <Pressable onPress={onSave} style={[styles.button, loading && { opacity: 0.7 }]} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Enregistrementâ€¦' : 'Enregistrer'}</Text>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  form: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 12 },
  hero: { height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee', marginBottom: 8 },
  heroImage: { width: '100%', height: '100%' },
  title: { fontSize: 22, fontWeight: '600', marginVertical: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  inputError: { borderColor: '#e11d48' },
  errorText: { color: '#e11d48', marginTop: -6, marginBottom: 6 },
  suggestions: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionChip: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  suggestionText: { color: '#111' },
  button: { backgroundColor: '#1e90ff', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
  secondaryButton: { backgroundColor: '#f1f1f1', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  secondaryButtonText: { color: '#333', fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#eee' },
});


