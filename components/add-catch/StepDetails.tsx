import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { P } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/providers/LanguageProvider';

type Props = {
  species: string;
  location: string;
  weight: string;
  length: string;
  lure: string;
  onChangeLocation: (v: string) => void;
  onChangeWeight: (v: string) => void;
  onChangeLength: (v: string) => void;
  onChangeLure: (v: string) => void;
};

// ── Champ générique ───────────────────────────────────────────────────────────
function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <View style={field.wrap}>
      <View style={field.labelRow}>
        <ThemedText style={field.label}>{label}</ThemedText>
      </View>
      {children}
    </View>
  );
}

const field = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { fontSize: 13, fontWeight: '700', color: P.blueDark, letterSpacing: 0.1 },
});

// ── Composant principal ───────────────────────────────────────────────────────
export const StepDetails = React.memo(function StepDetails({
  species,
  location,
  weight,
  length,
  lure,
  onChangeLocation,
  onChangeWeight,
  onChangeLength,
  onChangeLure,
}: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>

      {/* ── Rappel de l'espèce ────────────────────────────────────────────── */}
      {species ? (
        <View style={styles.speciesReminder}>
          <Ionicons name="fish" size={14} color={P.blue} />
          <ThemedText style={styles.speciesReminderText} numberOfLines={1}>
            {species}
          </ThemedText>
        </View>
      ) : null}

      {/* ── Lieu ─────────────────────────────────────────────────────────── */}
      <Field label={t('step_details_location')} required>
        <View style={[styles.inputRow, location && styles.inputRowActive]}>
          <TextInput
            style={styles.inputText}
            placeholder={t('step_details_location_ph')}
            placeholderTextColor={P.slateLight}
            value={location}
            onChangeText={onChangeLocation}
          />
          {location ? (
            <View style={styles.inputCheck}>
              <Ionicons name="checkmark" size={12} color={P.white} />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={P.slateLight} />
          )}
        </View>
      </Field>

      {/* ── Mesures ──────────────────────────────────────────────────────── */}
      <Field label={t('step_details_measurements')} required>
        <View style={styles.measureRow}>

          {/* Poids */}
          <View style={[styles.measureCard, weight && styles.measureCardActive]}>
            <ThemedText style={styles.measureLabel}>{t('step_details_weight')}</ThemedText>
            <View style={styles.measureInputRow}>
              <TextInput
                style={styles.measureInput}
                placeholder="0.0"
                placeholderTextColor={P.slateLight}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={onChangeWeight}
              />
              <ThemedText style={[styles.measureUnit, weight && styles.measureUnitActive]}>kg</ThemedText>
            </View>
          </View>

          {/* Taille */}
          <View style={[styles.measureCard, length && styles.measureCardActive]}>
            <ThemedText style={styles.measureLabel}>{t('step_details_size')}</ThemedText>
            <View style={styles.measureInputRow}>
              <TextInput
                style={styles.measureInput}
                placeholder="0"
                placeholderTextColor={P.slateLight}
                keyboardType="decimal-pad"
                value={length}
                onChangeText={onChangeLength}
              />
              <ThemedText style={[styles.measureUnit, length && styles.measureUnitActive]}>cm</ThemedText>
            </View>
          </View>

        </View>
      </Field>

      {/* ── Leurre ───────────────────────────────────────────────────────── */}
      <Field label={t('step_details_lure')}>
        <View style={[styles.inputRow, lure && styles.inputRowActive]}>
          <TextInput
            style={styles.inputText}
            placeholder={t('step_details_optional')}
            placeholderTextColor={P.slateLight}
            value={lure}
            onChangeText={onChangeLure}
          />
          {lure && (
            <View style={styles.inputCheck}>
              <Ionicons name="checkmark" size={12} color={P.white} />
            </View>
          )}
        </View>
      </Field>

    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 20 },

  // ── Rappel espèce ─────────────────────────────────────────────────────
  speciesReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: P.blueGhost,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: P.borderBlue,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  speciesReminderText: {
    fontSize: 14,
    fontWeight: '700',
    color: P.blue,
    flexShrink: 1,
  },

  // ── Champ texte simple ────────────────────────────────────────────────
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

  // ── Mesures ───────────────────────────────────────────────────────────
  measureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  measureCard: {
    flex: 1,
    backgroundColor: P.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.border,
    padding: 14,
    gap: 10,
  },
  measureCardActive: {
    borderColor: P.borderBlue,
    backgroundColor: P.blueGhost,
  },
  measureLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: P.slate,
    letterSpacing: 0.2,
  },
  measureInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  measureInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: P.blueDark,
    padding: 0,
  },
  measureUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: P.slateLight,
    paddingBottom: 2,
  },
  measureUnitActive: {
    color: P.blue,
  },
});
