import React from 'react';
import { StyleSheet, View } from 'react-native';
import { P } from '@/constants/addCatchPalette';

type Props = {
  current: number;
  total?: number;
};

export const ProgressBar = React.memo(function ProgressBar({ current, total = 4 }: Props) {
  return (
    <View style={styles.bar}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.segment, i < current && styles.active]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    height: 4,
    backgroundColor: P.border,
    borderRadius: 2,
  },
  active: {
    backgroundColor: P.blueDark,
  },
});
