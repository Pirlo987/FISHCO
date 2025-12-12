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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';
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

  const ensureLibraryPermission = React.useCallback(async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted || (Platform.OS === 'ios' && (current as any).accessPrivileges === 'limited')) return true;
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (req.granted || (Platform.OS === 'ios' && (req as any).accessPrivileges === 'limited')) return true;
    Alert.alert('Permission requise', "Autorise l'acces a la phototheque pour selectionner une image.");
    return false;
  }, []);

  const requestCameraPermission = React.useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorise l'acces a la camera pour prendre une photo.");
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
    const manipulated = await ImageManipulator.manipulateAsync(asset.uri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { uri: manipulated.uri, ext: 'jpg', contentType: 'image/jpeg' };
  };

  const uploadAvatar = async (
    localUri: string,
    ext: string,
    contentType: string,
    userId: string
  ) => {
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

  const onSave = async () => {
    if (!session?.user?.id) {
      Alert.alert('Connexion requise', 'Connecte-toi pour terminer.');
      return;
    }
    if (!image?.uri) {
      Alert.alert('Photo requise', 'Ajoute une photo pour finaliser ton profil.');
      return;
    }
    try {
      setLoading(true);
      let avatar: { path?: string; publicUrl?: string | null } | null = null;
      const norm = await normalizeToJpeg(image);
      avatar = await uploadAvatar(norm.uri, norm.ext, norm.contentType, session.user.id);
      await finalizeProfile(avatar);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (/row level security/i.test(msg)) {
        Alert.alert(
          'RLS Supabase',
          "L'upload ou la sauvegarde est bloquee par une policy RLS. Assure-toi que les policies Storage (bucket 'avatars') autorisent INSERT sur le dossier {auth.uid()} et que la table 'profiles' autorise INSERT/UPDATE pour id = auth.uid().\n\nDetail: " +
            msg
        );
      } else {
        Alert.alert('Upload impossible', msg);
      }
      setLoading(false);
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
                  <Text style={styles.progressText}>6/6</Text>
                </View>

                <Text style={styles.title}>Photo de profil</Text>
                <Text style={styles.subtitle}>Ajoute un portrait carree, net et lumineux.</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.previewCard}>
                  {image?.uri ? (
                    <Image source={{ uri: image.uri }} style={styles.previewImage} contentFit="cover" />
                  ) : (
                    <View style={styles.previewPlaceholder}>
                      <Text style={styles.previewText}>Apercu</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionsRow}>
                  <Pressable style={[styles.secondaryWrapper, loading && styles.disabled]} onPress={onPickImage} disabled={loading}>
                    <View style={styles.secondaryButton}>
                      <Text style={styles.secondaryText}>Choisir une photo</Text>
                    </View>
                  </Pressable>
                  <Pressable style={[styles.secondaryWrapper, loading && styles.disabled]} onPress={onTakePhoto} disabled={loading}>
                    <View style={styles.secondaryButton}>
                      <Text style={styles.secondaryText}>Prendre une photo</Text>
                    </View>
                  </Pressable>
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
                      Conseil: pose comme si tu tenais le poisson de l'annee (mais evite les filtres de licorne).
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.secondaryWrapper, loading && styles.disabled]}
                onPress={() => router.back()}
                disabled={loading}
              >
                <View style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Retour</Text>
                </View>
              </Pressable>

                <Pressable style={[styles.primaryWrapper, loading && styles.disabled]} onPress={onSave} disabled={loading}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryText}>{loading ? 'Enregistrement...' : 'Terminer'}</Text>
                    <View style={styles.arrowWrapper}>
                      <Text style={styles.arrowIcon}>{'>'}</Text>
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
  form: { gap: 18 },
  previewCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#E5E7EB',
  },
  previewPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: { color: '#94A3B8', fontWeight: '700' },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
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
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  secondaryText: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 15,
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
  disabled: { opacity: 0.7 },
});
