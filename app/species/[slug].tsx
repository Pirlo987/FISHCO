import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ThemedSafeArea } from '@/components/SafeArea';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { normalizeName } from '@/constants/species';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { IconSymbol } from '@/components/ui/IconSymbol';

type SpeciesRecord = Record<string, any> & {
  // Names
  name?: string;
  nom?: string;
  french_name?: string;
  label?: string;
  title?: string;
  'Nom commun'?: string;
  'English common name'?: string;
  'Nom scientifique'?: string;
  ' Region / Stock'?: string; // Some sources include a leading space
  'Region / Stock'?: string;
  'Saison optimale'?: string;
  'methodes de peche'?: string;
  Appats?: string;
  // Image
  url?: string;
  image_url?: string;
  image?: string;
  photo_url?: string;
  image_path?: string;
  url_path?: string;
  path?: string;
  url_bucket?: string;
  image_bucket?: string;
  photo_bucket?: string;
  bucket?: string;
};

const SPECIES_BUCKET = process.env.EXPO_PUBLIC_SPECIES_BUCKET as string | undefined;

function toPublicUrl(candidate?: string | null, bucketHint?: string | null): string | undefined {
  if (!candidate) return undefined;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  let raw = candidate.replace(/^\/+/, '');
  raw = raw.replace(/^storage\/v1\/object\/public\//i, 'public/');
  let bucket = bucketHint ?? undefined;
  let path = raw;
  const m = /^([a-z0-9-_.]+)\/(.+)$/i.exec(raw);
  if (m) {
    const first = m[1];
    const rest = m[2];
    if (first.toLowerCase() === 'public') {
      const m2 = /^([a-z0-9-_.]+)\/(.+)$/i.exec(rest);
      if (m2) {
        bucket = m2[1];
        path = m2[2];
      } else {
        path = rest;
      }
    } else if (!bucket) {
      bucket = first;
      path = rest;
    }
  }
  bucket = bucket || SPECIES_BUCKET || 'species';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl ?? undefined;
}

export default function SpeciesDetailScreen() {
  const params = useLocalSearchParams<{ slug: string; name?: string }>();
  const slug = String(params.slug || '').trim();
  const initialName = (params.name && String(params.name)) || undefined;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [record, setRecord] = React.useState<SpeciesRecord | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setRecord(null);
      try {
        const q = (initialName || slug).replace(/%/g, '');
        // Try to find best match via multiple columns
        const { data, error } = await supabase
          .from('species')
          .select('*')
          .limit(1000);

        if (error) throw error;

        let best: SpeciesRecord | undefined;
        if (Array.isArray(data) && data.length) {
          // Find the closest match by normalized name with flexible keys
          const want = normalizeName(initialName || slug);
          const pickName = (r: any) =>
            r?.['Nom commun'] || r?.name || r?.nom || r?.french_name || r?.label || r?.title || '';
          best = data.find((r: any) => normalizeName(pickName(r)) === want);
          best = best || (data[0] as SpeciesRecord);
        }

        if (mounted) {
          setRecord(best ?? null);
          let img: string | undefined = undefined;
          if (best) {
            const idx = new Map<string, any>();
            for (const [k, v] of Object.entries(best)) idx.set(normKey(k), v);
            const pick = (...cands: string[]) => {
              for (const c of cands) {
                const v = idx.get(normKey(c));
                if (v !== undefined && v !== null && String(v).trim() !== '') return v as string;
              }
              return undefined;
            };
            const raw = pick('url', 'image_url', 'image', 'photo_url', 'image_path', 'url_path', 'path');
            const bucket = pick('url_bucket', 'image_bucket', 'photo_bucket', 'bucket');
            img = toPublicUrl(raw, bucket);
          }
          setImageUrl(img);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug, initialName]);

  // Flexible key access: handle accents/case/extra spaces in column names
  function normKey(k: string) {
    return k
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }
  const recIndex = React.useMemo(() => {
    const r = record as Record<string, any> | null;
    const map = new Map<string, any>();
    if (r) {
      for (const [k, v] of Object.entries(r)) {
        map.set(normKey(k), v);
      }
    }
    return map;
  }, [record]);
  function getField(...candidates: string[]) {
    for (const c of candidates) {
      const v = recIndex.get(normKey(c));
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return undefined;
  }

  const displayName =
    (getField('Nom commun') as string | undefined) ||
    (getField('name', 'nom', 'french_name', 'label', 'title') as string | undefined) ||
    initialName ||
    slug;

  const sciName = getField('Nom scientifique');
  const enName = getField('English common name');
  const region = getField('Region / Stock', ' Region / Stock', 'Région / Stock');
  const season = getField('Saison optimale');
  const methods = getField('methodes de peche', 'Méthodes de pêche');
  const baits = getField('Appats', 'Appâts');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <View style={[styles.center, { flex: 1 }]}> 
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={[styles.center, { flex: 1 }]}> 
          <ThemedText>Erreur: {error}</ThemedText>
        </View>
      ) : (
        <ParallaxScrollView
          headerBackgroundColor={{ light: '#e6f1f5', dark: '#0f1416' }}
          headerImage={
            <View style={{ flex: 1, marginTop: -insets.top }}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.cover} contentFit="cover" />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Text style={{ fontSize: 42 }}>🐟</Text>
                </View>
              )}
              <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: 12 + insets.top }]} hitSlop={10}>
                <IconSymbol name="chevron.left" size={22} color="#111" />
              </Pressable>
            </View>
          }>
          <ThemedText type="title">{displayName}</ThemedText>
          {!!sciName && (
            <ThemedText style={{ marginTop: 4, color: '#444' }}>Nom scientifique: {String(sciName)}</ThemedText>
          )}

          <View style={styles.section}>
            {!!enName && (
              <Text style={styles.row}><Text style={styles.label}>Nom anglais: </Text>{String(enName)}</Text>
            )}
            {!!region && (
              <Text style={styles.row}><Text style={styles.label}>Région / Stock: </Text>{String(region)}</Text>
            )}
            {!!season && (
              <Text style={styles.row}><Text style={styles.label}>Saison optimale: </Text>{String(season)}</Text>
            )}
            {!!methods && (
              <Text style={styles.row}><Text style={styles.label}>Méthodes de pêche: </Text>{String(methods)}</Text>
            )}
            {!!baits && (
              <Text style={styles.row}><Text style={styles.label}>Appâts: </Text>{String(baits)}</Text>
            )}
          </View>
        </ParallaxScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cover: {
    height: '100%',
    width: '100%',
    backgroundColor: '#f1f1f1',
  },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 16, gap: 8 },
  row: { fontSize: 16, color: '#222' },
  label: { fontWeight: '600' },
  backBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
