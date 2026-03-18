import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { P } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';

type Props = ViewProps & {
  label?: string;
};

export const FormCard = React.memo(function FormCard({ label, children, style, ...rest }: Props) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {label && <ThemedText style={styles.label}>{label}</ThemedText>}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: P.slate,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
