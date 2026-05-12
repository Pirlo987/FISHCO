import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedSafeArea } from '@/components/SafeArea';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/providers/LanguageProvider';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const onResend = async () => {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    setSent(false);
    try {
      await supabase.auth.resend({ type: 'signup', email });
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    } finally {
      setSending(false);
    }
  };

  const resendLabel = () => {
    if (sending) return t('verify_email_resending');
    if (cooldown > 0) return t('verify_email_resend_wait').replace('{seconds}', String(cooldown));
    return t('verify_email_resend');
  };

  return (
    <ThemedSafeArea edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-outline" size={44} color="#2563EB" />
        </View>

        <Text style={styles.title}>{t('verify_email_title')}</Text>
        <Text style={styles.subtitle}>{t('verify_email_subtitle')}</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
        <Text style={styles.spam}>{t('verify_email_spam')}</Text>

        {sent && (
          <View style={styles.sentBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={styles.sentText}>{t('verify_email_resent')}</Text>
          </View>
        )}

        <Pressable
          onPress={onResend}
          disabled={sending || cooldown > 0}
          style={({ pressed }) => [
            styles.resendBtn,
            (sending || cooldown > 0) && styles.resendBtnDisabled,
            pressed && { opacity: 0.85 },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : null}
          <Text style={[styles.resendText, (sending || cooldown > 0) && styles.resendTextDisabled]}>
            {resendLabel()}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="arrow-back" size={15} color="#6B7280" />
          <Text style={styles.backText}>{t('verify_email_back')}</Text>
        </Pressable>
      </View>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  email: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  spam: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  sentText: { fontSize: 13, fontWeight: '600', color: '#16A34A' },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    width: '100%',
  },
  resendBtnDisabled: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  resendText: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  resendTextDisabled: { color: '#9CA3AF' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 8,
  },
  backText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
});
