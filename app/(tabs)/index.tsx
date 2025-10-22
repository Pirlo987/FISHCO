import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { events } from '@/lib/events';

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

const friendsHighlight = {
  title: 'Fishing Group',
  image:
    'https://images.unsplash.com/photo-1490100667990-4fced8021649?auto=format&fit=crop&w=800&q=80',
  avatars: [
    'https://images.unsplash.com/photo-1525130413817-d45c1d127c42?auto=format&fit=crop&w=120&q=60',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=60',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60',
  ],
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [recentCatches, setRecentCatches] = React.useState<CatchSummary[]>([]);
  const [loadingCatches, setLoadingCatches] = React.useState(false);
  const [weather, setWeather] = React.useState<WeatherSnapshot | null>(null);
  const [loadingWeather, setLoadingWeather] = React.useState(false);
  const [weatherError, setWeatherError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = React.useState<string | null>(null);

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
          if (!cancelled) setWeatherError('Autorise la localisation pour afficher la meteo.');
          return;
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
        const apparentTemperature = typeof current.apparent_temperature === 'number' ? current.apparent_temperature : null;
        const humidity = typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : null;
        const visibilityKm = typeof current.visibility === 'number' ? current.visibility / 1000 : null;

        if (!cancelled) {
          setWeather({
            label,
            temperature,
            apparentTemperature,
            humidity,
            visibilityKm,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('HomeScreen: unable to load weather', error);
          setWeather(null);
          setWeatherError('Meteo indisponible pour le moment.');
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

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profileBlock}>
            {profileAvatarUrl ? (
              <Image source={{ uri: profileAvatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <ThemedText
                  style={styles.avatarInitials}
                  lightColor="#1F1F1F"
                  darkColor="#F2F4F7">
                  {profileInitials}
                </ThemedText>
              </View>
            )}
            <View>
              <ThemedText style={styles.greeting}>Hello, {greetingName}</ThemedText>
              <ThemedText style={styles.profileLevel} lightColor="#8E8E93" darkColor="#B0B0B5">
                Novice
              </ThemedText>
            </View>
          </View>
          <Pressable style={styles.notificationButton} accessibilityRole="button">
            <Ionicons name="notifications-outline" size={22} color="#1F1F1F" />
          </Pressable>
        </View>

        <View>
          <View style={styles.highlightCard}>
            <Image
              source={{ uri: friendsHighlight.image }}
              style={styles.highlightImage}
              contentFit="cover"
            />
            <View style={styles.highlightOverlay}>
              <ThemedText style={styles.highlightTitle} lightColor="#FFFFFF" darkColor="#FFFFFF">
                {friendsHighlight.title}
              </ThemedText>
              <View style={styles.highlightAvatars}>
                {friendsHighlight.avatars.map((uri, index) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={[styles.smallAvatar, { marginLeft: index === 0 ? 0 : -10 }]}
                    contentFit="cover"
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        <View>
          <ThemedText style={styles.sectionTitle}>Last Catches</ThemedText>
          {loadingCatches ? (
            <View style={styles.catchesLoader}>
              <ActivityIndicator />
            </View>
          ) : recentCatches.length === 0 ? (
            <ThemedText style={styles.emptyState} lightColor="#8E8E93" darkColor="#B0B0B5">
              Aucune prise pour le moment.
            </ThemedText>
          ) : (
            <ScrollView
              horizontal
              contentContainerStyle={styles.catchesList}
              showsHorizontalScrollIndicator={false}>
              {recentCatches.map((item) => {
                const photoUrl = urlFromCatchPhoto(item.photo_path);
                const weightLabel = formatNumber(item.weight_kg);
                const lengthLabel = formatNumber(item.length_cm);
                const caughtDate = formatDate(item.caught_at);
                return (
                  <View key={item.id} style={styles.catchCard}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.catchImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.catchImage, styles.catchImageFallback]} />
                    )}
                    <View style={styles.catchBody}>
                      <ThemedText style={styles.catchTitle} numberOfLines={1}>
                        {item.species ?? 'Prise inconnue'}
                      </ThemedText>
                      <ThemedText style={styles.catchMeta} numberOfLines={1} lightColor="#6E6E73" darkColor="#B0B0B5">
                        {lengthLabel ? `Taille ${lengthLabel} cm` : 'Taille inconnue'}
                        {weightLabel ? ` - Poids ${weightLabel} kg` : ''}
                      </ThemedText>
                      {caughtDate ? (
                        <ThemedText style={styles.catchMeta} numberOfLines={1} lightColor="#6E6E73" darkColor="#B0B0B5">
                          {caughtDate}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View>
          <ThemedText style={styles.sectionTitle}>Forecast</ThemedText>
          <LinearGradient
            colors={['#8FD1FF', '#FFC6A5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.forecastCard}>
            <View style={styles.forecastHeader}>
              <View style={styles.forecastLocation}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
                <ThemedText style={styles.forecastLocationText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                  {weather?.label ?? 'Autour de toi'}
                </ThemedText>
              </View>
              {loadingWeather ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="sunny-outline" size={20} color="rgba(255,255,255,0.9)" />
              )}
            </View>
            {loadingWeather && !weather ? (
              <View style={styles.forecastLoading}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : weather ? (
              <>
                <ThemedText style={styles.temperature} lightColor="#FFFFFF" darkColor="#FFFFFF">
                  {formatTemperature(weather.temperature)}
                </ThemedText>
                <ThemedText style={styles.feelsLike} lightColor="rgba(255,255,255,0.85)" darkColor="rgba(255,255,255,0.85)">
                  Feels like {formatTemperature(weather.apparentTemperature)}
                </ThemedText>
                <View style={styles.forecastMetrics}>
                  <View style={styles.metricBox}>
                    <ThemedText style={styles.metricLabel} lightColor="#4A4A4A" darkColor="#111822">
                      Visibility
                    </ThemedText>
                    <ThemedText style={styles.metricValue}>
                      {weather.visibilityKm === null
                        ? '--'
                        : `${(Math.round(weather.visibilityKm * 10) / 10).toFixed(1)} Km`}
                    </ThemedText>
                  </View>
                  <View style={styles.metricBox}>
                    <ThemedText style={styles.metricLabel} lightColor="#4A4A4A" darkColor="#111822">
                      Humidity
                    </ThemedText>
                    <ThemedText style={styles.metricValue}>
                      {weather.humidity === null ? '--' : `${Math.round(weather.humidity)}%`}
                    </ThemedText>
                  </View>
                </View>
              </>
            ) : weatherError ? (
              <ThemedText style={styles.forecastError} lightColor="rgba(255,255,255,0.85)" darkColor="rgba(255,255,255,0.85)">
                {weatherError}
              </ThemedText>
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
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
  },
  profileLevel: {
    marginTop: 4,
    fontSize: 14,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F2',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  highlightCard: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 168,
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 24,
    justifyContent: 'space-between',
  },
  highlightTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  highlightAvatars: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  catchesLoader: {
    height: 160,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    fontSize: 14,
  },
  catchesList: {
    gap: 16,
    paddingRight: 12,
  },
  catchCard: {
    width: 200,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F1824',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
  },
  catchImage: {
    width: '100%',
    height: 100,
  },
  catchImageFallback: {
    backgroundColor: '#ECEDEF',
  },
  catchBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  catchTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  catchMeta: {
    fontSize: 13,
  },
  forecastCard: {
    borderRadius: 26,
    padding: 24,
    minHeight: 180,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forecastLocation: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  forecastLocationText: {
    fontSize: 13,
  },
  forecastLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  forecastError: {
    marginTop: 24,
    fontSize: 14,
  },
  temperature: {
    fontSize: 44,
    fontWeight: '700',
    marginTop: 24,
  },
  feelsLike: {
    marginTop: 6,
    fontSize: 15,
  },
  forecastMetrics: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 16,
  },
  metricBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
