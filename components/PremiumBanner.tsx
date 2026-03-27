import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

type Props = {
  onPress: () => void;
};

export function PremiumBanner({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, { opacity: pressed ? 0.92 : 1 }]}
    >
      <LinearGradient
        colors={['#78350F', '#B45309', '#D97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="star" size={22} color="#FDE68A" />
        </View>

        <View style={styles.textBlock}>
          <ThemedText style={styles.title}>Passe Premium</ThemedText>
          <ThemedText style={styles.sub}>
            Fishdex illimite · Videos · Historique complet
          </ThemedText>
        </View>

        <View style={styles.priceBlock}>
          <ThemedText style={styles.price}>2,99 €</ThemedText>
          <ThemedText style={styles.pricePer}>/mois</ThemedText>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" style={styles.chevron} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#B45309',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pricePer: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  chevron: {
    marginLeft: 4,
    alignSelf: 'center',
  },
});
