import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { ThemedSafeArea } from '@/components/SafeArea';
import { supabase } from '@/lib/supabase';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useFacebookAuth } from '@/hooks/useFacebookAuth';

export default function LoginScreen() {
  const router = useRouter();
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const keyboardAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      Animated.timing(keyboardAnim, {
        toValue: -24,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
    const showSubAndroid = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(keyboardAnim, {
        toValue: -16,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
    const hideSubAndroid = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      showSubAndroid.remove();
      hideSubAndroid.remove();
    };
  }, [keyboardAnim]);

  const completeSignin = React.useCallback(
    async (userId?: string | null) => {
      if (!userId) {
        router.replace('/(tabs)');
        return;
      }
      const { data: prof } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
      const profileExists = !!prof;
      if (profileExists) {
        await Promise.all([
          AsyncStorage.removeItem('profile_onboarding_pending'),
          AsyncStorage.setItem('profile_onboarding_done', '1'),
          AsyncStorage.setItem('onboarding_seen', '1'),
        ]);
        router.replace('/(tabs)');
      } else {
        await AsyncStorage.setItem('profile_onboarding_pending', '1');
        router.replace('/(onboarding)/name');
      }
    },
    [router]
  );

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Email et mot de passe sont requis.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      Alert.alert('Connexion echouee', error.message);
      return;
    }
    try {
      await completeSignin(data.user?.id ?? data.session?.user?.id);
    } catch (_) {
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const { signInWithGoogle } = useGoogleAuth({ onSuccess: completeSignin });
  const { signInWithFacebook } = useFacebookAuth({ onSuccess: completeSignin });

  const onGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.message?.includes('annulee')) {
        return;
      }
      Alert.alert('Connexion Google echouee', err?.message || 'Reessaie dans quelques instants.');
    } finally {
      setLoading(false);
    }
  };

  const onFacebook = async () => {
    setLoading(true);
    try {
      await signInWithFacebook();
    } catch (err: any) {
      if (err?.message?.includes('annulee')) {
        return;
      }
      Alert.alert('Connexion Facebook echouee', err?.message || 'Reessaie dans quelques instants.');
    } finally {
      setLoading(false);
    }
  };

  const onApple = async () => {
    setLoading(true);
    try {
      const rawNonce = Math.random().toString(36).slice(2);
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('Token Apple non fourni.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) throw error;

      await completeSignin(data.user?.id ?? data.session?.user?.id);
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') {
        return;
      }
      Alert.alert('Connexion Apple echouee', err?.message || 'Reessaie dans quelques instants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <Animated.View style={[styles.container, { transform: [{ translateY: keyboardAnim }] }]}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>Connexion</Text>
                <Text style={styles.subtitle}>Reprends ton aventure</Text>
              </View>

              <View style={styles.socialStack}>
                <View style={styles.socialRow}>
                  {Platform.OS === 'ios' && (
                    <Pressable
                      disabled={loading}
                      onPress={onApple}
                      style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.85 }]}
                      accessibilityRole="button"
                      accessibilityLabel="Continuer avec Apple"
                    >
                      <Ionicons name="logo-apple" size={22} color="#111827" />
                    </Pressable>
                  )}
                  <Pressable
                    disabled={loading}
                    onPress={onGoogle}
                    style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Continuer avec Google"
                  >
                    <Ionicons name="logo-google" size={22} color="#DB4437" />
                  </Pressable>
                  <Pressable
                    disabled={loading}
                    onPress={onFacebook}
                    style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Continuer avec Facebook"
                  >
                    <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                  </Pressable>
                </View>
                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>ou connexion par email</Text>
                  <View style={styles.divider} />
                </View>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  ref={emailRef}
                  placeholder="ton.email@mail.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholderTextColor="#A0A7B1"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />

                <Text style={styles.label}>Mot de passe</Text>
                <TextInput
                  ref={passwordRef}
                  placeholder="********"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholderTextColor="#A0A7B1"
                  returnKeyType="done"
                />
              </View>
            </View>

            <View style={styles.ctaBlock}>
              <Pressable onPress={onLogin} disabled={loading} style={styles.primaryWrapper}>
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.primaryButton, loading && { opacity: 0.88 }]}
                >
                  <Text style={styles.primaryText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Pas encore de compte ? </Text>
                <Link href="/(auth)/register" style={styles.link}>
                  Creer un compte
                </Link>
              </View>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#ffffff', justifyContent: 'space-between' },
  content: { gap: 28 },
  header: { alignItems: 'center', gap: 6 },
  title: { color: '#0f172a', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#6b7280', fontSize: 15 },
  socialStack: { gap: 18 },
  socialRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  socialBtn: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { color: '#9ca3af', fontSize: 12 },
  form: { gap: 16 },
  label: { color: '#111827', fontWeight: '600', fontSize: 15, marginTop: 4 },
  input: {
    backgroundColor: '#f3f4f6',
    borderWidth: 0,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: '#0f172a',
    fontSize: 15,
  },
  ctaBlock: { gap: 14, marginTop: 16, paddingBottom: 8 },
  primaryWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  primaryButton: { paddingVertical: 17, alignItems: 'center', borderRadius: 999 },
  primaryText: { color: '#f8fafc', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
  bottomText: { color: '#6b7280' },
  link: { color: '#0f2c3f', fontWeight: '700' },
});
