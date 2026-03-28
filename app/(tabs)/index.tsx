import React from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { usePulse } from '@/hooks/usePulse';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/ThemedText';
import { PremiumBanner } from '@/components/PremiumBanner';
import { usePremium } from '@/hooks/usePremium';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { events } from '@/lib/events';
import { LEVEL_TITLES, titleForPoints } from '@/lib/gamification';
import { useLanguage } from '@/providers/LanguageProvider';

type CatchSummary = {
  id: string;
  species: string | null;
  weight_kg: number | null;
  length_cm: number | null;
  caught_at: string | null;
  photo_path: string | null;
};

type WeatherSnapshot = {
  label: string;
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  visibilityKm: number | null;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  photo_url: string | null;
  photo_path: string | null;
};

type PointsRow = {
  points: number;
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

const urlFromCatchPhoto = (path?: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from('catch-photos').getPublicUrl(path);
  return data?.publicUrl ?? null;
};

const avatarUrlFromProfile = (profile: ProfileRow | null) => {
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

const computeLevelProgress = (value: number) => {
  const points = Number.isFinite(value) ? value : 0;
  const sorted = [...LEVEL_TITLES].sort((a, b) => a.min - b.min);
  const current = sorted.filter((t) => points >= t.min).pop() ?? sorted[0];
  const next = sorted.find((t) => t.min > current.min);
  if (!next) return { ratio: 1, current, next: null, remaining: 0 };
  const span = next.min - current.min;
  const ratio = Math.min(1, Math.max(0, (points - current.min) / span));
  const remaining = Math.max(0, next.min - points);
  return { ratio, current, next, remaining };
};

// ── Palette ──
const C = {
  bg: '#FFFFFF',
  surface: '#F8FAFC',
  blue: '#2563EB',
  blueDark: '#1E3A5F',
  blueDeep: '#0F172A',
  blueMid: '#3B82F6',
  blueLight: '#DBEAFE',
  blueGhost: '#EFF6FF',
  bluePale: '#F0F5FF',
  slate: '#64748B',
  slateLight: '#94A3B8',
  border: '#E2E8F0',
  borderBlue: '#BFDBFE',
  white: '#FFFFFF',
};

export default function HomeScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { isPremium } = usePremium();

  const [recentCatches, setRecentCatches] = React.useState<CatchSummary[]>([]);
  const [loadingCatches, setLoadingCatches] = React.useState(false);
  const [weather, setWeather] = React.useState<WeatherSnapshot | null>(null);
  const [loadingWeather, setLoadingWeather] = React.useState(false);
  const [weatherError, setWeatherError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = React.useState<string | null>(null);
  const [points, setPoints] = React.useState(0);
  const [loadingPoints, setLoadingPoints] = React.useState(false);

  const animatedPoints = React.useRef(new Animated.Value(0)).current;
  const [displayPoints, setDisplayPoints] = React.useState(0);

  const formatTemperature = React.useCallback(
    (value: number | null | undefined) => {
      if (value === null || value === undefined || Number.isNaN(value)) return '--';
      return String(Math.round(value));
    },
    []
  );

  React.useEffect(() => {
    let cancelled = false;
    const fetchCatches = async () => {
      if (!session?.user?.id) {
        if (!cancelled) setRecentCatches([]);
        return;
      }
      if (!cancelled) setLoadingCatches(true);
      try {
        const { data, error } = await supabase
          .from('catches')
          .select('id,species,weight_kg,length_cm,caught_at,photo_path')
          .eq('user_id', session.user.id)
          .order('caught_at', { ascending: false })
          .limit(3);
        if (error) throw error;
        if (!cancelled) setRecentCatches((data as CatchSummary[]) ?? []);
      } catch (error) {
        if (!cancelled) {
          console.warn('HomeScreen: unable to load recent catches', error);
          setRecentCatches([]);
        }
      } finally {
        if (!cancelled) setLoadingCatches(false);
      }
    };
    fetchCatches();
    const off = events.on('catch:added', fetchCatches);
    return () => {
      cancelled = true;
      off();
    };
  }, [session?.user?.id]);

  React.useEffect(() => {
    let cancelled = false;
    const loadWeather = async () => {
      setWeatherError(null);
      setLoadingWeather(true);
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          ({ status } = await Location.requestForegroundPermissionsAsync());
        }
        if (status !== Location.PermissionStatus.GRANTED) {
          if (!cancelled) setWeatherError(t('home_location_required'));
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = position.coords;

        let label = t('home_around_you');
        try {
          const places = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (places.length > 0) {
            const place = places[0];
            const city = place.city || place.subregion;
            const region = place.region || place.country;
            const parts = [city, region].filter(Boolean);
            if (parts.length > 0) label = parts.join(', ');
          }
        } catch (geocodeError) {
          console.warn('HomeScreen: reverse geocoding failed', geocodeError);
        }

        const params = new URLSearchParams({
          latitude: latitude.toFixed(4),
          longitude: longitude.toFixed(4),
          current: 'temperature_2m,apparent_temperature,relative_humidity_2m,visibility',
          timezone: 'auto',
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);

        const json = await response.json();
        const current = json?.current ?? {};
        const temperature = typeof current.temperature_2m === 'number' ? current.temperature_2m : null;
        const apparentTemperature =
          typeof current.apparent_temperature === 'number' ? current.apparent_temperature : null;
        const humidity =
          typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : null;
        const visibilityKm =
          typeof current.visibility === 'number' ? current.visibility / 1000 : null;

        if (!cancelled) {
          setWeather({ label, temperature, apparentTemperature, humidity, visibilityKm });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('HomeScreen: unable to load weather', error);
          setWeather(null);
          setWeatherError(t('home_weather_unavailable'));
        }
      } finally {
        if (!cancelled) setLoadingWeather(false);
      }
    };
    loadWeather();
    return () => {
      cancelled = true;
    };
  }, [formatTemperature]);

  React.useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      if (!session?.user?.id) {
        if (!cancelled) setProfileAvatarUrl(null);
        if (!cancelled) setProfile(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name,last_name,username,avatar_url,avatar_path,photo_url,photo_path')
          .eq('id', session.user.id)
          .maybeSingle();
        if (error) throw error;
        const profileRow = (data as ProfileRow | null) ?? null;
        const resolved = avatarUrlFromProfile(profileRow);
        if (!cancelled) {
          setProfile(profileRow);
          setProfileAvatarUrl(resolved);
        }
      } catch (error) {
        console.warn('HomeScreen: unable to load profile avatar', error);
        if (!cancelled) {
          setProfile(null);
          setProfileAvatarUrl(null);
        }
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const greetingName = React.useMemo(() => {
    if (profile?.first_name) return profile.first_name;
    if (profile?.username) return profile.username;
    const emailName = session?.user?.email ? session.user.email.split('@')[0] : null;
    return emailName ?? 'there';
  }, [profile?.first_name, profile?.username, session?.user?.email]);

  const currentTitle = React.useMemo(() => titleForPoints(points), [points]);
  const levelProgress = React.useMemo(() => computeLevelProgress(points), [points]);
  const animatedLevelProgress = React.useMemo(
    () => computeLevelProgress(displayPoints),
    [displayPoints]
  );

  const profileInitials = React.useMemo(() => {
    const syllables = [profile?.first_name, profile?.last_name]
      .map((part) => (part ? part.trim().charAt(0).toUpperCase() : ''))
      .filter(Boolean)
      .join('');
    if (syllables) return syllables.slice(0, 2);
    if (profile?.username) return profile.username.charAt(0).toUpperCase();
    if (session?.user?.email) return session.user.email.charAt(0).toUpperCase();
    return '?';
  }, [profile?.first_name, profile?.last_name, profile?.username, session?.user?.email]);

  const loadPoints = React.useCallback(async () => {
    if (!session?.user?.id) {
      setPoints(0);
      return;
    }
    try {
      setLoadingPoints(true);
      const { data: pts } = await supabase
        .from('profile_points')
        .select('points')
        .eq('user_id', session.user.id)
        .maybeSingle();
      const value = (pts as PointsRow | null)?.points ?? 0;
      setPoints(Number.isFinite(value) ? value : 0);
    } catch (error) {
      console.warn('HomeScreen: unable to load points', error);
      setPoints(0);
    } finally {
      setLoadingPoints(false);
    }
  }, [session?.user?.id]);

  React.useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  useFocusEffect(
    React.useCallback(() => {
      loadPoints();
    }, [loadPoints])
  );

  React.useEffect(() => {
    const id = animatedPoints.addListener(({ value }) => {
      setDisplayPoints(Math.round(value));
    });
    return () => animatedPoints.removeListener(id);
  }, [animatedPoints]);

  React.useEffect(() => {
    Animated.timing(animatedPoints, {
      toValue: points,
      duration: 2000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [animatedPoints, points]);

  const handleProfilePress = React.useCallback(() => {
    router.push('/profile');
  }, [router]);

  const handleCatchPress = React.useCallback((catchId: string) => {
    router.push(`/catches/${catchId}`);
  }, [router]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20 }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            onPress={handleProfilePress}
            style={({ pressed }) => [styles.profileBlock, { opacity: pressed ? 0.7 : 1 }]}
          >
            {profileAvatarUrl ? (
              <View style={styles.avatarFrame}>
                <Image source={{ uri: profileAvatarUrl }} style={styles.avatar} contentFit="cover" />
              </View>
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <ThemedText style={styles.avatarInitials}>{profileInitials}</ThemedText>
              </View>
            )}
            <View>
              <ThemedText style={styles.greetingPrefix}>{t('home_hello')}</ThemedText>
              <ThemedText style={styles.greetingName}>{greetingName}</ThemedText>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.notifBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="notifications-outline" size={20} color={C.blue} />
          </Pressable>
        </View>

        {/* ── Level Card ── */}
        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View style={styles.levelInfo}>
              <ThemedText style={styles.levelTitle}>{currentTitle}</ThemedText>
              <ThemedText style={styles.levelPts}>
                {loadingPoints ? '...' : `${displayPoints} pts`}
              </ThemedText>
            </View>
            <View style={styles.levelBadge}>
              <ThemedText style={styles.levelBadgeText}>
                {Math.round(animatedLevelProgress.ratio * 100)}%
              </ThemedText>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: animatedPoints.interpolate({
                    inputRange: [
                      levelProgress.current.min,
                      levelProgress.next?.min ?? levelProgress.current.min + 1,
                    ],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          {levelProgress.next ? (
            <ThemedText style={styles.progressHint}>
              {levelProgress.next.title} — encore {levelProgress.remaining} pts
            </ThemedText>
          ) : (
            <ThemedText style={styles.progressHint}>{t('home_max_level')}</ThemedText>
          )}
        </View>

        {/* ── Premium Banner ── */}
        {!isPremium && <PremiumBanner onPress={() => router.push('/premium')} />}

        {/* ── Recent Catches ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <ThemedText style={styles.sectionLabel}>{t('home_recent_catches')}</ThemedText>
            <View style={styles.countPill}>
              <ThemedText style={styles.countText}>{recentCatches.length}</ThemedText>
            </View>
          </View>

          {loadingCatches ? (
            <HomeCatchesSkeleton />
          ) : recentCatches.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="fish-outline" size={36} color={C.slateLight} />
              <ThemedText style={styles.emptyTitle}>{t('home_no_catches')}</ThemedText>
              <ThemedText style={styles.emptySub}>
                {t('home_first_catch')}
              </ThemedText>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catchScroll}
              contentContainerStyle={styles.catchScrollContent}
            >
              {recentCatches.map((item) => {
                const photoUrl = urlFromCatchPhoto(item.photo_path);
                const weightLabel = formatNumber(item.weight_kg);
                const lengthLabel = formatNumber(item.length_cm);
                const caughtDate = formatDate(item.caught_at);

                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.catchCard,
                      { opacity: pressed ? 0.92 : 1 },
                    ]}
                    onPress={() => handleCatchPress(item.id)}
                  >
                    {photoUrl ? (
                      <Image
                        source={{ uri: photoUrl }}
                        style={styles.catchImg}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.catchImg, styles.catchImgEmpty]}>
                        <Ionicons name="fish" size={48} color={C.borderBlue} />
                      </View>
                    )}

                    <View style={styles.catchBottom}>
                      <ThemedText style={styles.catchSpecies} numberOfLines={1}>
                        {item.species ?? 'Inconnue'}
                      </ThemedText>
                      <View style={styles.catchMeta}>
                        {lengthLabel && (
                          <ThemedText style={styles.catchStat}>{lengthLabel} cm</ThemedText>
                        )}
                        {weightLabel && (
                          <ThemedText style={styles.catchStat}>{weightLabel} kg</ThemedText>
                        )}
                      </View>
                      {caughtDate && (
                        <ThemedText style={styles.catchDate}>{caughtDate}</ThemedText>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Weather ── */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>{t('home_weather')}</ThemedText>

          <View style={styles.weatherCard}>
            <View style={styles.weatherTop}>
              <View style={styles.weatherLoc}>
                <Ionicons name="location-outline" size={14} color={C.blue} />
                <ThemedText style={styles.weatherLocText}>
                  {weather?.label ?? t('home_location')}
                </ThemedText>
              </View>
              {!loadingWeather && <Ionicons name="partly-sunny" size={28} color={C.blue} />}
            </View>

            {loadingWeather && !weather ? (
              <HomeWeatherSkeleton />
            ) : weather ? (
              <>
                <View style={styles.tempRow}>
                  <ThemedText style={styles.tempBig}>
                    {formatTemperature(weather.temperature)}
                    <ThemedText style={styles.tempUnit}> °C</ThemedText>
                  </ThemedText>
                  <ThemedText style={styles.tempFeel}>
                    {t('home_feels_like')} {formatTemperature(weather.apparentTemperature)} °C
                  </ThemedText>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Ionicons name="eye-outline" size={16} color={C.slate} />
                    <ThemedText style={styles.metricVal}>
                      {weather.visibilityKm === null
                        ? '--'
                        : `${(Math.round(weather.visibilityKm * 10) / 10).toFixed(1)} km`}
                    </ThemedText>
                    <ThemedText style={styles.metricLbl}>{t('home_visibility')}</ThemedText>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Ionicons name="water-outline" size={16} color={C.slate} />
                    <ThemedText style={styles.metricVal}>
                      {weather.humidity === null ? '--' : `${Math.round(weather.humidity)}%`}
                    </ThemedText>
                    <ThemedText style={styles.metricLbl}>{t('home_humidity')}</ThemedText>
                  </View>
                </View>
              </>
            ) : weatherError ? (
              <ThemedText style={styles.weatherErr}>{weatherError}</ThemedText>
            ) : null}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function HomeCatchesSkeleton() {
  const opacity = usePulse();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false} contentContainerStyle={{ gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <Animated.View key={i} style={[{ width: 180, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }, { opacity }]}>
          <View style={{ width: 180, height: 160, backgroundColor: '#CBD5E1' }} />
          <View style={{ padding: 12, gap: 8 }}>
            <View style={{ height: 14, width: '60%', borderRadius: 6, backgroundColor: '#CBD5E1' }} />
            <View style={{ height: 10, width: '40%', borderRadius: 5, backgroundColor: '#CBD5E1' }} />
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

function HomeWeatherSkeleton() {
  const opacity = usePulse();
  return (
    <Animated.View style={[{ paddingVertical: 16, gap: 14 }, { opacity }]}>
      <View style={{ height: 40, width: '45%', borderRadius: 10, backgroundColor: '#CBD5E1' }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 48, borderRadius: 10, backgroundColor: '#CBD5E1' }} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarFrame: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
  },
  greetingPrefix: {
    fontSize: 12,
    fontWeight: '500',
    color: C.slate,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '700',
    color: C.blueDeep,
    letterSpacing: -0.3,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.blueGhost,
    borderWidth: 1,
    borderColor: C.border,
  },

  // ── Level Card ──
  levelCard: {
    backgroundColor: C.blueDeep,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  levelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.white,
    marginBottom: 2,
  },
  levelPts: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  levelBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.white,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.blueMid,
    borderRadius: 2,
  },
  progressHint: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },

  // ── Sections ──
  section: {
    marginBottom: 28,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.slate,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  countPill: {
    backgroundColor: C.blueGhost,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.blue,
  },

  // ── Catches ──
  loaderBox: {
    height: 180,
    borderRadius: 14,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyBox: {
    padding: 36,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.blueDeep,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '400',
    color: C.slate,
  },
  catchScroll: {
    marginHorizontal: -20,
    overflow: 'visible',
  },
  catchScrollContent: {
    paddingHorizontal: 20,
  },
  catchCard: {
    width: 180,
    borderRadius: 14,
    backgroundColor: C.white,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  catchImg: {
    width: '100%',
    height: 160,
  },
  catchImgEmpty: {
    backgroundColor: C.blueGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchBottom: {
    padding: 12,
    gap: 4,
  },
  catchSpecies: {
    fontSize: 15,
    fontWeight: '700',
    color: C.blueDeep,
  },
  catchMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  catchStat: {
    fontSize: 12,
    fontWeight: '500',
    color: C.slate,
  },
  catchDate: {
    fontSize: 11,
    fontWeight: '400',
    color: C.slateLight,
    marginTop: 2,
  },

  // ── Weather ──
  weatherCard: {
    borderRadius: 14,
    padding: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  weatherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherLoc: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  weatherLocText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.blue,
  },
  weatherLoading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  tempRow: {
    marginBottom: 20,
  },
  tempBig: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800',
    color: C.blueDeep,
    letterSpacing: -1.5,
  },
  tempUnit: {
    fontSize: 24,
    lineHeight: 56,
    fontWeight: '700',
    color: C.blueDeep,
    letterSpacing: 0,
  },
  tempFeel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.slate,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '700',
    color: C.blueDeep,
  },
  metricLbl: {
    fontSize: 11,
    fontWeight: '500',
    color: C.slateLight,
  },
  weatherErr: {
    fontSize: 13,
    fontWeight: '500',
    color: C.slate,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
