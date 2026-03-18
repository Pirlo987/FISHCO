import React from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { P } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';
import { FormCard } from './FormCard';
import type { AISuggestion } from '@/hooks/useAiClassification';
import { useLanguage } from '@/providers/LanguageProvider';

type CombinedSuggestion = {
  name: string;
  source: 'ai' | 'list';
  confidence?: number;
};

type Props = {
  species: string;
  onChangeSpecies: (v: string) => void;
  aiLoading: boolean;
  aiError: string | null;
  onRetryAi: () => void;
  suggestions: CombinedSuggestion[];
  showDropdown: boolean;
  onFocus: () => void;
  onBlur: () => void;
};

export const StepSpecies = React.memo(function StepSpecies({
  species,
  onChangeSpecies,
  aiLoading,
  aiError,
  onRetryAi,
  suggestions,
  showDropdown,
  onFocus,
  onBlur,
}: Props) {
  const { t } = useLanguage();
  const selectSpecies = React.useCallback(
    (name: string) => {
      onChangeSpecies(name);
      Keyboard.dismiss();
    },
    [onChangeSpecies],
  );

  return (
    <View style={styles.container}>
      <FormCard label={t('step_species_title')}>
        <View style={styles.inputWrapper}>
          <Ionicons name="fish-outline" size={18} color={P.slate} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder={t('step_species_search')}
            placeholderTextColor={P.slateLight}
            value={species}
            onChangeText={onChangeSpecies}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </View>

        {aiLoading && (
          <View style={styles.aiRow}>
            <ActivityIndicator size="small" color={P.blue} />
            <ThemedText style={styles.aiText}>{t('step_species_ai')}</ThemedText>
          </View>
        )}

        {aiError && (
          <View style={styles.aiErrorCard}>
            <ThemedText style={styles.aiErrorText}>{aiError}</ThemedText>
            <Pressable
              onPress={onRetryAi}
              style={({ pressed }) => [styles.retryChip, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="refresh-outline" size={14} color={P.blue} />
              <ThemedText style={styles.retryText}>{t('step_species_retry')}</ThemedText>
            </Pressable>
          </View>
        )}

        {showDropdown && (
          <View style={styles.dropdownCard}>
            {/* Section IA */}
            {suggestions.some((s) => s.source === 'ai') && (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="sparkles" size={12} color={P.blueDark} />
                  <ThemedText style={styles.sectionLabel}>Suggestions IA</ThemedText>
                </View>
                {suggestions
                  .filter((s) => s.source === 'ai')
                  .map((s, i, arr) => (
                    <Pressable
                      key={`ai-${s.name}-${i}`}
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        i < arr.length - 1 && styles.itemDivider,
                        pressed && styles.itemPressed,
                      ]}
                      onPress={() => selectSpecies(s.name)}
                    >
                      <View style={styles.itemLeft}>
                        <View style={styles.fishIcon}>
                          <Ionicons name="fish" size={14} color={P.blueDark} />
                        </View>
                        <ThemedText style={styles.itemName}>{s.name}</ThemedText>
                      </View>
                      {s.confidence != null && (
                        <View style={styles.aiBadge}>
                          <Ionicons name="checkmark-circle" size={11} color={P.white} />
                          <ThemedText style={styles.aiBadgeText}>
                            {Math.min(100, Math.round(s.confidence))}%
                          </ThemedText>
                        </View>
                      )}
                    </Pressable>
                  ))}
              </>
            )}

            {/* Séparateur entre sections */}
            {suggestions.some((s) => s.source === 'ai') &&
              suggestions.some((s) => s.source === 'list') && (
                <View style={styles.sectionSep} />
              )}

            {/* Section liste */}
            {suggestions.some((s) => s.source === 'list') && (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="list-outline" size={12} color={P.slate} />
                  <ThemedText style={[styles.sectionLabel, styles.sectionLabelMuted]}>
                    Liste des espèces
                  </ThemedText>
                </View>
                {suggestions
                  .filter((s) => s.source === 'list')
                  .map((s, i, arr) => (
                    <Pressable
                      key={`list-${s.name}-${i}`}
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        i < arr.length - 1 && styles.itemDivider,
                        pressed && styles.itemPressed,
                      ]}
                      onPress={() => selectSpecies(s.name)}
                    >
                      <View style={styles.itemLeft}>
                        <View style={[styles.fishIcon, styles.fishIconMuted]}>
                          <Ionicons name="fish-outline" size={14} color={P.slate} />
                        </View>
                        <ThemedText style={[styles.itemName, styles.itemNameMuted]}>
                          {s.name}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={P.slateLight} />
                    </Pressable>
                  ))}
              </>
            )}
          </View>
        )}
      </FormCard>
    </View>
  );
});

export type { CombinedSuggestion };

const styles = StyleSheet.create({
  container: { gap: 16 },
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

  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  aiText: { fontSize: 13, fontWeight: '500', color: P.slate },

  aiErrorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  aiErrorText: { flex: 1, color: '#991B1B', fontSize: 13, fontWeight: '500' },
  retryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.blueGhost,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: P.borderBlue,
  },
  retryText: { color: P.blue, fontWeight: '700', fontSize: 12 },

  dropdownCard: {
    backgroundColor: P.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.blueDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionLabelMuted: { color: P.slateLight },
  sectionSep: {
    height: 1,
    backgroundColor: P.border,
    marginHorizontal: 14,
    marginVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: P.border },
  itemPressed: { backgroundColor: P.blueGhost },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  fishIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: P.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fishIconMuted: { backgroundColor: P.surface },
  itemName: { fontSize: 15, fontWeight: '600', color: P.blueDeep },
  itemNameMuted: { fontWeight: '500', color: P.slate },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.blueDark,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiBadgeText: { color: P.white, fontWeight: '700', fontSize: 11 },
});
