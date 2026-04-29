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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedSafeArea } from '@/components/SafeArea';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const emailRef = React.useRef<TextInput>(null);
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const onSend = async () => {
    const emailTrimmed = email.trim();

    if (!emailTrimmed) {
      setEmailError(t('auth_error_email_required'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError(t('auth_error_email_invalid'));
      return;
    }
    setEmailError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(emailTrimmed, {
      redirectTo: 'fishco://reset-password',
    });
    setLoading(false);

    if (error) {
      Alert.alert(t('forgot_error_title'), error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
        <View style={styles.container}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('a11y_back')}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </Pressable>
          <View style={styles.successBlock}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-outline" size={40} color="#1D4ED8" />
            </View>
            <Text style={styles.successTitle}>{t('forgot_success_title')}</Text>
            <Text style={styles.successMsg}>{t('forgot_success_msg')}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.secondaryWrapper} accessibilityRole="button" accessibilityLabel={t('forgot_back_to_login')}>
            <Text style={styles.secondaryText}>{t('forgot_back_to_login')}</Text>
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
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('a11y_back')}>
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </Pressable>

            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>{t('forgot_title')}</Text>
                <Text style={styles.subtitle}>{t('forgot_subtitle')}</Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>{t('forgot_email_label')}</Text>
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
                  returnKeyType="done"
                  onSubmitEditing={onSend}
                  autoFocus
                />
                {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
              </View>
            </View>

            <View style={styles.ctaBlock}>
              <Pressable
                onPress={onSend}
                disabled={loading}
                style={[styles.primaryWrapper, loading && { opacity: 0.88 }]}
                accessibilityRole="button"
                accessibilityLabel={t('forgot_cta')}
                accessibilityState={{ disabled: loading }}
              >
                <View style={styles.primaryButton}>
                  <Text style={styles.primaryText}>{loading ? t('forgot_sending') : t('forgot_cta')}</Text>
                </View>
              </Pressable>

              <Pressable onPress={() => router.back()} style={styles.secondaryWrapper} accessibilityRole="button" accessibilityLabel={t('forgot_back_to_login')}>
                <Text style={styles.secondaryText}>{t('forgot_back_to_login')}</Text>
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
  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 8 },
  content: { flex: 1, gap: 32, justifyContent: 'center', paddingBottom: 40 },
  header: { gap: 10 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#6b7280', fontSize: 15, lineHeight: 22 },
  form: { gap: 16 },
  label: { color: '#111827', fontWeight: '600', fontSize: 15 },
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
  secondaryWrapper: { alignItems: 'center', paddingVertical: 10 },
  secondaryText: { color: '#0f2c3f', fontWeight: '700', fontSize: 15 },
  successBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, paddingHorizontal: 16 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { color: '#0f172a', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  successMsg: { color: '#6b7280', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
