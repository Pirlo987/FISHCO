import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import WorldMiniMap from '@/components/WorldMiniMap';
import { normalizeName } from '@/constants/species';

type CatchItem = {
  id: string;
  user_id: string;
  species: string;
  weight_kg: number | null;
  length_cm: number | null;
  notes: string | null;
  caught_at: string;
  photo_path: string | null;
  // Optionnel: si un jour on ajoute la région/zone
  region?: string | null;
};

export default function CatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [item, setItem] = React.useState<CatchItem | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);

  const urlFromPhotoPath = React.useCallback(async (path?: string | null) => {
    if (!path) return null;
    try {
      const { data, error } = await supabase.storage
        .from('catch-photos')
        .createSignedUrl(path, 60 * 60 * 24);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {}
    const { data } = supabase.storage.from('catch-photos').getPublicUrl(path);
    return data.publicUrl ?? null;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('catches')
          .select('*')
          .eq('id', id)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Prise introuvable');
        if (cancelled) return;
        setItem(data as CatchItem);
        const url = await urlFromPhotoPath((data as CatchItem).photo_path);
        if (!cancelled) setPhotoUrl(url);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, urlFromPhotoPath]);

  const goToSpecies = React.useCallback(() => {
    if (!item?.species) return;
    const key = normalizeName(item.species);
    router.push({ pathname: '/species/[slug]', params: { slug: key, name: item.species } });
  }, [item, router]);

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1 }]}> 
        <ActivityIndicator />
      </View>
    );
  }
  if (error || !item) {
    return (
      <View style={[styles.center, { flex: 1 }]}> 
        <ThemedText>Erreur: {error || 'Introuvable'}</ThemedText>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#e6f1f5', dark: '#0f1416' }}
        headerImage={
          <View style={{ flex: 1, marginTop: -insets.top }}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.cover} contentFit="cover" />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Text style={{ fontSize: 42 }}>📷</Text>
              </View>
            )}
            <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: 12 + insets.top }]} hitSlop={10}>
              <Ionicons name="chevron-back" size={26} color="#000" />
            </Pressable>
          </View>
        }>
        <View style={styles.titleRow}>
          <Pressable onPress={goToSpecies} hitSlop={8}>
            <Text style={styles.titleText}>{item.species}</Text>
          </Pressable>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Poids</Text>
            <Text style={styles.statValue}>{item.weight_kg ? `${Number(item.weight_kg.toFixed(2))} kg` : '—'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Taille</Text>
            <Text style={styles.statValue}>{item.length_cm ? `${Math.round(item.length_cm)} cm` : '—'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Date</Text>
            <Text style={styles.statValueSmall}>{new Date(item.caught_at).toLocaleDateString()}</Text>
          </View>
        </View>

        {item.notes ? (
          <View style={styles.section}> 
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.sectionText}>{item.notes}</Text>
          </View>
        ) : null}

        {item.region ? (
          <View style={styles.section}> 
            <Text style={styles.sectionLabel}>Zone</Text>
            <WorldMiniMap tags={[item.region]} height={140} />
          </View>
        ) : null}
      </ParallaxScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  cover: { height: '100%', width: '100%', backgroundColor: '#f1f1f1' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8 },
  titleText: { fontSize: 24, fontWeight: '700' },
  metaText: { fontSize: 14, color: '#666' },
  statsCard: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f7f9fb',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dfe7ef',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  statValueSmall: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  backBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 16, gap: 8 },
  sectionLabel: { fontWeight: '600', fontSize: 16 },
  sectionText: { fontSize: 16, color: '#222' },
});
