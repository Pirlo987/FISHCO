import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export type WorldMiniMapProps = {
  tags?: string[];
  height?: number;
  rounded?: number;
};

export default function WorldMiniMap({ tags = [], height = 140, rounded = 12 }: WorldMiniMapProps) {
  const set = new Set((tags || []).map((t) => t.toLowerCase()));
  const on = (...keys: string[]) => keys.some((k) => set.has(k));

  const [dims, setDims] = React.useState({ w: 0, h: 0 });
  const sx = (dims.w || 300) / 300;
  const sy = (dims.h || height) / 160;

  // Helper to place rectangles on a 300x160 grid -> pixels
  const box = (x: number, y: number, w: number, h: number) => ({
    position: 'absolute' as const,
    left: x * sx,
    top: y * sy,
    width: Math.max(0, w * sx),
    height: Math.max(0, h * sy),
    borderRadius: 6,
  });

  return (
    <View
      style={[styles.card, { height, borderRadius: rounded }]}
      onLayout={(e) => {
        const { width, height: h } = e.nativeEvent.layout;
        if (width && h) setDims({ w: width, h });
      }}
    >
      {/* Placeholder label when no tags parsed */}
      {set.size === 0 && (
        <View style={styles.placeholder}>
          <View style={styles.placeholderPill}>
            <Text style={{ color: '#6b7280', fontWeight: '600' }}>Carte</Text>
          </View>
        </View>
      )}
      {/* Land masses */}
      <View style={[box(58, 30, 74, 90), styles.land]} />
      <View style={[box(148, 30, 124, 90), styles.land]} />
      <View style={[box(252, 95, 38, 38), styles.land]} />

      {/* Seas base */}
      <View style={[box(4, 4, 292, 152), styles.sea, { borderRadius: 8, opacity: 0.25 }]} />

      {/* Pacific (4 blocks) */}
      <View style={[box(8, 32, 62, 48), on('pac', 'pac_n', 'pacific') ? styles.hi : styles.seaLite]} />
      <View style={[box(16, 88, 52, 42), on('pac', 'pac_s', 'pacific') ? styles.hi : styles.seaLite]} />
      <View style={[box(230, 32, 62, 48), on('pac', 'pac_n', 'pacific') ? styles.hi : styles.seaLite]} />
      <View style={[box(236, 88, 54, 42), on('pac', 'pac_s', 'pacific') ? styles.hi : styles.seaLite]} />

      {/* Atlantic (4 blocks) */}
      <View style={[box(118, 38, 42, 52), on('atl', 'atl_n', 'atlantic') ? styles.hi : styles.seaLite]} />
      <View style={[box(128, 94, 36, 40), on('atl', 'atl_s', 'atlantic') ? styles.hi : styles.seaLite]} />

      {/* Indian */}
      <View style={[box(178, 86, 48, 40), on('indian', 'indien') ? styles.hi : styles.seaLite]} />

      {/* Mediterranean, North Sea, Baltic, Black */}
      <View style={[box(164, 56, 28, 8), on('med', 'mediterranean') ? styles.hiStrong : styles.seaLiteWeak]} />
      <View style={[box(158, 42, 14, 8), on('north_sea') ? styles.hiStrong : styles.seaLiteWeak]} />
      <View style={[box(173, 38, 16, 6), on('baltic') ? styles.hiStrong : styles.seaLiteWeak]} />
      <View style={[box(190, 58, 16, 6), on('black') ? styles.hiStrong : styles.seaLiteWeak]} />

      {/* Arctic, Southern */}
      <View style={[box(140, 18, 70, 12), on('arctic') ? styles.hi : styles.seaLiteWeak, { borderRadius: 3 }]} />
      <View style={[box(130, 140, 90, 8), on('southern') ? styles.hi : styles.seaLiteWeak, { borderRadius: 3 }]} />

      {/* Continents emphasis if requested */}
      {set.has('america') && <View style={[box(58, 30, 74, 90), styles.lo]} />}
      {(set.has('europe') || set.has('africa') || set.has('asia')) && (
        <View style={[box(148, 30, 124, 90), styles.lo]} />
      )}
      {set.has('oceania') && <View style={[box(252, 95, 38, 38), styles.lo]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#d1d5db',
    position: 'relative',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  land: { backgroundColor: '#e5e7eb', borderRadius: 10 },
  sea: { backgroundColor: '#f8fafc' },
  seaLite: { backgroundColor: '#dbeafe' },
  seaLiteWeak: { backgroundColor: '#eaf2fe' },
  hi: { backgroundColor: '#1e90ff', opacity: 0.75 },
  hiStrong: { backgroundColor: '#1e90ff', opacity: 0.85 },
  lo: { backgroundColor: '#60a5fa', opacity: 0.4, borderRadius: 10 },
});
