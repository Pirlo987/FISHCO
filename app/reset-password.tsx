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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedSafeArea } from '@/components/SafeArea';
import { supabase } from '@/lib/supabase';
import { resetUrlStore } from '@/lib/resetUrlStore';
import { useLanguage } from '@/providers/LanguageProvider';

type Status = 'loading' | 'ready' | 'invalid' | 'done';

// Tente d'extraire et d'échanger les tokens depuis une URL
// Gère les deux flows Supabase :
// - PKCE  : fishco://reset-password?code=XXX
// - Implicit : fishco://reset-password#access_token=XXX&refresh_token=YYY&type=recovery
async function processUrl(url: string): Promise<boolean> {
  // PKCE : code dans les query params
  const codeMatch = url.match(/[?&]code=([^&&#\s]+)/);
  if (codeMatch?.[1]) {
    const { error } = await supabase.auth.exchangeCodeForSession(codeMatch[1]);
    return !error;
  }

  // Implicit : tokens dans le hash fragment
  const hash = url.split('#')[1] ?? '';
  if (hash) {
    const p = new URLSearchParams(hash);
    const accessToken = p.get('access_token');
    const refreshToken = p.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return !error;
    }
  }

  return false;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [status, setStatus] = React.useState<Status>('loading');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const confirmRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // L'URL a été capturée dans _layout.tsx avant qu'Expo Router ne la consomme
      const url = resetUrlStore.consume();

      if (!url) {
        if (!cancelled) setStatus('invalid');
        return;
      }

      const ok = await processUrl(url);
      if (!cancelled) setStatus(ok ? 'ready' : 'invalid');
    };

    init();
    return () => { cancelled = true; };
  }, []);

  const onSave = async () => {
    if (password.length < 8) {
      setPasswordError(t('reset_error_short'));
      return;
    }
    if (password !== confirm) {
      setPasswordError(t('reset_error_mismatch'));
      return;
    }
    setPasswordError('');
    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      Alert.alert(t('forgot_error_title'), error.message);
      return;
    }
    setStatus('done');
  };

  const goToLogin = () => {
    supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (status === 'loading') {
    return (
      <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text style={styles.loadingText}>{t('reset_loading')}</Text>
        </View>
      </ThemedSafeArea>
    );
  }

  if (status === 'invalid') {
    return (
      <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
        <View style={styles.container}>
          <View style={styles.centerBlock}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
            </View>
            <Text style={styles.successTitle}>{t('reset_error_title')}</Text>
            <Text style={styles.successMsg}>{t('reset_error_msg')}</Text>
          </View>
          <Pressable onPress={() => router.replace('/(auth)/forgot-password')} style={styles.primaryWrapper} accessibilityRole="button" accessibilityLabel={t('reset_try_again')}>
            <View style={styles.primaryButton}>
              <Text style={styles.primaryText}>{t('reset_try_again')}</Text>
            </View>
          </Pressable>
        </View>
      </ThemedSafeArea>
    );
  }

  if (status === 'done') {
    return (
      <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
        <View style={styles.container}>
          <View style={styles.centerBlock}>
            <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
              <Ionicons name="checkmark-outline" size={40} color="#1D4ED8" />
            </View>
            <Text style={styles.successTitle}>{t('reset_success_title')}</Text>
            <Text style={styles.successMsg}>{t('reset_success_msg')}</Text>
          </View>
          <Pressable onPress={goToLogin} style={styles.primaryWrapper} accessibilityRole="button" accessibilityLabel={t('reset_go_login')}>
            <View style={styles.primaryButton}>
              <Text style={styles.primaryText}>{t('reset_go_login')}</Text>
            </View>
          </Pressable>
        </View>
      </ThemedSafeArea>
    );
  }

  return (
    <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>{t('reset_title')}</Text>
                <Text style={styles.subtitle}>{t('reset_subtitle')}</Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>{t('reset_new_password')}</Text>
                <View style={[styles.inputRow, !!passwordError && styles.inputError]}>
                  <TextInput
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
                    style={styles.inputFlex}
                    placeholderTextColor="#A0A7B1"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={showPassword ? t('a11y_hide_password') : t('a11y_show_password')}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#A0A7B1" />
                  </Pressable>
                </View>

                <Text style={styles.label}>{t('reset_confirm_password')}</Text>
                <View style={[styles.inputRow, !!passwordError && styles.inputError]}>
                  <TextInput
                    ref={confirmRef}
                    placeholder="••••••••"
                    secureTextEntry={!showConfirm}
                    value={confirm}
                    onChangeText={(v) => { setConfirm(v); if (passwordError) setPasswordError(''); }}
                    style={styles.inputFlex}
                    placeholderTextColor="#A0A7B1"
                    returnKeyType="done"
                    onSubmitEditing={onSave}
                    accessibilityLabel={t('reset_confirm_password')}
                  />
                  <Pressable onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={showConfirm ? t('a11y_hide_password') : t('a11y_show_password')}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#A0A7B1" />
                  </Pressable>
                </View>

                {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
              </View>
            </View>

            <View style={styles.ctaBlock}>
              <Pressable onPress={onSave} disabled={saving} style={[styles.primaryWrapper, saving && { opacity: 0.88 }]} accessibilityRole="button" accessibilityLabel={t('reset_cta')} accessibilityState={{ disabled: saving }}>
                <View style={styles.primaryButton}>
                  <Text style={styles.primaryText}>{saving ? t('reset_saving') : t('reset_cta')}</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#ffffff', justifyContent: 'space-between' },
  centerBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, paddingHorizontal: 16 },
  loadingText: { color: '#6b7280', fontSize: 15, marginTop: 12 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSuccess: { backgroundColor: '#EFF6FF' },
  successTitle: { color: '#0f172a', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  successMsg: { color: '#6b7280', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  content: { flex: 1, gap: 32, justifyContent: 'center', paddingBottom: 40 },
  header: { gap: 10 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#6b7280', fontSize: 15, lineHeight: 22 },
  form: { gap: 16 },
  label: { color: '#111827', fontWeight: '600', fontSize: 15 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputFlex: { flex: 1, paddingVertical: 16, color: '#0f172a', fontSize: 15 },
  eyeBtn: { paddingLeft: 8 },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fff5f5' },
  fieldError: { color: '#ef4444', fontSize: 13, marginTop: -8 },
  ctaBlock: { gap: 14, paddingBottom: 8 },
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
});
