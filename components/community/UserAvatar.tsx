import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C } from '@/constants/communityPalette';
import { avatarUrlFromProfile } from '@/lib/communityHelpers';
import type { Profile } from './types';

type Props = {
  profile?: Profile | null;
  name: string;
  size?: number;
};

export const UserAvatar = React.memo(function UserAvatar({ profile, name, size = 40 }: Props) {
  const avatar = avatarUrlFromProfile(profile);
  const dim = { width: size, height: size, borderRadius: size / 2 };

  if (avatar) {
    return <Image source={{ uri: avatar }} style={[styles.avatar, dim]} contentFit="cover" />;
  }

  return (
    <View style={[styles.avatar, styles.fallback, dim]}>
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  avatar: { backgroundColor: C.border },
  fallback: { backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700', color: '#FFFFFF' },
});
