import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { P } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';
import { FormCard } from './FormCard';
import { useLanguage } from '@/providers/LanguageProvider';

type Props = {
  location: string;
  weight: string;
  length: string;
  lure: string;
  onChangeLocation: (v: string) => void;
  onChangeWeight: (v: string) => void;
  onChangeLength: (v: string) => void;
  onChangeLure: (v: string) => void;
};

export const StepDetails = React.memo(function StepDetails({
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
      <FormCard label={t('step_details_location')}>
        <View style={styles.inputWrapper}>
          <Ionicons name="location-outline" size={18} color={P.slate} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder={t('step_details_location_ph')}
            placeholderTextColor={P.slateLight}
            value={location}
            onChangeText={onChangeLocation}
          />
        </View>
      </FormCard>

      <FormCard label={t('step_details_measurements')}>
        <View style={styles.measureRow}>
          <View style={styles.measureItem}>
            <View style={styles.measureIconWrap}>
              <Ionicons name="scale-outline" size={16} color={P.blue} />
            </View>
            <TextInput
              style={styles.measureInput}
              placeholder={t('step_details_weight')}
              placeholderTextColor={P.slateLight}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={onChangeWeight}
            />
            <ThemedText style={styles.measureUnit}>kg</ThemedText>
          </View>
          <View style={styles.measureDivider} />
          <View style={styles.measureItem}>
            <View style={styles.measureIconWrap}>
              <Ionicons name="resize-outline" size={16} color={P.blue} />
            </View>
            <TextInput
              style={styles.measureInput}
              placeholder={t('step_details_size')}
              placeholderTextColor={P.slateLight}
              keyboardType="decimal-pad"
              value={length}
              onChangeText={onChangeLength}
            />
            <ThemedText style={styles.measureUnit}>cm</ThemedText>
          </View>
        </View>
      </FormCard>

      <FormCard label={t('step_details_lure')}>
        <View style={styles.inputWrapper}>
          <Ionicons name="pricetag-outline" size={18} color={P.slate} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder={t('step_details_optional')}
            placeholderTextColor={P.slateLight}
            value={lure}
            onChangeText={onChangeLure}
          />
        </View>
      </FormCard>
    </View>
  );
});

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
  measureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
  },
  measureItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  measureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: P.blueGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  measureInput: { flex: 1, fontSize: 15, color: P.blueDeep, paddingVertical: 2 },
  measureUnit: { fontSize: 13, fontWeight: '600', color: P.slateLight },
  measureDivider: { width: 1, height: 36, backgroundColor: P.border },
});
