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
import { ThemedSafeArea } from '@/components/SafeArea';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { clearProfileDraft, readProfileDraft } from '@/lib/profileDraft';

export default function PhotoStep() {
  const router = useRouter();
  const { session } = useAuth();
  const [image, setImage] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // Pré-remplissage possible à implémenter plus tard.
  }, []);

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

  const onPickImage = React.useCallback(async () => {
    const ok = await ensureLibraryPermission();
    if (!ok) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    } as any);
    if (!res.canceled) setImage(res.assets[0]);
  }, [ensureLibraryPermission]);

  const onTakePhoto = React.useCallback(async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    } as any);
    if (!res.canceled) setImage(res.assets[0]);
  }, [requestCameraPermission]);

  const normalizeToJpeg = async (asset: ImagePicker.ImagePickerAsset) => {
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: manipulated.uri, ext: 'jpg', contentType: 'image/jpeg' };
  };

  const uploadAvatar = async (localUri: string, ext: string, contentType: string, userId: string) => {
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const rand = Math.random().toString(36).slice(2, 8);
    const filePath = `${userId}/${stamp}-${rand}.${ext}`;

    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) throw new Error('Local file not found: ' + localUri);

    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    if (!base64 || base64.length < 10) throw new Error('Empty base64 data');
    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, { contentType, cacheControl: '3600', upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return { path: filePath, publicUrl: data?.publicUrl || null };
  };

  const finalizeProfile = async (avatar: { path?: string | null; publicUrl?: string | null } | null) => {
    if (!session?.user?.id) {
      Alert.alert('Connexion requise', 'Connecte-toi pour terminer.');
      return;
    }
    const draft = await readProfileDraft(session);
    const d = draft ?? {};
    const rowBase: any = {
      id: session.user.id,
      first_name: d.firstName ?? null,
      last_name: d.lastName ?? null,
      dob: d.dob ?? null,
      country: d.country ?? null,
      level: d.level ?? null,
      username: d.username ?? null,
      updated_at: new Date().toISOString(),
    };
    if (d.phone) rowBase.phone = d.phone;

    const tryUpserts: any[] = [];
    if (avatar?.publicUrl) tryUpserts.push({ ...rowBase, avatar_url: avatar.publicUrl });
    if (avatar?.path) tryUpserts.push({ ...rowBase, avatar_path: avatar.path });
    if (avatar?.publicUrl) tryUpserts.push({ ...rowBase, photo_url: avatar.publicUrl });
    if (avatar?.path) tryUpserts.push({ ...rowBase, photo_path: avatar.path });
    if (tryUpserts.length === 0) tryUpserts.push(rowBase);

    let lastErr: any = null;
    for (const payload of tryUpserts) {
      const { error } = await supabase.from('profiles').upsert(payload);
      if (!error) {
        lastErr = null;
        break;
      }
      lastErr = error;
    }
    if (lastErr) throw lastErr;

    await clearProfileDraft();
    await AsyncStorage.removeItem('profile_onboarding_pending');
    await AsyncStorage.setItem('profile_onboarding_done', '1');
    await AsyncStorage.setItem('onboarding_seen', '1');
    router.replace('/(tabs)');
  };

  const onSkip = async () => {
    try {
      setLoading(true);
      await finalizeProfile(null);
    } catch (e: any) {
      Alert.alert('Impossible de terminer', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!session?.user?.id) {
      Alert.alert('Connexion requise', 'Connecte-toi pour terminer.');
      return;
    }
    try {
      setLoading(true);
      let avatar: { path?: string; publicUrl?: string | null } | null = null;
      if (image?.uri) {
        const norm = await normalizeToJpeg(image);
        avatar = await uploadAvatar(norm.uri, norm.ext, norm.contentType, session.user.id);
      }
      await finalizeProfile(avatar);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (/row level security/i.test(msg)) {
        Alert.alert(
          'RLS Supabase',
          "L'upload ou la sauvegarde est bloqué par une policy RLS. Assure-toi que les policies Storage (bucket 'avatars') autorisent INSERT sur le dossier {auth.uid()}/… et que la table 'profiles' autorise INSERT/UPDATE pour id = auth.uid().\n\nDétail: " + msg
        );
      } else {
        Alert.alert('Upload impossible', msg);
      }
      setLoading(false);
    }
  };

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Photo de profil</Text>
            <Text style={styles.subtitle}>Ajoute une photo (carrée de préférence)</Text>

            {image?.uri ? (
              <Image
                source={{ uri: image.uri }}
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  alignSelf: 'center',
                  marginVertical: 10,
                  backgroundColor: '#F3F4F6',
                }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  alignSelf: 'center',
                  marginVertical: 10,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#9CA3AF' }}>Aperçu</Text>
              </View>
            )}

            <View style={styles.row}>
              <Pressable style={[styles.button, styles.secondary]} onPress={onPickImage} disabled={loading}>
                <Text style={styles.secondaryText}>Choisir une photo</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.secondary]} onPress={onTakePhoto} disabled={loading}>
                <Text style={styles.secondaryText}>Prendre une photo</Text>
              </Pressable>
            </View>

            <View style={styles.row}>
              <Pressable style={[styles.button, styles.secondary]} onPress={onSkip} disabled={loading}>
                <Text style={styles.secondaryText}>Ignorer</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={onSave} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Enregistrement…' : 'Terminer'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
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
