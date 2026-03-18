import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = { species: string };

export const SpeciesBadge = React.memo(function SpeciesBadge({ species }: Props) {
  return (
    <View style={styles.badge}>
      <Ionicons name="fish" size={12} color="#FFFFFF" />
      <Text style={styles.text}>{species}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  text: { color: '#FFFFFF', fontWeight: '600', fontSize: 12 },
});
