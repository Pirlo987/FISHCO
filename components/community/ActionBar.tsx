import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '@/constants/communityPalette';

type ActionButtonProps = {
  icon: string;
  activeIcon?: string;
  isActive?: boolean;
  activeColor?: string;
  onPress?: () => void;
  size?: number;
};

const ActionButton = React.memo(function ActionButton({
  icon,
  activeIcon,
  isActive,
  activeColor = C.like,
  onPress,
  size = 24,
}: ActionButtonProps) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePress = React.useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
    ]).start();
    onPress?.();
  }, [onPress, scale]);

  return (
    <Pressable onPress={handlePress} hitSlop={12}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={(isActive && activeIcon ? activeIcon : icon) as any}
          size={size}
          color={isActive ? activeColor : C.sub}
        />
      </Animated.View>
    </Pressable>
  );
});

type Props = {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onToggleLike: () => void;
  onToggleComments: () => void;
};

export const ActionBar = React.memo(function ActionBar({
  liked,
  likeCount,
  commentCount,
  onToggleLike,
  onToggleComments,
}: Props) {
  return (
    <View style={styles.actions}>
      <View style={styles.left}>
        <View style={styles.item}>
          <ActionButton icon="heart-outline" activeIcon="heart" isActive={liked} onPress={onToggleLike} />
          {likeCount > 0 && (
            <Text style={[styles.count, liked && styles.countLiked]}>{likeCount}</Text>
          )}
        </View>
        <View style={styles.item}>
          <ActionButton icon="chatbubble-outline" onPress={onToggleComments} />
          {commentCount > 0 && <Text style={styles.count}>{commentCount}</Text>}
        </View>
        <ActionButton icon="paper-plane-outline" />
      </View>
      <ActionButton icon="bookmark-outline" activeIcon="bookmark" />
    </View>
  );
});

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { fontSize: 13, fontWeight: '600', color: C.sub },
  countLiked: { color: C.like },
});
