import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '@/constants/communityPalette';
import { SpeciesBadge } from './SpeciesBadge';

type Props = {
  photoUrl: string | null;
  ratio: number;
  species?: string | null;
  onRatio: (r: number) => void;
};

export const CatchPhoto = React.memo(function CatchPhoto({ photoUrl, ratio, species, onRatio }: Props) {
  return (
    <View style={styles.wrap}>
      {photoUrl ? (
        <>
          <Image
            source={{ uri: photoUrl }}
            style={[styles.photo, { aspectRatio: ratio }]}
            contentFit="cover"
            onLoad={(e) => {
              const w = e?.source?.width ?? 0;
              const h = e?.source?.height ?? 0;
              if (w > 0 && h > 0) onRatio(w / h);
            }}
          />
          {species && (
            <>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.fade}
              />
              <View style={styles.overlay}>
                <SpeciesBadge species={species} />
              </View>
            </>
          )}
        </>
      ) : (
        <View style={[styles.photo, styles.empty, { aspectRatio: ratio }]}>
          <Ionicons name="image-outline" size={40} color={C.muted} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: 'relative', backgroundColor: C.inputBg },
  photo: { width: '100%', minHeight: 260 },
  fade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 72 },
  overlay: { position: 'absolute', bottom: 12, left: 12 },
  empty: { backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
});
