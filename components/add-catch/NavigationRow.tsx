import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { P } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/providers/LanguageProvider';

type Props = {
  step: number;
  loading: boolean;
  isFirstStep: boolean;
  onBack: () => void;
  onNext: () => void;
};

export const NavigationRow = React.memo(function NavigationRow({
  step,
  loading,
  isFirstStep,
  onBack,
  onNext,
}: Props) {
  const { t } = useLanguage();
  return (
    <View style={[styles.row, isFirstStep && styles.rowStep1]}>
      {step > 1 && (
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={18} color={P.blueDeep} />
          <ThemedText style={styles.backBtnText}>{t('nav_back')}</ThemedText>
        </Pressable>
      )}
      <Pressable
        style={({ pressed }) => [styles.primaryWrapper, { opacity: pressed ? 0.9 : 1 }]}
        onPress={onNext}
        disabled={loading}
      >
        <LinearGradient
          colors={[P.blueDeep, P.blueDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryBtn}
        >
          {loading ? (
            <ActivityIndicator size="small" color={P.white} />
          ) : (
            <>
              <ThemedText style={styles.primaryText}>
                {step === 4 ? t('nav_save') : t('nav_next')}
              </ThemedText>
              {step < 4 && <Ionicons name="arrow-forward" size={18} color={P.white} />}
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 28,
  },
  rowStep1: {
    marginTop: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
    width: '100%',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: P.blueDeep,
  },
  primaryWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    width: '100%',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryText: {
    color: P.white,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
