import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '@/providers/AuthProvider';
import { ThemedSafeArea } from '@/components/SafeArea';
import { supabase } from '@/lib/supabase';

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  country: string | null;
  level: string | null;
  phone: string | null;
  dob: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  photo_url: string | null;
  photo_path: string | null;
};

type CatchSummary = {
  id: string;
  species: string | null;
  weight_kg: number | null;
  length_cm: number | null;
  caught_at: string;
  photo_path: string | null;
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  experienced: 'Expérimenté',
  expert: 'Expert',
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const fixed = Math.round(value * 100) / 100;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(2).replace(/\.00$/, '');
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleDateString();
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

const urlFromAvatar = (profile: ProfileRow | null) => {
  if (!profile) return null;
  if (profile.avatar_url) return profile.avatar_url;
  if (profile.photo_url) return profile.photo_url;
  if (profile.avatar_path) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_path);
    if (data?.publicUrl) return data.publicUrl;
  }
  if (profile.photo_path) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.photo_path);
    if (data?.publicUrl) return data.publicUrl;
  }
  return null;
};

const urlFromCatchPhoto = (path?: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from('catch-photos').getPublicUrl(path);
  return data?.publicUrl ?? null;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [totalCatches, setTotalCatches] = React.useState<number | null>(null);
  const [biggestCatch, setBiggestCatch] = React.useState<CatchSummary | null>(null);
  const [recentCatches, setRecentCatches] = React.useState<CatchSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: profileData, error: profileError }, { count, error: countError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name,last_name,username,country,level,phone,dob,avatar_url,avatar_path,photo_url,photo_path')
          .eq('id', session.user.id)
          .maybeSingle(),
        supabase.from('catches').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
      ]);

      if (profileError) throw profileError;
      if (countError) throw countError;

      setProfile((profileData ?? null) as ProfileRow | null);
      setTotalCatches(count ?? 0);

      const { data: biggestData, error: biggestError } = await supabase
        .from('catches')
        .select('id,species,weight_kg,length_cm,caught_at,photo_path')
        .eq('user_id', session.user.id)
        .order('weight_kg', { ascending: false, nullsLast: true })
        .order('length_cm', { ascending: false, nullsLast: true })
        .limit(1);

      if (biggestError) throw biggestError;
      const biggest = biggestData && biggestData.length > 0 ? (biggestData[0] as CatchSummary) : null;
      setBiggestCatch(biggest);

      const { data: recentData, error: recentError } = await supabase
        .from('catches')
        .select('id,species,weight_kg,length_cm,caught_at,photo_path')
        .eq('user_id', session.user.id)
        .order('caught_at', { ascending: false })
        .limit(3);

      if (recentError) throw recentError;
      setRecentCatches((recentData ?? []) as CatchSummary[]);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Chargement impossible');
      setRecentCatches([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const onSignOut = async () => {
    await signOut();
    Alert.alert('Déconnecté');
  };

  const onOpenHistory = () => {
    router.push('/history');
  };

  if (!session) {
    return (
      <ThemedSafeArea>
        <View style={[styles.container, styles.center]}>
          <Text>Connecte-toi pour voir ton profil.</Text>
        </View>
      </ThemedSafeArea>
    );
  }

  const avatarUrl = urlFromAvatar(profile);
  const levelLabel = profile?.level ? LEVEL_LABELS[profile.level] ?? profile.level : null;
  const nameParts = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const displayName = nameParts || profile?.username || session.user.email || 'Profil';
  const dobLabel = formatDate(profile?.dob);
  const catchPhotoUrl = urlFromCatchPhoto(biggestCatch?.photo_path);

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            {error ? (
              <View style={[styles.card, styles.errorCard]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.header}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {displayName
                      .split(' ')
                      .map((part) => part.charAt(0).toUpperCase())
                      .slice(0, 2)
                      .join('') || '?'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{displayName}</Text>
                {profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
                <Text style={styles.email}>{session.user.email}</Text>
              </View>
            </View>

            <View style={styles.cardRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Prises totales</Text>
                <Text style={styles.statValue}>{totalCatches ?? '—'}</Text>
              </View>
              <View style={[styles.statCard, styles.statCardFlex]}>
                <Text style={styles.statLabel}>Plus grosse prise</Text>
                {biggestCatch ? (
                  <>
                    <Text style={styles.statValue}>
                      {formatNumber(biggestCatch.weight_kg) ? `${formatNumber(biggestCatch.weight_kg)} kg` : '—'}
                    </Text>
                    {biggestCatch.species ? <Text style={styles.statHint}>{biggestCatch.species}</Text> : null}
                    {formatNumber(biggestCatch.length_cm) ? (
                      <Text style={styles.statHint}>{formatNumber(biggestCatch.length_cm)} cm</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.statValue}>—</Text>
                )}
              </View>
            </View>

            <Pressable onPress={onOpenHistory} style={({ pressed }) => [styles.card, styles.historyCard, pressed && styles.pressedCard]}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>Historique</Text>
                <Text style={styles.linkText}>Voir tout</Text>
              </View>
              {recentCatches.length === 0 ? (
                <Text style={styles.muted}>Aucune prise pour le moment.</Text>
              ) : (
                recentCatches.map((item) => {
                  const photoUrl = urlFromCatchPhoto(item.photo_path);
                  const dateLabel = formatDate(item.caught_at) || 'Date inconnue';
                  return (
                    <View key={item.id} style={styles.historyItem}>
                      {photoUrl ? (
                        <Image source={{ uri: photoUrl }} style={styles.historyThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.historyThumb, styles.historyThumbPlaceholder]}>
                          <Text style={styles.historyThumbText}>?</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyTitle}>{item.species || 'Prise'}</Text>
                        <Text style={styles.historyMeta}>
                          {dateLabel}
                          {formatNumber(item.weight_kg) ? ` • ${formatNumber(item.weight_kg)} kg` : ''}
                          {formatNumber(item.length_cm) ? ` • ${formatNumber(item.length_cm)} cm` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </Pressable>

            {biggestCatch && catchPhotoUrl ? (
              <View style={[styles.card, styles.catchCard]}>
                <Image source={{ uri: catchPhotoUrl }} style={styles.catchImage} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.catchTitle}>{biggestCatch.species || 'Prise'}</Text>
                  {biggestCatch.caught_at ? (
                    <Text style={styles.catchMeta}>
                      {new Date(biggestCatch.caught_at).toLocaleDateString()} •
                      {formatNumber(biggestCatch.weight_kg) ? ` ${formatNumber(biggestCatch.weight_kg)} kg` : ''}
                      {formatNumber(biggestCatch.length_cm) ? ` • ${formatNumber(biggestCatch.length_cm)} cm` : ''}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Informations</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pays</Text>
                <Text style={styles.infoValue}>{profile?.country || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Niveau</Text>
                <Text style={styles.infoValue}>{levelLabel || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{profile?.phone || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date de naissance</Text>
                <Text style={styles.infoValue}>{dobLabel || '—'}</Text>
              </View>
            </View>

            <Pressable onPress={onSignOut} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressedCard]}>
              <Text style={styles.signOutText}>Se déconnecter</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5E7EB' },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 24, fontWeight: '700', color: '#4B5563' },
  name: { fontSize: 24, fontWeight: '700' },
  username: { color: '#6B7280', marginTop: 2 },
  email: { color: '#374151', marginTop: 6 },
  cardRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  statCardFlex: { flex: 1.4 },
  statLabel: { color: '#6B7280', fontSize: 12, textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  statHint: { color: '#6B7280', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { color: '#6B7280' },
  infoValue: { fontWeight: '600', color: '#111827' },
  signOutButton: {
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutText: { color: 'white', fontWeight: '700' },
  errorCard: { borderColor: '#fecaca', backgroundColor: '#fee2e2' },
  errorText: { color: '#b91c1c' },
  catchCard: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  catchImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#E5E7EB' },
  catchTitle: { fontSize: 16, fontWeight: '600' },
  catchMeta: { color: '#6B7280', marginTop: 4 },
  historyCard: { gap: 10 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { color: '#2563EB', fontWeight: '600' },
  muted: { color: '#6B7280' },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#E5E7EB' },
  historyThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  historyThumbText: { fontSize: 18 },
  historyTitle: { fontWeight: '600' },
  historyMeta: { color: '#6B7280', marginTop: 2 },
  pressedCard: { opacity: 0.92 },
});
