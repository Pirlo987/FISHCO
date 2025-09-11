import React from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { events } from '@/lib/events';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { FISH_SPECIES, normalizeName, type Species } from '@/constants/species';
import { ThemedView } from '@/components/ThemedView';
import { ThemedSafeArea } from '@/components/SafeArea';
import { ThemedText } from '@/components/ThemedText';

type CatchRow = { species: string | null; photo_path: string | null };

export default function ExploreScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [discovered, setDiscovered] = React.useState<Set<string>>(new Set());
  const [photoBySpecies, setPhotoBySpecies] = React.useState<Record<string, string | null>>({});
  const [discoveredFilter, setDiscoveredFilter] = React.useState<'all' | 'discovered' | 'undiscovered'>('all');
  const [onlyDbImage, setOnlyDbImage] = React.useState(false);
  const [onlyUserPhoto, setOnlyUserPhoto] = React.useState(false);

  const { width } = useWindowDimensions();
  const padding = 16;
  const gap = 12;
  const tileW = Math.floor((width - padding * 2 - gap * 2) / 3);

  const SPECIES_BUCKET = process.env.EXPO_PUBLIC_SPECIES_BUCKET as string | undefined;

  // Convertit une valeur d'image (URL absolue ou chemin Storage) en URL publique
  const toPublicUrl = (candidate?: string | null, bucketHint?: string | null): string | undefined => {
    if (!candidate) return undefined;
    if (/^https?:\/\//i.test(candidate)) return candidate;
    // Handle common storage path shapes (with or without leading slash):
    // - storage/v1/object/public/<bucket>/<path>
    // - public/<bucket>/<path>
    // - <bucket>/<path>
    let raw = candidate.replace(/^\/+/, '');
    raw = raw.replace(/^storage\/v1\/object\/public\//i, 'public/');
    let bucket = bucketHint ?? undefined;
    let path = raw;
    let m = /^([a-z0-9-_.]+)\/(.+)$/i.exec(raw);
    if (m) {
      const first = m[1];
      let rest = m[2];
      if (first.toLowerCase() === 'public') {
        const m2 = /^([a-z0-9-_.]+)\/(.+)$/i.exec(rest);
        if (m2) {
          bucket = m2[1];
          path = m2[2];
        } else {
          // 'public' with no further slash; fall back to hint/default below
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
  };

  // URL signée (ou publique) pour photos utilisateur
  const urlFromPhotoPath = async (path?: string | null) => {
    if (!path) return null;
    try {
      const { data, error } = await supabase.storage
        .from('catch-photos')
        .createSignedUrl(path, 60 * 60 * 24);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {}
    const { data } = supabase.storage.from('catch-photos').getPublicUrl(path);
    return data.publicUrl ?? null;
  };

  const fetchDiscovered = React.useCallback(async () => {
    if (!session) {
      setDiscovered(new Set());
      setPhotoBySpecies({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('catches')
      .select('species, photo_path')
      .eq('user_id', session.user.id)
      .order('caught_at', { ascending: false });

    const photoMap: Record<string, string | null> = {};
    const discoveredSet = new Set<string>();
    if (!error && data) {
      const firstPathByKey: Record<string, string> = {};
      for (const row of data as CatchRow[]) {
        if (!row.species) continue;
        const key = normalizeName(row.species);
        discoveredSet.add(key);
        if (!firstPathByKey[key] && row.photo_path) firstPathByKey[key] = row.photo_path;
      }
      const entries = await Promise.all(
        Object.entries(firstPathByKey).map(async ([key, path]) => [key, await urlFromPhotoPath(path)] as const)
      );
      for (const [k, v] of entries) photoMap[k] = v ?? null;
    }
    setPhotoBySpecies(photoMap);
    setDiscovered(discoveredSet);
    setLoading(false);
  }, [session]);

  React.useEffect(() => {
    fetchDiscovered();
  }, [fetchDiscovered]);

  // Ne plus rafraîchir sur focus; on écoute seulement les ajouts de prises
  React.useEffect(() => {
    const off = events.on('catch:added', () => {
      fetchDiscovered();
    });
    return off;
  }, [fetchDiscovered]);

  const [speciesList, setSpeciesList] = React.useState<Species[]>([]);
  // Variables conservées pour compat avec onEndReached (désactivé logiquement)
  const PAGE_SIZE = 60;
  const [pageIndex, setPageIndex] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingPage, setLoadingPage] = React.useState(false);
  const fetchSpeciesPage = React.useCallback((_page: number) => {}, []);

  // Charger TOUTES les espèces (une fois), puis on affichera uniquement les découvertes
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('species')
          .select('*');
        if (!error && Array.isArray(data)) {
          const mapped: Species[] = (data as any[])
            .map((r) => {
              const name =
                r.name ?? r.nom ?? r['Nom commun'] ?? r['nom commun'] ?? r.french_name ?? r.label ?? r.title ?? '';
              const image = toPublicUrl(
                r.url ?? r.image_url ?? r.image ?? r.photo_url ?? r.image_path ?? r.url_path ?? r.path ?? null,
                r.url_bucket ?? r.image_bucket ?? r.photo_bucket ?? r.bucket ?? null
              );
              return { name, image } as Species;
            })
            .filter((s) => s.name);
          // Deduplicate by normalized name to avoid duplicate keys
          const byKey = new Map<string, Species>();
          for (const s of mapped) {
            const key = normalizeName(s.name);
            if (!byKey.has(key)) byKey.set(key, s);
          }
          if (!cancelled) setSpeciesList(Array.from(byKey.values()));
          if (!cancelled) setLoading(false);
          return;
        }
      } catch {}
      try {
        const json = require('@/assets/data/species.json') as Species[];
        if (json && Array.isArray(json)) {
          // Merge local JSON images into full list, not limit to JSON
          const byKey = new Map<string, Species>();
          for (const s of FISH_SPECIES) byKey.set(normalizeName(s.name), { ...s });
          for (const extra of json) {
            if (!extra?.name) continue;
            const key = normalizeName(extra.name);
            const base = byKey.get(key) ?? { name: extra.name };
            byKey.set(key, { ...base, image: extra.image ?? base.image });
          }
          if (!cancelled) setSpeciesList(Array.from(byKey.values()));
          if (!cancelled) setLoading(false);
          return;
        }
      } catch {}
      if (!cancelled) setSpeciesList(FISH_SPECIES);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = React.useMemo(() => {
    const q = normalizeName(search);
    const base = q ? speciesList.filter((s) => normalizeName(s.name).includes(q)) : speciesList;
    return base.filter((s) => {
      const key = normalizeName(s.name);
      const isDiscovered = discovered.has(key);
      if (discoveredFilter === 'discovered' && !isDiscovered) return false;
      if (discoveredFilter === 'undiscovered' && isDiscovered) return false;
      if (onlyDbImage && !s.image) return false;
      if (onlyUserPhoto && !photoBySpecies[key]) return false;
      return true;
    });
  }, [search, speciesList, discovered, discoveredFilter, onlyDbImage, onlyUserPhoto, photoBySpecies]);

  return (
    <ThemedSafeArea>
    <ThemedView style={{ flex: 1 }}>
      <View style={styles.header}>
        <ThemedText type="title">Explorer</ThemedText>
        <TextInput
          placeholder="Rechercher une espèce..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          placeholderTextColor="#888"
        />
        <View style={styles.filtersRowWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            <Pressable
              onPress={() => setDiscoveredFilter((v) => (v === 'discovered' ? 'all' : 'discovered'))}
              style={[styles.chip, discoveredFilter === 'discovered' && styles.chipActive]}
            >
              <Text style={[styles.chipText, discoveredFilter === 'discovered' && styles.chipTextActive]}>Découverts</Text>
            </Pressable>
            <Pressable
              onPress={() => setDiscoveredFilter((v) => (v === 'undiscovered' ? 'all' : 'undiscovered'))}
              style={[styles.chip, discoveredFilter === 'undiscovered' && styles.chipActive]}
            >
              <Text style={[styles.chipText, discoveredFilter === 'undiscovered' && styles.chipTextActive]}>À découvrir</Text>
            </Pressable>
            <Pressable onPress={() => setOnlyDbImage((v) => !v)} style={[styles.chip, onlyDbImage && styles.chipActive]}>
              <Text style={[styles.chipText, onlyDbImage && styles.chipTextActive]}>Avec image</Text>
            </Pressable>
            <Pressable onPress={() => setOnlyUserPhoto((v) => !v)} style={[styles.chip, onlyUserPhoto && styles.chipActive]}>
              <Text style={[styles.chipText, onlyUserPhoto && styles.chipTextActive]}>Avec photo</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}> 
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: padding, paddingBottom: 24 }}
          data={filtered}
          keyExtractor={(item) => item.name}
          numColumns={3}
            columnWrapperStyle={{ gap }}
            onEndReached={() => {}}
          renderItem={({ item }) => {
            const key = normalizeName(item.name);
            const isDiscovered = discovered.has(key);
            // Show DB species image even before discovery (dimmed). After discovery, still prefer DB image,
            // and fallback to user's first catch photo if DB image missing.
            const userPhoto = photoBySpecies[key] ?? null;
            const uri = item.image ?? (isDiscovered ? userPhoto ?? null : null);
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/species/[slug]', params: { slug: key, name: item.name } })}
                style={{ width: tileW, marginBottom: 12 }}
              >
                <View style={[styles.tile, !isDiscovered && styles.tileUndiscovered, { height: tileW }]}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.tileImage} contentFit="cover" />
                  ) : (
                    <View style={styles.tilePlaceholder}>
                      <Text style={styles.tileEmoji}>🐟</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tileLabel, !isDiscovered && styles.tileLabelDim]} numberOfLines={1}>
                  {isDiscovered ? item.name : '???'}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={() => (
            <View style={[styles.center, { paddingTop: 40 }]}>
              <ThemedText>Aucune espèce</ThemedText>
            </View>
          )}
        />
      )}
    </ThemedView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  search: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  filtersRowWrapper: { marginTop: 2 },
  filtersRow: { paddingVertical: 4, gap: 8, paddingRight: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#f1f1f1',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#1e90ff',
  },
  chipText: { color: '#333', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tile: {
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileUndiscovered: {
    backgroundColor: '#e9e9e9',
    opacity: 0.45,
  },
  tileImage: { width: '100%', height: '100%' },
  tilePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tileEmoji: { fontSize: 28 },
  tileLabel: { marginTop: 6, textAlign: 'center', fontWeight: '600' },
  tileLabelDim: { color: '#888', fontWeight: '500' },
});
