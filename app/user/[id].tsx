import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedSafeArea } from '@/components/SafeArea';
import { supabase } from '@/lib/supabase';
import { usePulse } from '@/hooks/usePulse';

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  country: string | null;
  level: string | null;
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
    return d.toLocaleDateString('fr-FR');
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

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [totalCatches, setTotalCatches] = React.useState<number | null>(null);
  const [biggestCatch, setBiggestCatch] = React.useState<CatchSummary | null>(null);
  const [longestCatch, setLongestCatch] = React.useState<CatchSummary | null>(null);
  const [recentCatches, setRecentCatches] = React.useState<CatchSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          { data: profileData, error: profileError },
          { count, error: countError },
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('first_name,last_name,username,country,level,avatar_url,avatar_path,photo_url,photo_path')
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('catches')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', id)
            .eq('is_public', true),
        ]);

        if (profileError) throw profileError;
        if (countError) throw countError;

        const [
          { data: biggestData, error: biggestError },
          { data: longestData, error: longestError },
          { data: recentData, error: recentError },
        ] = await Promise.all([
          supabase
            .from('catches')
            .select('id,species,weight_kg,length_cm,caught_at,photo_path')
            .eq('user_id', id)
            .eq('is_public', true)
            .order('weight_kg', { ascending: false, nullsLast: true })
            .limit(1),
          supabase
            .from('catches')
            .select('id,species,weight_kg,length_cm,caught_at,photo_path')
            .eq('user_id', id)
            .eq('is_public', true)
            .order('length_cm', { ascending: false, nullsLast: true })
            .limit(1),
          supabase
            .from('catches')
            .select('id,species,weight_kg,length_cm,caught_at,photo_path')
            .eq('user_id', id)
            .eq('is_public', true)
            .order('caught_at', { ascending: false })
            .limit(6),
        ]);

        if (biggestError) throw biggestError;
        if (longestError) throw longestError;
        if (recentError) throw recentError;

        if (!cancelled) {
          setProfile((profileData ?? null) as ProfileRow | null);
          setTotalCatches(count ?? 0);
          setBiggestCatch(biggestData?.[0] as CatchSummary ?? null);
          setLongestCatch(longestData?.[0] as CatchSummary ?? null);
          setRecentCatches((recentData ?? []) as CatchSummary[]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ? String(e.message) : 'Chargement impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  const avatarUrl = urlFromAvatar(profile);
  const nameParts = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const displayName = nameParts || profile?.username || 'Pêcheur';
  const realName = nameParts || null;
  const levelLabel = profile?.level ? LEVEL_LABELS[profile.level] ?? profile.level : null;

  return (
    <ThemedSafeArea edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <UserProfileSkeleton />
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons name="wifi-outline" size={20} color="#b91c1c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Back button */}
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>

            {/* Avatar + name */}
            <View style={styles.profileHeader}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {displayName
                      .split(' ')
                      .map((p) => p.charAt(0).toUpperCase())
                      .slice(0, 2)
                      .join('') || '?'}
                  </Text>
                </View>
              )}
              <Text style={styles.name}>{realName || displayName}</Text>
              {profile?.username ? (
                <Text style={styles.username}>@{profile.username}</Text>
              ) : null}
              {levelLabel ? (
                <View style={styles.levelBadge}>
                  <Ionicons name="fish" size={12} color="#0369a1" />
                  <Text style={styles.levelText}>{levelLabel}</Text>
                </View>
              ) : null}
            </View>

            {/* Stats */}
            <View style={styles.statsBlock}>
              <View style={[styles.statColumn, styles.statDivider]}>
                <Text style={styles.statLabel}>Prises</Text>
                <Text style={styles.statValue}>{totalCatches === null ? '—' : totalCatches}</Text>
              </View>
              <View style={[styles.statColumn, styles.statDivider]}>
                <Text style={styles.statLabel}>Record poids</Text>
                <Text style={styles.statValue}>
                  {formatNumber(biggestCatch?.weight_kg) ? `${formatNumber(biggestCatch?.weight_kg)} kg` : '—'}
                </Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statLabel}>Record taille</Text>
                <Text style={styles.statValue}>
                  {formatNumber(longestCatch?.length_cm) ? `${formatNumber(longestCatch?.length_cm)} cm` : '—'}
                </Text>
              </View>
            </View>

            {/* Recent catches */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Prises récentes</Text>
              {recentCatches.length === 0 ? (
                <Text style={styles.muted}>Aucune prise publique pour l'instant.</Text>
              ) : (
                recentCatches.map((item) => {
                  const photoUrl = urlFromCatchPhoto(item.photo_path);
                  const dateLabel = formatDate(item.caught_at) || 'Date inconnue';
                  return (
                    <View key={item.id} style={styles.catchItem}>
                      {photoUrl ? (
                        <Image source={{ uri: photoUrl }} style={styles.catchThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.catchThumb, styles.catchThumbPlaceholder]}>
                          <Ionicons name="fish-outline" size={20} color="#9CA3AF" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.catchTitle}>{item.species || 'Prise'}</Text>
                        <Text style={styles.catchMeta}>
                          {dateLabel}
                          {formatNumber(item.weight_kg) ? ` • ${formatNumber(item.weight_kg)} kg` : ''}
                          {formatNumber(item.length_cm) ? ` • ${formatNumber(item.length_cm)} cm` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ThemedSafeArea>
  );
}

function UserProfileSkeleton() {
  const opacity = usePulse();
  return (
    <Animated.View style={[{ gap: 16 }, { opacity }]}>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#CBD5E1' }} />
        <View style={{ height: 20, width: 140, borderRadius: 8, backgroundColor: '#CBD5E1' }} />
        <View style={{ height: 14, width: 80, borderRadius: 6, backgroundColor: '#CBD5E1' }} />
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 20 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
            <View style={{ height: 10, width: '50%', borderRadius: 5, backgroundColor: '#CBD5E1' }} />
            <View style={{ height: 24, width: '40%', borderRadius: 8, backgroundColor: '#CBD5E1' }} />
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, gap: 14 }}>
        <View style={{ height: 16, width: '40%', borderRadius: 6, backgroundColor: '#CBD5E1' }} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#CBD5E1' }} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ height: 12, width: '50%', borderRadius: 5, backgroundColor: '#CBD5E1' }} />
              <View style={{ height: 10, width: '70%', borderRadius: 5, backgroundColor: '#CBD5E1' }} />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
  },
  container: { padding: 16, gap: 16 },
  profileHeader: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5E7EB' },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: '#4B5563' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  username: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#7dd3fc',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  levelText: { color: '#0369a1', fontSize: 12, fontWeight: '700' },
  statsBlock: {
    flexDirection: 'row',
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  statColumn: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 6 },
  statDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#1E3A5F' },
  statLabel: { color: '#93C5FD', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#BFDBFE', textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  muted: { color: '#6B7280', fontSize: 14 },
  catchItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catchThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#E5E7EB' },
  catchThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  catchTitle: { fontWeight: '600', color: '#111827', fontSize: 14 },
  catchMeta: { color: '#6B7280', marginTop: 2, fontSize: 12 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#b91c1c', fontSize: 14, flex: 1 },
});
