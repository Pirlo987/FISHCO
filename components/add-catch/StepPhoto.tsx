import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { P } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/providers/LanguageProvider';

type Props = {
  imageUri: string | null;
  imageAspect: number | null;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onRemoveImage: () => void;
};

export const StepPhoto = React.memo(function StepPhoto({
  imageUri,
  imageAspect,
  onPickImage,
  onTakePhoto,
  onRemoveImage,
}: Props) {
  const { t } = useLanguage();
  if (imageUri) {
    return (
      <View style={styles.container}>
        <View style={styles.photoCard}>
          <View style={[styles.heroBox, imageAspect ? { aspectRatio: imageAspect } : null]}>
            <Image source={{ uri: imageUri }} style={styles.heroImage} contentFit="contain" />
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={onPickImage}
              style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="images-outline" size={16} color={P.blue} />
              <ThemedText style={styles.secondaryText}>{t('step_photo_change')}</ThemedText>
            </Pressable>
            <Pressable
              onPress={onRemoveImage}
              style={({ pressed }) => [styles.dangerBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="trash-outline" size={16} color="#991B1B" />
              <ThemedText style={styles.dangerText}>{t('step_photo_delete')}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.empty]}>
      <View style={styles.emptyCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="camera-outline" size={40} color={P.blue} />
        </View>
        <ThemedText style={styles.emptyTitle}>{t('step_photo_title')}</ThemedText>
        <ThemedText style={styles.emptySub}>{t('step_photo_hint')}</ThemedText>
        <View style={styles.buttons}>
          <Pressable
            onPress={onTakePhoto}
            style={({ pressed }) => [styles.cameraWrapper, { opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={[P.blueDark, '#0F2744']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cameraBtn}
            >
              <Ionicons name="camera" size={20} color={P.white} />
              <ThemedText style={styles.cameraBtnText}>{t('step_photo_camera')}</ThemedText>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.galleryBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="images-outline" size={18} color={P.blueDark} />
            <ThemedText style={styles.galleryBtnText}>{t('step_photo_gallery')}</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 16 },
  empty: { flex: 1, justifyContent: 'center', minHeight: 380 },

  photoCard: {
    borderRadius: 14,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    gap: 14,
  },
  heroBox: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: P.blueGhost,
  },
  heroImage: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', gap: 10 },

  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: P.blueGhost,
    borderWidth: 1,
    borderColor: P.borderBlue,
  },
  secondaryText: { fontSize: 14, fontWeight: '600', color: P.blue },

  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dangerText: { fontSize: 14, fontWeight: '700', color: '#991B1B' },

  emptyCard: {
    borderRadius: 14,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    padding: 36,
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: P.blueGhost,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: P.blueDeep },
  emptySub: { fontSize: 13, fontWeight: '400', color: P.slate, marginBottom: 16 },
  buttons: { flexDirection: 'column', gap: 12, width: '100%' },
  cameraWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: P.blueDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    width: '100%',
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  cameraBtnText: { fontSize: 15, fontWeight: '800', color: P.white, letterSpacing: 0.2 },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: P.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: P.border,
    width: '100%',
  },
  galleryBtnText: { fontSize: 14, fontWeight: '600', color: P.blueDark },
});
