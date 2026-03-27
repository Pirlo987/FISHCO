import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';
import Constants from 'expo-constants';
import { useLanguage } from '@/providers/LanguageProvider';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type LinkRowProps = {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
};

const LinkRow = ({ icon, label, sublabel, onPress }: LinkRowProps) => (
  <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon as any} size={20} color="#2D6A4F" />
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.rowLabel}>{label}</Text>
      {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
    </View>
    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
  </Pressable>
);

export default function AboutScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { session, signOut } = useAuth();

  const onDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Toutes vos données (prises, profil) seront définitivement supprimées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Dernière confirmation',
              "Êtes-vous absolument sûr ? Il n'y a aucun retour possible.",
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Oui, supprimer définitivement',
                  style: 'destructive',
                  onPress: async () => {
                    if (!session?.user?.id) return;
                    try {
                      await supabase.from('catches').delete().eq('user_id', session.user.id);
                      await supabase.from('profiles').delete().eq('id', session.user.id);
                      router.replace('/onboarding');
                      await signOut();
                    } catch (e: any) {
                      Alert.alert('Erreur', e?.message ? String(e.message) : 'Impossible de supprimer le compte.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ThemedSafeArea style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('about_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* App identity */}
        <View style={styles.appBlock}>
          <View style={styles.appIcon}>
            <Ionicons name="fish" size={36} color="#2D6A4F" />
          </View>
          <Text style={styles.appName}>FishBook</Text>
          <Text style={styles.appVersion}>{t('about_version')} {APP_VERSION}</Text>
          <Text style={styles.appDesc}>{t('about_description')}</Text>
        </View>

        {/* Legal */}
        <Text style={styles.sectionLabel}>{t('about_legal')}</Text>
        <View style={styles.card}>
          <LinkRow
            icon="shield-checkmark-outline"
            label={t('about_privacy')}
            onPress={() => router.push('/privacy-policy')}
          />
          <View style={styles.divider} />
          <LinkRow
            icon="document-text-outline"
            label={t('about_terms')}
            sublabel="fishbook.app/terms"
            onPress={() => Linking.openURL('https://fishbook.app/terms')}
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>{t('about_support')}</Text>
        <View style={styles.card}>
          <LinkRow
            icon="mail-outline"
            label={t('about_contact')}
            sublabel="support@fishbook.app"
            onPress={() => Linking.openURL('mailto:support@fishbook.app')}
          />
          <View style={styles.divider} />
          <LinkRow
            icon="star-outline"
            label={t('about_rate')}
            onPress={() =>
              Linking.openURL('https://apps.apple.com/app/fishbook/id0000000000')
            }
          />
          <View style={styles.divider} />
          <LinkRow
            icon="bug-outline"
            label={t('about_report')}
            onPress={() => Linking.openURL('mailto:support@fishbook.app?subject=Bug%20Report')}
          />
        </View>

        <Text style={styles.footer}>
          {t('about_copyright', { year: new Date().getFullYear() })}
        </Text>

        {session && (
          <Pressable
            onPress={onDeleteAccount}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.deleteBtnText}>Supprimer mon compte</Text>
          </Pressable>
        )}
      </ScrollView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 8 },
  appBlock: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#EBF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  appVersion: { fontSize: 13, color: '#9CA3AF' },
  appDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginLeft: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowPressed: { backgroundColor: '#F9FAFB' },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowSublabel: { fontSize: 12, color: '#9CA3AF' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F3F4F6', marginLeft: 64 },
  footer: { fontSize: 12, color: '#D1D5DB', textAlign: 'center', marginTop: 24 },
  deleteBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  deleteBtnText: { fontSize: 12, color: '#D1D5DB' },
});
