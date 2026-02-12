import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { events } from '@/lib/events';
import { LEVEL_TITLES, titleForPoints } from '@/lib/gamification';

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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

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

  const degreeSymbol = String.fromCharCode(176);
  const formatTemperature = React.useCallback(
    (value: number | null | undefined) => {
      if (value === null || value === undefined || Number.isNaN(value)) return '--';
      return `${Math.round(value)}${degreeSymbol}C`;
    },
    [degreeSymbol]
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
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          if (!cancelled) setWeatherError('Autorise la localisation pour afficher la météo.');
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = position.coords;

        let label = 'Autour de toi';
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
          setWeatherError('Météo indisponible pour le moment.');
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
    <ThemedView style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleProfilePress}
            style={({ pressed }) => [styles.profileBlock, { opacity: pressed ? 0.7 : 1 }]}
          >
            {profileAvatarUrl ? (
              <View style={styles.avatarRing}>
                <Image source={{ uri: profileAvatarUrl }} style={styles.avatar} contentFit="cover" />
              </View>
            ) : (
              <LinearGradient
                colors={['#0a7ea4', '#064E5B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.avatar, styles.avatarPlaceholder]}
              >
                <ThemedText style={styles.avatarInitials}>{profileInitials}</ThemedText>
              </LinearGradient>
            )}
            <View>
              <ThemedText style={styles.greetingPrefix}>Bonjour</ThemedText>
              <ThemedText style={styles.greetingName}>{greetingName}</ThemedText>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.notificationButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="notifications-outline" size={22} color="#0a7ea4" />
          </Pressable>
        </View>

        {/* Points Card */}
        <LinearGradient
          colors={['#064E5B', '#0a7ea4', '#0D9CB8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1.2, y: 1.2 }}
          style={styles.pointsCard}
        >
          <View style={styles.cardGlow} />
          <View style={styles.cardGlowBottom} />

          <View style={styles.pointsHeader}>
            <View style={styles.pointsInfo}>
              <ThemedText style={styles.pointsTitle}>{currentTitle}</ThemedText>
              <ThemedText style={styles.pointsSubtitle}>
                {loadingPoints ? 'Chargement...' : `${displayPoints} points`}
              </ThemedText>
            </View>

            <View style={styles.ringWrapper}>
              <View style={styles.ringBase}>
                <Animated.View
                  style={[
                    styles.ringFill,
                    {
                      transform: [
                        {
                          rotate: animatedPoints.interpolate({
                            inputRange: [0, levelProgress.next?.min ?? points],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <View style={styles.ringInner}>
                  <ThemedText style={styles.ringText}>
                    {Math.round(animatedLevelProgress.ratio * 100)}%
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.pointsProgress}>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
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
              <ThemedText style={styles.progressLabel}>
                Prochain niveau : {levelProgress.next.title} · +{levelProgress.remaining} pts
              </ThemedText>
            ) : (
              <ThemedText style={styles.progressLabel}>Niveau maximum atteint</ThemedText>
            )}
          </View>
        </LinearGradient>

        {/* Recent Catches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionDot} />
              <ThemedText style={styles.sectionTitle}>Dernières prises</ThemedText>
            </View>
            <View style={styles.sectionBadge}>
              <ThemedText style={styles.sectionBadgeText}>{recentCatches.length}</ThemedText>
            </View>
          </View>

          {loadingCatches ? (
            <View style={styles.catchesLoader}>
              <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
          ) : recentCatches.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="fish-outline" size={40} color="#0a7ea4" />
              </View>
              <ThemedText style={styles.emptyText}>Aucune prise enregistrée</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Commencez votre aventure
              </ThemedText>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catchesList}>
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
                      { opacity: pressed ? 0.9 : 1 }
                    ]}
                    onPress={() => handleCatchPress(item.id)}
                  >
                    {photoUrl ? (
                      <Image
                        source={{ uri: photoUrl }}
                        style={styles.catchImage}
                        contentFit="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={['#0a7ea4', '#064E5B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.catchImage, styles.catchImageFallback]}
                      >
                        <Ionicons name="fish" size={56} color="rgba(255,255,255,0.3)" />
                      </LinearGradient>
                    )}

                    <LinearGradient
                      colors={['transparent', 'rgba(6,78,91,0.4)', 'rgba(6,78,91,0.85)']}
                      style={styles.catchOverlay}
                    >
                      <BlurView intensity={20} tint="dark" style={styles.catchInfoBlur}>
                        <View style={styles.catchInfo}>
                          <ThemedText style={styles.catchSpecies}>
                            {item.species ?? 'Espèce inconnue'}
                          </ThemedText>
                          <View style={styles.catchMeasures}>
                            {lengthLabel && (
                              <View style={styles.measureItem}>
                                <Ionicons name="resize-outline" size={14} color="rgba(255,255,255,0.9)" />
                                <ThemedText style={styles.measureText}>{lengthLabel} cm</ThemedText>
                              </View>
                            )}
                            {weightLabel && (
                              <View style={styles.measureItem}>
                                <Ionicons name="barbell-outline" size={14} color="rgba(255,255,255,0.9)" />
                                <ThemedText style={styles.measureText}>{weightLabel} kg</ThemedText>
                              </View>
                            )}
                          </View>
                          {caughtDate && (
                            <View style={styles.catchDateBadge}>
                              <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
                              <ThemedText style={styles.catchDate}>{caughtDate}</ThemedText>
                            </View>
                          )}
                        </View>
                      </BlurView>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Weather Forecast */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionDot} />
            <ThemedText style={styles.sectionTitle}>Météo</ThemedText>
          </View>
          <LinearGradient
            colors={['#E8F6F8', '#D4EFF3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.forecastCard}
          >
            <View style={styles.forecastHeader}>
              <View style={styles.forecastLocation}>
                <Ionicons name="location-outline" size={14} color="#0a7ea4" />
                <ThemedText style={styles.forecastLocationText}>
                  {weather?.label ?? 'Localisation'}
                </ThemedText>
              </View>
              {loadingWeather ? (
                <ActivityIndicator size="small" color="#0a7ea4" />
              ) : (
                <View style={styles.weatherIconCircle}>
                  <Ionicons name="partly-sunny" size={32} color="#0a7ea4" />
                </View>
              )}
            </View>

            {loadingWeather && !weather ? (
              <View style={styles.forecastLoading}>
                <ActivityIndicator size="large" color="#0a7ea4" />
              </View>
            ) : weather ? (
              <>
                <View style={styles.temperatureRow}>
                  <ThemedText style={styles.temperature}>
                    {formatTemperature(weather.temperature)}
                  </ThemedText>
                  <ThemedText style={styles.feelsLike}>
                    Ressenti {formatTemperature(weather.apparentTemperature)}
                  </ThemedText>
                </View>

                <View style={styles.forecastMetrics}>
                  <View style={styles.metricBox}>
                    <View style={styles.metricHeader}>
                      <View style={styles.metricIconBg}>
                        <Ionicons name="eye-outline" size={18} color="#0a7ea4" />
                      </View>
                      <ThemedText style={styles.metricLabel}>Visibilité</ThemedText>
                    </View>
                    <ThemedText style={styles.metricValue}>
                      {weather.visibilityKm === null
                        ? '--'
                        : `${(Math.round(weather.visibilityKm * 10) / 10).toFixed(1)} km`}
                    </ThemedText>
                  </View>

                  <View style={styles.metricBox}>
                    <View style={styles.metricHeader}>
                      <View style={styles.metricIconBg}>
                        <Ionicons name="water-outline" size={18} color="#0a7ea4" />
                      </View>
                      <ThemedText style={styles.metricLabel}>Humidité</ThemedText>
                    </View>
                    <ThemedText style={styles.metricValue}>
                      {weather.humidity === null ? '--' : `${Math.round(weather.humidity)}%`}
                    </ThemedText>
                  </View>
                </View>
              </>
            ) : weatherError ? (
              <ThemedText style={styles.forecastError}>{weatherError}</ThemedText>
            ) : null}
          </LinearGradient>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F0F7F8',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: '#0a7ea4',
    padding: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4EFF3',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  greetingPrefix: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5B8A93',
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C3E4E9',
    shadowColor: '#0a7ea4',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ── Sections ──
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a7ea4',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionBadge: {
    backgroundColor: '#E0F4F7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a7ea4',
  },

  // ── Points Card ──
  pointsCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#064E5B',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  cardGlow: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 80,
  },
  cardGlowBottom: {
    position: 'absolute',
    bottom: -50,
    left: -40,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 60,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: -0.3,
  },
  pointsSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  ringWrapper: {
    width: 76,
    height: 76,
  },
  ringBase: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a7ea4',
  },
  pointsProgress: {
    gap: 10,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F5C563',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // ── Catches ──
  catchesLoader: {
    height: 200,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C3E4E9',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C3E4E9',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5B8A93',
  },
  catchesList: {
    marginRight: -20,
  },
  catchCard: {
    width: 220,
    height: 300,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#064E5B',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  catchImage: {
    width: '100%',
    height: '100%',
  },
  catchImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
  },
  catchInfoBlur: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  catchInfo: {
    gap: 8,
  },
  catchSpecies: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catchMeasures: {
    flexDirection: 'row',
    gap: 12,
  },
  measureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  measureText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  catchDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  catchDate: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },

  // ── Weather ──
  forecastCard: {
    borderRadius: 22,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#B2E5EC',
    shadowColor: '#0a7ea4',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  forecastLocation: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#B2E5EC',
  },
  forecastLocationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  weatherIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B2E5EC',
  },
  forecastLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  temperatureRow: {
    marginBottom: 20,
  },
  temperature: {
    fontSize: 56,
    fontWeight: '800',
    color: '#064E5B',
    marginBottom: 4,
    letterSpacing: -1,
  },
  feelsLike: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B8A93',
  },
  forecastMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#B2E5EC',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  metricIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F6F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B8A93',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  forecastError: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5B8A93',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
