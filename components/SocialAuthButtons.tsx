import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  disabled?: boolean;
};

export function SocialAuthButtons({ disabled }: Props) {
  const onGoogle = () =>
    Alert.alert('Bientôt', 'La connexion avec Google arrive bientôt.');
  const onApple = () =>
    Alert.alert('Bientôt', 'La connexion avec Apple arrive bientôt.');

  return (
    <View style={styles.stack}>
      <Pressable
        onPress={onGoogle}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btn,
          styles.google,
          disabled && { opacity: 0.6 },
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Continuer avec Google"
      >
        <Ionicons name="logo-google" size={18} color="#4285F4" style={styles.icon} />
        <Text style={[styles.text, styles.textGoogle]}>Continuer avec Google</Text>
      </Pressable>

      <Pressable
        onPress={onApple}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btn,
          styles.apple,
          disabled && { opacity: 0.6 },
          pressed && { opacity: 0.9 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Continuer avec Apple"
      >
        <Ionicons name="logo-apple" size={20} color="#fff" style={styles.icon} />
        <Text style={[styles.text, styles.textApple]}>Continuer avec Apple</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  btn: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  icon: { position: 'absolute', left: 14 },
  google: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  apple: {
    backgroundColor: '#000',
  },
  text: { fontWeight: '600' },
  textGoogle: { color: '#11181C' },
  textApple: { color: '#fff' },
});

export default SocialAuthButtons;

