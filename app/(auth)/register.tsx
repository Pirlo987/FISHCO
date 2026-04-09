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
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { ThemedSafeArea } from '@/components/SafeArea';
import { supabase } from '@/lib/supabase';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useFacebookAuth } from '@/hooks/useFacebookAuth';
import { useLanguage } from '@/providers/LanguageProvider';

export default function RegisterScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [emailError, setEmailError] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
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

  const completeAfterAuth = React.useCallback(
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

  const onRegister = async () => {
    const emailTrimmed = email.trim();
    let hasError = false;

    if (!emailTrimmed) {
      setEmailError(t('auth_error_email_required'));
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError(t('auth_error_email_invalid'));
      hasError = true;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError(t('auth_error_password_required'));
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError(t('auth_error_password_min'));
      hasError = true;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError(t('auth_error_password_uppercase'));
      hasError = true;
    } else if (!/[0-9]/.test(password)) {
      setPasswordError(t('auth_error_password_number'));
      hasError = true;
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      setPasswordError(t('auth_error_password_special'));
      hasError = true;
    } else {
      setPasswordError('');
    }

    if (hasError) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert(t('register_failed'), error.message);
      return;
    }
    await AsyncStorage.setItem('profile_onboarding_pending', '1');
    if (!data.session) {
      Alert.alert(
        t('register_verify_title'),
        t('register_verify_msg')
      );
    }
    router.replace('/(onboarding)/name');
  };

  const { signInWithGoogle } = useGoogleAuth({ onSuccess: completeAfterAuth });
  const { signInWithFacebook } = useFacebookAuth({ onSuccess: completeAfterAuth });

  const onGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.message?.includes('annulee')) {
        return;
      }
      Alert.alert(t('register_google_failed'), err?.message || t('auth_retry'));
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
      Alert.alert(t('register_facebook_failed'), err?.message || t('auth_retry'));
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
        throw new Error(t('login_apple_token'));
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) throw error;

      await completeAfterAuth(data.user?.id ?? data.session?.user?.id);
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') {
        return;
      }
      Alert.alert(t('register_apple_failed'), err?.message || t('auth_retry'));
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
                <Text style={styles.title}>{t('register_title')}</Text>
                <Text style={styles.subtitle}>{t('register_subtitle')}</Text>
              </View>

              <View style={styles.socialStack}>
                <View style={styles.socialRow}>
                  {Platform.OS === 'ios' && (
                    <Pressable
                      disabled={loading}
                      onPress={onApple}
                      style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.85 }]}
                      accessibilityRole="button"
                      accessibilityLabel={t('auth_with_apple')}
                    >
                      <Ionicons name="logo-apple" size={22} color="#111827" />
                    </Pressable>
                  )}
                  <Pressable
                    disabled={loading}
                    onPress={onGoogle}
                    style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth_with_google')}
                  >
                    <Ionicons name="logo-google" size={22} color="#DB4437" />
                  </Pressable>
                  <Pressable
                    disabled={loading}
                    onPress={onFacebook}
                    style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth_with_facebook')}
                  >
                    <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                  </Pressable>
                </View>
                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>{t('register_or_email')}</Text>
                  <View style={styles.divider} />
                </View>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>{t('auth_email')}</Text>
                <TextInput
                  ref={emailRef}
                  placeholder="ton.email@mail.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(''); }}
                  style={[styles.input, !!emailError && styles.inputError]}
                  placeholderTextColor="#A0A7B1"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}

                <Text style={styles.label}>{t('auth_password_min')}</Text>
                <View style={[styles.inputRow, !!passwordError && styles.inputError]}>
                  <TextInput
                    ref={passwordRef}
                    placeholder="********"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
                    style={styles.inputFlex}
                    placeholderTextColor="#A0A7B1"
                    returnKeyType="done"
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#A0A7B1" />
                  </Pressable>
                </View>
                {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
              </View>
            </View>

            <View style={styles.ctaBlock}>
              <Pressable onPress={onRegister} disabled={loading} style={[styles.primaryWrapper, loading && { opacity: 0.88 }]}>
                <View style={styles.primaryButton}>
                  <Text style={styles.primaryText}>{loading ? t('register_registering') : t('register_cta')}</Text>
                </View>
              </Pressable>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>{t('register_already')}</Text>
                <Link href="/(auth)/login" style={styles.link}>
                  {t('register_login_link')}
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
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: '#0f172a',
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 16,
    color: '#0f172a',
    fontSize: 15,
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: -8,
  },
  ctaBlock: { gap: 14, marginTop: 16, paddingBottom: 8 },
  primaryWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  primaryButton: { paddingVertical: 17, alignItems: 'center', borderRadius: 16, backgroundColor: '#0f172a' },
  primaryText: { color: '#f8fafc', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
  bottomText: { color: '#6b7280' },
  link: { color: '#0f2c3f', fontWeight: '700' },
});
