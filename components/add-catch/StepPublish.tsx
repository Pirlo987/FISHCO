import React from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { P } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';
import { FormCard } from './FormCard';
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

  return (
    <View style={styles.container}>
      <FormCard label={t('step_publish_visibility')}>
        <View style={styles.visibilityRow}>
          <Pressable
            onPress={handlePublic}
            style={({ pressed }) => [
              styles.visibilityCard,
              visibility === 'public' && styles.visibilityCardActive,
              !isKnownSpecies && styles.visibilityCardDisabled,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons
              name="earth-outline"
              size={20}
              color={visibility === 'public' ? P.blue : P.slate}
            />
            <ThemedText
              style={[styles.visibilityText, visibility === 'public' && styles.visibilityTextActive]}
            >
              {t('step_publish_public')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handlePrivate}
            style={({ pressed }) => [
              styles.visibilityCard,
              visibility === 'private' && styles.visibilityCardActive,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={visibility === 'private' ? P.blue : P.slate}
            />
            <ThemedText
              style={[styles.visibilityText, visibility === 'private' && styles.visibilityTextActive]}
            >
              {t('step_publish_private')}
            </ThemedText>
          </Pressable>
        </View>
        {!isKnownSpecies && (
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
            <ThemedText style={styles.warningText}>
              {t('step_publish_private_msg')}
            </ThemedText>
          </View>
        )}
      </FormCard>

      <FormCard label={t('step_publish_title_label')}>
        <View style={styles.inputWrapper}>
          <Ionicons name="text-outline" size={18} color={P.slate} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder={t('step_details_optional')}
            placeholderTextColor={P.slateLight}
            value={title}
            onChangeText={onChangeTitle}
          />
        </View>
      </FormCard>

      <FormCard label={t('step_publish_desc_label')}>
        <TextInput
          style={styles.textareaField}
          placeholder={t('step_publish_tell')}
          placeholderTextColor={P.slateLight}
          multiline
          value={description}
          onChangeText={onChangeDescription}
        />
      </FormCard>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 16 },

  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.white,
  },
  visibilityCardActive: { borderColor: P.borderBlue, backgroundColor: P.blueGhost },
  visibilityCardDisabled: { opacity: 0.4 },
  visibilityText: { fontSize: 14, fontWeight: '600', color: P.slate },
  visibilityTextActive: { color: P.blue },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#92400E' },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 15, color: P.blueDeep },

  textareaField: {
    backgroundColor: P.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    padding: 14,
    fontSize: 15,
    color: P.blueDeep,
    height: 110,
    textAlignVertical: 'top',
  },
});
