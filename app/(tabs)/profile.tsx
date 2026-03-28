import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { usePulse } from '@/hooks/usePulse';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { ThemedSafeArea } from '@/components/SafeArea';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/providers/LanguageProvider';
import { usePremium } from '@/hooks/usePremium';

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

const CHART_COLORS = ['#0F172A', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

type MonthBar = { value: number; label: string; frontColor: string };
type SpeciesSlice = { value: number; color: string; label: string };

function buildMonthlyData(catches: { caught_at: string }[]): MonthBar[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
    const value = catches.filter((c) => c.caught_at.startsWith(key)).length;
    return { value, label, frontColor: '#0F172A' };
  });
}

function buildSpeciesData(catches: { species: string | null }[]): SpeciesSlice[] {
  const counts: Record<string, number> = {};
  for (const c of catches) {
    const s = c.species?.trim() || 'Inconnue';
    counts[s] = (counts[s] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([label, value], i) => ({
    value,
    color: CHART_COLORS[i],
    label,
  }));
  const rest = sorted.slice(5).reduce((sum, [, v]) => sum + v, 0);
  if (rest > 0) top.push({ value: rest, color: '#CBD5E1', label: 'Autres' });
  return top;
}

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
  const { t } = useLanguage();
  const router = useRouter();
  const { session } = useAuth();
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [totalCatches, setTotalCatches] = React.useState<number | null>(null);
  const [biggestCatch, setBiggestCatch] = React.useState<CatchSummary | null>(null);
  const [longestCatch, setLongestCatch] = React.useState<CatchSummary | null>(null);
  const [recentCatches, setRecentCatches] = React.useState<CatchSummary[]>([]);
  const [monthlyData, setMonthlyData] = React.useState<MonthBar[]>([]);
  const [speciesData, setSpeciesData] = React.useState<SpeciesSlice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { isPremium } = usePremium();
  const [error, setError] = React.useState<string | null>(null);
  const hasLoadedOnce = React.useRef(false);

  const loadData = React.useCallback(async (showLoader = false) => {
    if (!session?.user?.id) return;
    if (showLoader) setLoading(true);
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

      const { data: longestData, error: longestError } = await supabase
        .from('catches')
        .select('id,species,weight_kg,length_cm,caught_at,photo_path')
        .eq('user_id', session.user.id)
        .order('length_cm', { ascending: false, nullsLast: true })
        .order('weight_kg', { ascending: false, nullsLast: true })
        .limit(1);

      if (longestError) throw longestError;
      const longest = longestData && longestData.length > 0 ? (longestData[0] as CatchSummary) : null;
      setLongestCatch(longest);

      const { data: recentData, error: recentError } = await supabase
        .from('catches')
        .select('id,species,weight_kg,length_cm,caught_at,photo_path')
        .eq('user_id', session.user.id)
        .order('caught_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;
      setRecentCatches((recentData ?? []) as CatchSummary[]);

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      twelveMonthsAgo.setDate(1);
      const { data: chartData } = await supabase
        .from('catches')
        .select('caught_at,species')
        .eq('user_id', session.user.id)
        .gte('caught_at', twelveMonthsAgo.toISOString());

      setMonthlyData(buildMonthlyData((chartData ?? []) as { caught_at: string }[]));
      setSpeciesData(buildSpeciesData((chartData ?? []) as { species: string | null }[]));

      hasLoadedOnce.current = true;
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Chargement impossible');
      setRecentCatches([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [session?.user?.id]);

  React.useEffect(() => {
    loadData(true);
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasLoadedOnce.current) {
        loadData(true);
        return;
      }
      loadData(false);
    }, [loadData]),
  );

  const onOpenHistory = () => {
    router.push('/history');
  };

  const openInfo = React.useCallback(() => {
    router.push('/profile-settings');
  }, [router]);

  if (!session) {
    return (
      <ThemedSafeArea>
        <View style={[styles.container, styles.center]}>
          <Text>{t('profile_login_prompt')}</Text>
        </View>
      </ThemedSafeArea>
    );
  }

  const avatarUrl = urlFromAvatar(profile);
  const levelLabel = profile?.level ? LEVEL_LABELS[profile.level] ?? profile.level : null;
  const nameParts = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const displayName = nameParts || profile?.username || session.user.email || 'Profil';
  const realName = nameParts || null;
  const usernameLabel = profile?.username ? `@${profile.username}` : displayName;
  const dobLabel = formatDate(profile?.dob);
  const statsData = React.useMemo(
    () => [
      { key: 'total', label: t('profile_total_catches'), value: totalCatches === null ? '—' : totalCatches },
      {
        key: 'weight',
        label: t('profile_max_weight'),
        value: formatNumber(biggestCatch?.weight_kg) ? `${formatNumber(biggestCatch?.weight_kg)} kg` : '—',
      },
      {
        key: 'length',
        label: t('profile_max_size'),
        value: formatNumber(longestCatch?.length_cm) ? `${formatNumber(longestCatch?.length_cm)} cm` : '—',
      },
    ],
    [totalCatches, biggestCatch?.weight_kg, longestCatch?.length_cm],
  );

  return (
    <ThemedSafeArea>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <ProfileSkeleton />
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
                <Text style={styles.name}>{realName || usernameLabel}</Text>
                {profile?.username ? <Text style={styles.subName}>@{profile.username}</Text> : null}
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={11} color="#92400e" />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={openInfo} style={styles.settingsButton} hitSlop={12}>
                <Ionicons name="settings-outline" size={22} color="#111827" />
              </Pressable>
            </View>

            <View style={styles.statsBlock}>
              {statsData.map((item, index) => (
                <View key={item.key} style={[styles.statColumn, index < statsData.length - 1 ? styles.statColumnDivider : null]}>
                  <Text style={styles.statLabel}>{item.label}</Text>
                  <Text style={styles.statValue}>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* Chart: activité mensuelle */}
            {monthlyData.some((d) => d.value > 0) && (
              <View style={styles.card}>
                <Text style={styles.chartTitle}>Activité mensuelle</Text>
                <BarChart
                  data={monthlyData}
                  barWidth={18}
                  spacing={6}
                  roundedTop
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  noOfSections={3}
                  labelWidth={28}
                  xAxisLabelTextStyle={{ fontSize: 9, color: '#9CA3AF' }}
                  height={110}
                  maxValue={Math.max(...monthlyData.map((d) => d.value), 4)}
                />
              </View>
            )}

            {/* Chart: répartition espèces */}
            {speciesData.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.chartTitle}>Espèces pêchées</Text>
                <View style={styles.pieRow}>
                  <PieChart
                    data={speciesData}
                    donut
                    radius={70}
                    innerRadius={48}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                          {speciesData.reduce((s, d) => s + d.value, 0)}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#6B7280' }}>prises</Text>
                      </View>
                    )}
                  />
                  <View style={styles.pieLegend}>
                    {speciesData.map((item, i) => (
                      <View key={i} style={styles.pieLegendRow}>
                        <View style={[styles.pieDot, { backgroundColor: item.color }]} />
                        <Text numberOfLines={1} style={styles.pieLegendLabel}>{item.label}</Text>
                        <Text style={styles.pieLegendCount}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            <Pressable onPress={onOpenHistory} style={({ pressed }) => [styles.card, styles.historyCard, pressed && styles.pressedCard]}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>{t('profile_history')}</Text>
                <Text style={styles.linkText}>{t('profile_see_all')}</Text>
              </View>
              {recentCatches.length === 0 ? (
                <Text style={styles.muted}>{t('profile_no_catches')}</Text>
              ) : (
                recentCatches.map((item) => {
                  const photoUrl = urlFromCatchPhoto(item.photo_path);
                  const dateLabel = formatDate(item.caught_at) || t('profile_unknown_date');
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
                        <Text style={styles.historyTitle}>{item.species || t('profile_catch')}</Text>
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
          </>
        )}
      </ScrollView>

    </ThemedSafeArea>
  );
}

function ProfileSkeleton() {
  const opacity = usePulse();
  return (
    <Animated.View style={[{ padding: 16, gap: 16 }, { opacity }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#CBD5E1' }} />
        <View style={{ flex: 1, gap: 10 }}>
          <View style={{ height: 20, width: '60%', borderRadius: 8, backgroundColor: '#CBD5E1' }} />
          <View style={{ height: 14, width: '40%', borderRadius: 6, backgroundColor: '#CBD5E1' }} />
        </View>
      </View>

      {/* Stats block */}
      <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 20 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
            <View style={{ height: 10, width: '50%', borderRadius: 5, backgroundColor: '#CBD5E1' }} />
            <View style={{ height: 28, width: '40%', borderRadius: 8, backgroundColor: '#CBD5E1' }} />
          </View>
        ))}
      </View>

      {/* History card */}
      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, gap: 14 }}>
        <View style={{ height: 16, width: '35%', borderRadius: 6, backgroundColor: '#CBD5E1' }} />
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
  subName: { color: '#6B7280', fontSize: 14, marginTop: 2, fontWeight: '500' },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, gap: 4 },
  premiumBadgeText: { color: '#92400e', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  statsBlock: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  statColumn: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 6 },
  statColumnDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#E5E7EB' },
  statLabel: { color: '#6B7280', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  errorCard: { borderColor: '#fecaca', backgroundColor: '#fee2e2' },
  errorText: { color: '#b91c1c' },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  pieLegend: { flex: 1, gap: 8 },
  pieLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pieDot: { width: 10, height: 10, borderRadius: 5 },
  pieLegendLabel: { flex: 1, fontSize: 12, color: '#374151' },
  pieLegendCount: { fontSize: 12, fontWeight: '700', color: '#111827' },
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
