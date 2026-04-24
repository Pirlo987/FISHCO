import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';

import { ThemedSafeArea } from '@/components/SafeArea';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { COUNTRIES, iso2ToFlag } from '@/lib/countries';
import { useLanguage } from '@/providers/LanguageProvider';
import type { Locale } from '@/lib/i18n';
import { usePremium } from '@/hooks/usePremium';
import { manageSubscription, restorePurchases } from '@/lib/purchases';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileRow = {
  country: string | null;
  level: string | null;
  phone: string | null;
  dob: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
};



const LANGS: { key: Locale; label: string; flag: string }[] = [
  { key: 'fr', label: 'Français', flag: '🇫🇷' },
  { key: 'en', label: 'English',  flag: '🇬🇧' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────


function formatDob(raw: string | null): string {
  if (!raw) return '—';
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return raw;
}

function getAvatarUrl(profile: ProfileRow | null): string | null {
  if (!profile) return null;
  if (profile.avatar_url) return profile.avatar_url;
  if (profile.avatar_path) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_path);
    return data?.publicUrl ?? null;
  }
  return null;
}

// ─── Sub-component: InfoRow ───────────────────────────────────────────────────

type InfoRowProps = {
  icon: string;
  label: string;
  value: string | null;
  last?: boolean;
};

function InfoRow({ icon, label, value, last }: InfoRowProps) {
  return (
    <View style={[infoRowStyles.row, !last && infoRowStyles.borderBottom]}>
      <View style={infoRowStyles.iconWrap}>
        <Ionicons name={icon as any} size={18} color="#2563EB" />
      </View>
      <View style={infoRowStyles.content}>
        <Text style={infoRowStyles.label}>{label}</Text>
        <Text style={[infoRowStyles.value, !value && infoRowStyles.empty]}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  borderBottom: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 1 },
  label: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15, fontWeight: '600', color: '#111827' },
  empty: { color: '#D1D5DB', fontWeight: '400', fontStyle: 'italic' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileSettingsScreen() {
  const { t, locale, setLocale } = useLanguage();
  const router = useRouter();
  const { session, signOut } = useAuth();

  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ProfileRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [showCountryList, setShowCountryList] = React.useState(false);

  // Subscription state
  const { isPremium, isLoading: isPremiumLoading } = usePremium();
  const [restoring, setRestoring] = React.useState(false);

  const handleManageSubscription = async () => {
    try {
      await manageSubscription();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la gestion des abonnements.');
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      const info = await restorePurchases();
      const isActive = Object.keys(info.entitlements.active).length > 0;
      if (isActive) {
        Alert.alert('Achat restauré', 'Ton abonnement Premium est maintenant actif.');
      } else {
        Alert.alert('Aucun achat trouvé', 'Aucun abonnement actif n\'a été trouvé sur ce compte.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'La restauration a échoué.');
    } finally {
      setRestoring(false);
    }
  };

  // Avatar upload state
  const [pendingAvatar, setPendingAvatar] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  // ── Load profile ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .from('profiles')
      .select('country,level,phone,dob,avatar_url,avatar_path')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        const row = (data ?? null) as ProfileRow | null;
        setProfile(row);
        setForm(row);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ? String(err.message) : t('settings_error_load'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // ── Form helpers ────────────────────────────────────────────────────────────
  const setField = (key: keyof ProfileRow, value: string) =>
    setForm((prev) => ({
      ...(prev ?? { country: null, level: null, phone: null, dob: null, avatar_url: null, avatar_path: null }),
      [key]: value,
    }));

  const filteredCountries = React.useMemo(() => {
    const q = (form?.country ?? '').trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, 12);
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 12);
  }, [form?.country]);

  // ── Edit mode ───────────────────────────────────────────────────────────────
  const startEdit = () => {
    setForm(profile);
    setPendingAvatar(null);
    setShowCountryList(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setForm(profile);
    setPendingAvatar(null);
    setShowCountryList(false);
    setEditing(false);
  };

  // ── Avatar picker ───────────────────────────────────────────────────────────
  const pickAvatar = async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    const ok = current.granted || (Platform.OS === 'ios' && (current as any).accessPrivileges === 'limited');
    if (!ok) {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!req.granted && !(Platform.OS === 'ios' && (req as any).accessPrivileges === 'limited')) {
        Alert.alert(t('settings_login_required'), t('settings_perm_gallery'));
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    } as any);
    if (!res.canceled) setPendingAvatar(res.assets[0]);
  };

  const uploadAvatarAsset = async (asset: ImagePicker.ImagePickerAsset, userId: string) => {
    const manipulated = await ImageManipulator.manipulateAsync(asset.uri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const rand = Math.random().toString(36).slice(2, 8);
    const filePath = `${userId}/${stamp}-${rand}.jpg`;
    const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64), { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return { path: filePath, publicUrl: data?.publicUrl ?? null };
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const onSave = async () => {
    if (!session?.user?.id) {
      Alert.alert(t('settings_login_required'), t('settings_login_to_edit'));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        country: form?.country || null,
        phone:   form?.phone   || null,
        dob:     form?.dob     || null,
      };

      // Upload avatar if changed
      if (pendingAvatar) {
        setUploadingAvatar(true);
        const uploaded = await uploadAvatarAsset(pendingAvatar, session.user.id);
        payload.avatar_url  = uploaded.publicUrl;
        payload.avatar_path = uploaded.path;
        setUploadingAvatar(false);
      }

      const { error: err } = await supabase.from('profiles').update(payload).eq('id', session.user.id);
      if (err) throw err;

      setProfile((prev) => ({ ...(prev ?? { country: null, level: null, phone: null, dob: null, avatar_url: null, avatar_path: null }), ...payload }));
      setPendingAvatar(null);
      setEditing(false);
      setShowCountryList(false);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ? String(e.message) : t('settings_error_save'));
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  const onSignOut = async () => {
    router.replace('/onboarding');
    await signOut();
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes tes données (profil, prises, photos) seront supprimées définitivement dans un délai de 30 jours.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (!session?.user?.id) return;
            try {
              const uid = session.user.id;
              await supabase.from('likes').delete().eq('user_id', uid);
              await supabase.from('profile_points').delete().eq('user_id', uid);
              await supabase.from('catches').delete().eq('user_id', uid);
              await supabase.from('profiles').delete().eq('id', uid);
              router.replace('/onboarding');
              await signOut();
            } catch (e: any) {
              Alert.alert('Erreur', e?.message ?? 'La suppression a échoué. Contacte support@fishbook.app');
            }
          },
        },
      ]
    );
  };


  // ── Derived ─────────────────────────────────────────────────────────────────
  const email = session?.user?.email ?? null;
  const avatarUrl = getAvatarUrl(profile);
  const previewUri = pendingAvatar?.uri ?? avatarUrl;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ThemedSafeArea style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings_info')}</Text>
        {session && !editing ? (
          <Pressable onPress={startEdit} hitSlop={10} style={styles.editPill}>
            <Ionicons name="pencil-outline" size={14} color="#2563EB" />
            <Text style={styles.editPillText}>{t('settings_edit_short')}</Text>
          </Pressable>
        ) : editing ? (
          <Pressable onPress={cancelEdit} hitSlop={10} style={styles.cancelPill}>
            <Text style={styles.cancelPillText}>{t('settings_cancel')}</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : !session ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>{t('settings_login_prompt')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#FCA5A5" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Identity card ─────────────────────────────────────── */}
          <View style={styles.identityCard}>
            {/* Avatar — tappable in edit mode */}
            <TouchableOpacity
              onPress={editing ? pickAvatar : undefined}
              activeOpacity={editing ? 0.7 : 1}
            >
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={28} color="#2563EB" />
                </View>
              )}
              {editing && (
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={13} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.identityInfo}>
              <Text style={styles.identityEmail} numberOfLines={1}>{email ?? '—'}</Text>
            </View>
          </View>

          {/* ── Read mode ─────────────────────────────────────────── */}
          {!editing && (
            <>
              <Text style={styles.sectionLabel}>{t('settings_section_profile')}</Text>
              <View style={styles.card}>
                <InfoRow icon="flag-outline"     label={t('settings_country')} value={profile?.country ?? null} />
                <InfoRow icon="call-outline"      label={t('settings_phone')}   value={profile?.phone ?? null} />
                <InfoRow icon="calendar-outline"  label={t('settings_dob')}     value={formatDob(profile?.dob ?? null)} last />
              </View>
            </>
          )}

          {/* ── Edit mode ─────────────────────────────────────────── */}
          {editing && (
            <>
              <Text style={styles.sectionLabel}>{t('settings_section_edit')}</Text>

              {/* Country */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="flag-outline" size={15} color="#6B7280" />
                  <Text style={styles.fieldLabel}>{t('settings_country')}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('settings_country_ph')}
                  placeholderTextColor="#9CA3AF"
                  value={form?.country ?? ''}
                  onFocus={() => setShowCountryList(true)}
                  onChangeText={(text) => { setField('country', text); setShowCountryList(true); }}
                />
                {showCountryList && filteredCountries.length > 0 && (
                  <View style={styles.dropdown}>
                    {filteredCountries.map((c, i) => (
                      <Pressable
                        key={c.iso2}
                        style={[styles.dropdownItem, i < filteredCountries.length - 1 && styles.dropdownDivider]}
                        onPress={() => { setField('country', c.name); setShowCountryList(false); }}
                      >
                        <Text style={styles.dropdownFlag}>{iso2ToFlag(c.iso2)}</Text>
                        <Text style={styles.dropdownName}>{c.name}</Text>
                        <Text style={styles.dropdownDial}>{c.dialCode}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Phone */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="call-outline" size={15} color="#6B7280" />
                  <Text style={styles.fieldLabel}>{t('settings_phone')}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder="+33 6 00 00 00 00"
                  placeholderTextColor="#9CA3AF"
                  value={form?.phone ?? ''}
                  onChangeText={(text) => setField('phone', text)}
                />
              </View>

              {/* DOB */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="calendar-outline" size={15} color="#6B7280" />
                  <Text style={styles.fieldLabel}>{t('settings_dob')}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('settings_dob_placeholder')}
                  placeholderTextColor="#9CA3AF"
                  value={form?.dob ?? ''}
                  onChangeText={(text) => setField('dob', text)}
                />
                <Text style={styles.inputHint}>{t('settings_dob_format')}</Text>
              </View>

              {/* Save button */}
              <Pressable
                onPress={onSave}
                disabled={saving}
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
              >
                {saving ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.saveBtnText}>
                      {uploadingAvatar ? t('settings_uploading') : t('settings_saving')}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>{t('settings_save')}</Text>
                  </>
                )}
              </Pressable>
            </>
          )}

          {/* ── Préférences (toujours visibles) ───────────────────── */}
          {!editing && (
            <>
              <Text style={styles.sectionLabel}>{t('settings_section_preferences')}</Text>
              <View style={styles.card}>
                <View style={styles.langRow}>
                  <View style={[infoRowStyles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="language-outline" size={18} color="#3B82F6" />
                  </View>
                  <Text style={styles.langLabel}>{t('settings_lang')}</Text>
                  <View style={styles.langChips}>
                    {LANGS.map((lang) => {
                      const active = locale === lang.key;
                      return (
                        <Pressable
                          key={lang.key}
                          onPress={() => setLocale(lang.key)}
                          style={[styles.langChip, active && styles.langChipActive]}
                        >
                          <Text style={styles.langChipFlag}>{lang.flag}</Text>
                          <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                            {lang.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ── Abonnement (read mode only) ───────────────────────── */}
          {!editing && (
            <>
              <Text style={styles.sectionLabel}>Abonnement</Text>
              <View style={styles.card}>
                {isPremiumLoading ? (
                  <View style={styles.subRow}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.subLoadingText}>Vérification...</Text>
                  </View>
                ) : isPremium ? (
                  <>
                    <View style={[styles.subRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' }]}>
                      <View style={[styles.navIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="star" size={18} color="#D97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subActiveTitle}>Premium actif</Text>
                        <Text style={styles.subActiveLabel}>Toutes les fonctionnalités débloquées</Text>
                      </View>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
                      onPress={handleManageSubscription}
                    >
                      <View style={[styles.navIcon, { backgroundColor: '#F3F4F6' }]}>
                        <Ionicons name="settings-outline" size={18} color="#6B7280" />
                      </View>
                      <Text style={styles.navLabel} numberOfLines={1}>Gérer mon abonnement</Text>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
                      onPress={() => router.push('/premium')}
                    >
                      <View style={[styles.navIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="star-outline" size={18} color="#D97706" />
                      </View>
                      <Text style={styles.navLabel} numberOfLines={1}>Passer Premium</Text>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </Pressable>
                    <View style={styles.navDivider} />
                    <Pressable
                      style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
                      onPress={handleRestore}
                      disabled={restoring}
                    >
                      <View style={[styles.navIcon, { backgroundColor: '#EFF6FF' }]}>
                        {restoring
                          ? <ActivityIndicator size="small" color="#2563EB" />
                          : <Ionicons name="refresh-outline" size={18} color="#2563EB" />
                        }
                      </View>
                      <Text style={styles.navLabel} numberOfLines={1}>
                        {restoring ? 'Restauration...' : 'Restaurer les achats'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </>
          )}

          {/* ── Navigation links (read mode only) ─────────────────── */}
          {!editing && (
            <>
              <Text style={styles.sectionLabel}>{t('settings_section_actions')}</Text>
              <View style={styles.card}>
                <Pressable
                  style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
                  onPress={() => router.push('/saved-posts')}
                >
                  <View style={[styles.navIcon, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name="bookmark-outline" size={18} color="#0F172A" />
                  </View>
                  <Text style={styles.navLabel} numberOfLines={1}>Posts enregistrés</Text>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </Pressable>
                <View style={styles.navDivider} />
                <Pressable
                  style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
                  onPress={() => router.push('/(onboarding)/import-catches?from=settings')}
                >
                  <View style={[styles.navIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="cloud-upload-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.navLabel} numberOfLines={1}>{t('settings_import')}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </Pressable>
                <View style={styles.navDivider} />
                <Pressable
                  style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
                  onPress={() => router.push('/about')}
                >
                  <View style={[styles.navIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
                  </View>
                  <Text style={styles.navLabel} numberOfLines={1}>{t('settings_about')}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </Pressable>
              </View>

              <Pressable
                onPress={onSignOut}
                style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={styles.logoutText}>{t('settings_logout')}</Text>
              </Pressable>

              <Pressable
                onPress={onDeleteAccount}
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                <Text style={styles.deleteText}>Supprimer mon compte</Text>
              </Pressable>

            </>
          )}
        </ScrollView>
      )}
    </ThemedSafeArea>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  editPillText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  cancelPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  cancelPillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', fontSize: 14, maxWidth: 240 },
  errorText: { color: '#EF4444', textAlign: 'center', fontSize: 14 },

  // Scroll
  scroll: { paddingHorizontal: 10, paddingBottom: 48, gap: 8 },

  // Identity card
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  identityInfo: { flex: 1, gap: 6 },
  identityEmail: { fontSize: 14, fontWeight: '600', color: '#111827' },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },
  noLevel: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginLeft: 4,
    marginBottom: 4,
  },

  // Info card (read mode)
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },

  // Edit field groups
  fieldGroup: { gap: 8, marginBottom: 4 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
  },
  inputHint: { fontSize: 11, color: '#9CA3AF', marginLeft: 4 },

  // Country dropdown
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    maxHeight: 240,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  dropdownDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  dropdownFlag: { fontSize: 18 },
  dropdownName: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  dropdownDial: { fontSize: 12, color: '#9CA3AF' },

  // Level chips
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    flexShrink: 1,
  },
  levelChipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Language row (read mode)
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  langLabel: { fontSize: 14, fontWeight: '500', color: '#111827', marginRight: 4 },
  langChips: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  langChipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  langChipFlag: { fontSize: 15 },
  langChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  langChipTextActive: { color: '#2563EB' },

  // Navigation rows
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navRowPressed: { backgroundColor: '#F9FAFB' },
  navIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' },
  navDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F3F4F6', marginLeft: 64 },

  // Subscription rows
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  subLoadingText: { fontSize: 14, color: '#9CA3AF' },
  subActiveTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  subActiveLabel: { fontSize: 12, color: '#6B7280', marginTop: 1 },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    marginTop: 8,
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteText: { color: '#9CA3AF', fontWeight: '500', fontSize: 13 },
});
