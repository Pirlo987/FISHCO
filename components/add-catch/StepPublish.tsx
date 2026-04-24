import React from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { P } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/providers/LanguageProvider';

type Props = {
  visibility: 'public' | 'private';
  title: string;
  description: string;
  isKnownSpecies: boolean;
  onChangeVisibility: (v: 'public' | 'private') => void;
  onChangeTitle: (v: string) => void;
  onChangeDescription: (v: string) => void;
};

export const StepPublish = React.memo(function StepPublish({
  visibility,
  title,
  description,
  isKnownSpecies,
  onChangeVisibility,
  onChangeTitle,
  onChangeDescription,
}: Props) {
  const { t } = useLanguage();

  const handlePublic = React.useCallback(() => {
    if (!isKnownSpecies) {
      Alert.alert(t('step_publish_unknown_species'), t('step_publish_disabled_msg'));
      onChangeVisibility('private');
      return;
    }
    onChangeVisibility('public');
  }, [isKnownSpecies, onChangeVisibility, t]);

  const handlePrivate = React.useCallback(() => {
    onChangeVisibility('private');
  }, [onChangeVisibility]);

  const isPublic = visibility === 'public';
  const isPrivate = visibility === 'private';

  return (
    <View style={styles.container}>

      {/* ── Visibilité ────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionLabel}>{t('step_publish_visibility')}</ThemedText>

        <View style={styles.visibilityRow}>
          {/* Public */}
          <Pressable
            onPress={handlePublic}
            style={({ pressed }) => [
              styles.visCard,
              isPublic && styles.visCardActive,
              !isKnownSpecies && styles.visCardDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            {isPublic ? (
              <LinearGradient
                colors={[P.blueLight, P.borderBlue]}
                style={styles.visIconGradient}
              >
                <Ionicons name="earth" size={18} color={P.blue} />
              </LinearGradient>
            ) : (
              <View style={styles.visIconPlain}>
                <Ionicons name="earth-outline" size={18} color={P.slateLight} />
              </View>
            )}
            <View style={styles.visInfo}>
              <ThemedText style={[styles.visTitle, isPublic && styles.visTitleActive]}>
                {t('step_publish_public')}
              </ThemedText>
              <ThemedText style={styles.visSub}>Visible par tous</ThemedText>
            </View>
            <View style={[styles.radio, isPublic && styles.radioActive]}>
              {isPublic && <View style={styles.radioDot} />}
            </View>
          </Pressable>

          {/* Privée */}
          <Pressable
            onPress={handlePrivate}
            style={({ pressed }) => [
              styles.visCard,
              isPrivate && styles.visCardActivePrivate,
              pressed && { opacity: 0.85 },
            ]}
          >
            {isPrivate ? (
              <LinearGradient
                colors={['#475569', '#1E293B']}
                style={styles.visIconGradient}
              >
                <Ionicons name="lock-closed" size={16} color={P.white} />
              </LinearGradient>
            ) : (
              <View style={styles.visIconPlain}>
                <Ionicons name="lock-closed-outline" size={16} color={P.slateLight} />
              </View>
            )}
            <View style={styles.visInfo}>
              <ThemedText style={[styles.visTitle, isPrivate && styles.visTitlePrivate]}>
                {t('step_publish_private')}
              </ThemedText>
              <ThemedText style={styles.visSub}>Seulement toi</ThemedText>
            </View>
            <View style={[styles.radio, isPrivate && styles.radioActivePrivate]}>
              {isPrivate && <View style={styles.radioDotPrivate} />}
            </View>
          </Pressable>
        </View>

        {/* Avertissement espèce inconnue */}
        {!isKnownSpecies && (
          <View style={styles.warningCard}>
            <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
            <ThemedText style={styles.warningText}>
              {t('step_publish_private_msg')}
            </ThemedText>
          </View>
        )}
      </View>

      {/* ── Titre ─────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionLabel}>{t('step_publish_title_label')}</ThemedText>
        <View style={[styles.inputRow, title && styles.inputRowActive]}>
          <TextInput
            style={styles.inputText}
            placeholder={t('step_publish_title_label')}
            placeholderTextColor={P.slateLight}
            value={title}
            onChangeText={onChangeTitle}
          />
          {title && (
            <View style={styles.inputCheck}>
              <Ionicons name="checkmark" size={12} color={P.white} />
            </View>
          )}
        </View>
      </View>

      {/* ── Description ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <ThemedText style={styles.sectionLabel}>{t('step_publish_desc_label')}</ThemedText>
          <ThemedText style={styles.optionalTag}>Optionnel</ThemedText>
        </View>
        <TextInput
          style={[styles.textarea, description && styles.textareaActive]}
          placeholder={t('step_publish_tell')}
          placeholderTextColor={P.slateLight}
          multiline
          value={description}
          onChangeText={onChangeDescription}
        />
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 20 },

  section: { gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: P.blueDark,
    letterSpacing: 0.1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionalTag: {
    fontSize: 11,
    fontWeight: '500',
    color: P.slateLight,
  },

  // ── Visibilité ────────────────────────────────────────────────────────
  visibilityRow: { gap: 8 },
  visCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.border,
    padding: 14,
  },
  visCardActive: {
    borderColor: P.borderBlue,
    backgroundColor: P.blueGhost,
  },
  visCardActivePrivate: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  visCardDisabled: { opacity: 0.4 },

  visIconGradient: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  visIconPlain: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  visInfo: { flex: 1, gap: 2 },
  visTitle: { fontSize: 15, fontWeight: '700', color: P.slate },
  visTitleActive: { color: P.blue },
  visTitlePrivate: { color: '#334155' },
  visSub: { fontSize: 12, fontWeight: '400', color: P.slateLight },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioActive: { borderColor: P.blue },
  radioActivePrivate: { borderColor: '#64748B' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: P.blue,
  },
  radioDotPrivate: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#64748B',
  },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
  },
  warningText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#92400E', lineHeight: 17 },

  // ── Champs texte ──────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 2,
    gap: 8,
  },
  inputRowActive: {
    borderColor: P.borderBlue,
    backgroundColor: P.blueGhost,
  },
  inputText: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: P.blueDeep,
  },
  inputCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: P.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textarea: {
    backgroundColor: P.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.border,
    padding: 14,
    fontSize: 15,
    color: P.blueDeep,
    height: 110,
    textAlignVertical: 'top',
  },
  textareaActive: {
    borderColor: P.borderBlue,
    backgroundColor: P.blueGhost,
  },
});
