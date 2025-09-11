import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { ThemedSafeArea } from '@/components/SafeArea';
import { FISH_SPECIES, normalizeName, type Species } from '@/constants/species';

export default function AddCatchScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [species, setSpecies] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [length, setLength] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [image, setImage] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [speciesOptions, setSpeciesOptions] = React.useState<Species[]>(FISH_SPECIES);

  // ---- Permissions ----
  const ensureLibraryPermission = React.useCallback(async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted || (Platform.OS === 'ios' && (current as any).accessPrivileges === 'limited')) return true;
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (req.granted || (Platform.OS === 'ios' && (req as any).accessPrivileges === 'limited')) return true;
    Alert.alert('Permission requise', "Autorise l'accès à la photothèque pour sélectionner une image.");
    return false;
  }, []);

  const requestCameraPermission = React.useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorise l'accès à la caméra pour prendre une photo.");
      return false;
    }
    return true;
  }, []);

  // ---- Sélection / Prise de photo ----
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
  // Liste des espèces (DB -> repli local)
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
          if (!cancelled) setSpeciesOptions(mapped);
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
  const prepareImageForUpload = async (asset: ImagePicker.ImagePickerAsset) => {
    // 🔒 Normalise TOUT en JPEG pour garantir un fichier local file:// lisible
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: manipulated.uri, ext: 'jpg', contentType: 'image/jpeg' };
  };

  // ⬇️ Upload bytes réels (ArrayBuffer), fini les fichiers 0 bytes
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

    // 1) Vérification du fichier local
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) throw new Error('Local file not found: ' + localUri);

    // 2) Lecture en base64 puis conversion en ArrayBuffer (octets)
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    if (!base64 || base64.length < 10) throw new Error('Empty base64 data');
    const arrayBuffer = decode(base64);

    // 3) Upload des octets à Supabase
    const { error } = await supabase.storage
      .from('catch-photos')
      .upload(filePath, arrayBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return filePath; // 👉 à stocker en BDD (colonne photo_path)
  };

  // ---- Submit ----
  const onSave = async () => {
    if (!session) {
      Alert.alert('Non connecté', 'Veuillez vous connecter.');
      return;
    }
    if (!species.trim()) {
      Alert.alert('Espèce requise', "Merci d'indiquer l'espèce pêchée.");
      return;
    }

    setLoading(true);

    let photoPath: string | undefined = undefined;
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
          "Upload bloqué par RLS. Vérifie :\n• bucket `catch-photos`\n• chemin `catches/{auth.uid()}/...`\n• policies INSERT/UPDATE/DELETE actives"
        );
      } else {
        Alert.alert('Photo non importée', "Impossible d'importer la photo. La prise sera enregistrée sans image.");
      }
    }

    const payload: any = {
      user_id: session.user.id,
      species: species.trim(),
      notes: notes.trim() || null,
      caught_at: new Date().toISOString(),
    };
    if (photoPath) payload.photo_path = photoPath; // ✅ on n’envoie la colonne que si on a une photo
    if (weight) payload.weight_kg = parseFloat(weight.replace(',', '.'));
    if (length) payload.length_cm = parseFloat(length.replace(',', '.'));

    const { error } = await supabase.from('catches').insert([payload]);
    setLoading(false);
    if (error) {
      Alert.alert('Sauvegarde impossible', error.message);
      return;
    }
    Alert.alert('Ajouté ✔️', 'La prise a été enregistrée.');
    router.replace('/(tabs)/history');
  };

  // ---- UI ----
  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.form}>
          <Text style={styles.title}>Ajouter une prise</Text>
          <TextInput placeholder="Espèce (obligatoire)" value={species} onChangeText={setSpecies} style={styles.input} />
          <TextInput placeholder="Poids (kg)" value={weight} onChangeText={setWeight} style={styles.input} keyboardType="decimal-pad" />
          <TextInput placeholder="Taille (cm)" value={length} onChangeText={setLength} style={styles.input} keyboardType="decimal-pad" />
          <TextInput placeholder="Notes (optionnel)" value={notes} onChangeText={setNotes} style={[styles.input, { height: 100 }]} multiline />

          {image?.uri ? (
            <View style={styles.previewRow}>
              <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
              <Pressable onPress={() => setImage(null)} style={[styles.secondaryButton, { marginLeft: 12 }]}>
                <Text style={styles.secondaryButtonText}>Retirer la photo</Text>
              </Pressable>
            </View>
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

          {!!speciesSuggestions.length && (
            <View style={styles.suggestions}>
              {speciesSuggestions.map((s) => (
                <Pressable key={s.name} onPress={() => setSpecies(s.name)} style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable onPress={onSave} style={[styles.button, loading && { opacity: 0.7 }]} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Enregistrement…' : 'Enregistrer'}</Text>
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
  title: { fontSize: 22, fontWeight: '600', marginVertical: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  suggestionChip: { backgroundColor: '#f1f1f1', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  suggestionText: { color: '#333' },
  button: { backgroundColor: '#1e90ff', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
  secondaryButton: { backgroundColor: '#f1f1f1', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  secondaryButtonText: { color: '#333', fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#eee' },
});
