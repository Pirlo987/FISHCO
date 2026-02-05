import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { events } from '@/lib/events';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { FISH_SPECIES, normalizeName, type Species } from '@/constants/species';
import { ThemedView } from '@/components/ThemedView';
import { ThemedSafeArea } from '@/components/SafeArea';
import { ThemedText } from '@/components/ThemedText';

type CatchRow = { species: string | null; photo_path: string | null; [key: string]: any };

export default function ExploreScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = React.useRef<FlatList<Species> | null>(null);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [verifiedCatchSpecies, setVerifiedCatchSpecies] = React.useState<Set<string>>(new Set());
  const [pendingCatchSpecies, setPendingCatchSpecies] = React.useState<Set<string>>(new Set());
  const [photoBySpecies, setPhotoBySpecies] = React.useState<Record<string, string | null>>({});
  const [discoveredFilter, setDiscoveredFilter] = React.useState<'all' | 'discovered' | 'undiscovered'>('all');
  const [waterFilter, setWaterFilter] = React.useState<'all' | 'fresh' | 'salt'>('all');
  const [scrollTarget, setScrollTarget] = React.useState<string | null>(null);

  const { width } = useWindowDimensions();
  const padding = 16;
  const gap = 12;
  const tileW = Math.floor((width - padding * 2 - gap * 2) / 3);
  const rowHeight = React.useMemo(() => tileW + 12 + 28, [tileW]);

  const SPECIES_BUCKET = process.env.EXPO_PUBLIC_SPECIES_BUCKET as string | undefined;
  const HEADER_COLOR = '#DBEAFE';

  const normalizeStatus = (value: any) => {
    if (value === null || value === undefined) return null;
    return String(value).trim().toLowerCase();
  };

  const isTruthyFlag = (value: any) => {
    if (value === true) return true;
    if (value === false) return false;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      return ['true', '1', 'yes', 'y', 'oui', 'ok', 'valid', 'valide', 'validated', 'approved', 'approuve', 'approuvee'].includes(v);
    }
    return false;
  };

  const parseWaterType = (value: any): 'fresh' | 'salt' | null => {
    if (value === null || value === undefined) return null;
    const normalized = normalizeName(String(value));
    if (!normalized) return null;
    const compact = normalized.replace(/\s+/g, '');
    const freshKeywords = [
      'eaudouce',
      'douce',
      'fresh',
      'freshwater',
      'riviere',
      'rivieres',
      'fleuve',
      'fleuves',
      'lac',
      'lacs',
      'lacustre',
      'etang',
      'etangs',
    ];
    const saltKeywords = ['eausalee', 'salee', 'sale', 'salt', 'saltwater', 'mer', 'mers', 'ocean', 'oceans', 'marine', 'marin', 'maritime'];
    const includesKeyword = (keywords: string[]) =>
      keywords.some((keyword) => normalized.includes(keyword) || compact.includes(keyword));
    if (includesKeyword(freshKeywords)) return 'fresh';
    if (includesKeyword(saltKeywords)) return 'salt';
    return null;
  };

  const parseVerification = (record: Record<string, any> | null | undefined) => {
    if (!record) return { verified: true, pending: false };
    const status = normalizeStatus(
      record.status ??
        record.statut ??
        record.validation_status ??
        record.review_status ??
        record.moderation_status ??
        record.state ??
        record.review ??
        null,
    );
    const rawVerified =
      record.is_verified ??
      record.verified ??
      record.validated ??
      record.approved ??
      record.published ??
      record.species_verified ??
      null;

    const verifiedFromFlag = isTruthyFlag(rawVerified);
    const verifiedFromStatus =
      status &&
      ['verified', 'validated', 'valide', 'approved', 'approuve', 'approuvee', 'published', 'active'].includes(status);

    const pending =
      status && ['pending', 'en attente', 'in_review', 'review', 'a_valider', 'to_validate', 'draft', 'proposed'].includes(status);
    const rejected = status && ['rejected', 'refused', 'refuse', 'deny', 'denied', 'blocked', 'archived'].includes(status);

    if (rejected) return { verified: false, pending: false };
    if (pending) return { verified: false, pending: true };
    if (verifiedFromFlag || verifiedFromStatus) return { verified: true, pending: false };
    return { verified: true, pending: false };
  };

  // Convert a storage path or URL to a public URL
  const toPublicUrl = (candidate?: string | null, bucketHint?: string | null): string | undefined => {
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
  };

  const urlFromPhotoPath = async (path?: string | null) => {
    if (!path) return null;
    try {
      const { data, error } = await supabase.storage.from('catch-photos').createSignedUrl(path, 60 * 60 * 24);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {}
    const { data } = supabase.storage.from('catch-photos').getPublicUrl(path);
    return data.publicUrl ?? null;
  };

  const fetchDiscovered = React.useCallback(async () => {
    if (!session) {
      setVerifiedCatchSpecies(new Set());
      setPendingCatchSpecies(new Set());
      setPhotoBySpecies({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('catches')
      .select('*')
      .eq('user_id', session.user.id)
      .order('caught_at', { ascending: false });

    const photoMap: Record<string, string | null> = {};
    const verifiedSet = new Set<string>();
    const pendingSet = new Set<string>();
    if (!error && data) {
      const firstPathByKey: Record<string, string> = {};
      for (const row of data as CatchRow[]) {
        if (!row.species) continue;
        const key = normalizeName(row.species);
        const { verified, pending } = parseVerification(row);
        if (verified) {
          verifiedSet.add(key);
        } else if (pending) {
          pendingSet.add(key);
        }
        if (!firstPathByKey[key] && row.photo_path) firstPathByKey[key] = row.photo_path;
      }
      const entries = await Promise.all(
        Object.entries(firstPathByKey).map(async ([key, path]) => [key, await urlFromPhotoPath(path)] as const),
      );
      for (const [k, v] of entries) photoMap[k] = v ?? null;
    }
    setPhotoBySpecies(photoMap);
    setVerifiedCatchSpecies(verifiedSet);
    setPendingCatchSpecies(pendingSet);
    setLoading(false);
  }, [session]);

  React.useEffect(() => {
    fetchDiscovered();
  }, [fetchDiscovered]);

  React.useEffect(() => {
    setScrollTarget(null);
  }, [session?.user?.id]);

  React.useEffect(() => {
    const off = events.on('catch:added', (payload) => {
      const { species, normalized, target } = payload;
      const key = normalized || (species ? normalizeName(species) : null);
      setSearch('');
      setDiscoveredFilter('all');
      setWaterFilter('all');
      if (key) setScrollTarget(key);
      if (target) {
        setTimeout(() => {
          try {
            if (target.type === 'species') {
              router.push({
                pathname: '/species/[slug]',
                params: { slug: target.slug, name: target.name ?? species ?? '' },
              });
            } else if (target.type === 'catch') {
              router.push({ pathname: '/catches/[id]', params: { id: target.id } });
            }
          } catch {}
        }, 50);
      }
      fetchDiscovered();
    });
    return off;
  }, [fetchDiscovered, router, setSearch, setDiscoveredFilter, setWaterFilter]);

  const [speciesList, setSpeciesList] = React.useState<Species[]>([]);
  const PAGE_SIZE = 60;
  const [pageIndex, setPageIndex] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingPage, setLoadingPage] = React.useState(false);
  const fetchSpeciesPage = React.useCallback((_page: number) => {}, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from('species').select('*');
        if (!error && Array.isArray(data)) {
          const mapped: Species[] = (data as any[])
            .map((r) => {
              const name =
                r.name ??
                r.french_name ??
                r.english_name ??
                r['Nom commun'] ??
                r['nom commun'] ??
                r.nom ??
                r.label ??
                r.title ??
                '';
              const image = toPublicUrl(
                r.image_url ?? r.url ?? r.image ?? r.photo_url ?? r.image_path ?? r.url_path ?? r.path ?? null,
                r.image_bucket ?? r.url_bucket ?? r.photo_bucket ?? r.bucket ?? null,
              );
              const status =
                r.status ??
                r.statut ??
                r.validation_status ??
                r.review_status ??
                r.moderation_status ??
                r.state ??
                r.review ??
                null;
              const { verified, pending } = parseVerification(r);
              const waterSource =
                r.water_type ??
                r.waterType ??
                r.water ??
                r.environment ??
                r.habitat ??
                r.milieu ??
                r.milieu_naturel ??
                r.zone ??
                null;
              const waterType = parseWaterType(waterSource);
              return {
                name,
                image,
                status: status ?? null,
                verified: pending ? false : verified,
                waterType: waterType ?? undefined,
              } as Species;
            })
            .filter((s) => s.name);
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
          const byKey = new Map<string, Species>();
          for (const s of FISH_SPECIES) byKey.set(normalizeName(s.name), { ...s, verified: true });
          for (const extra of json) {
            if (!extra?.name) continue;
            const key = normalizeName(extra.name);
            const base = byKey.get(key) ?? { name: extra.name, verified: true };
            const extraWaterType = parseWaterType(
              (extra as any).waterType ??
                (extra as any).water_type ??
                (extra as any).water ??
                (extra as any).environment ??
                (extra as any).habitat ??
                null,
            );
            const resolvedWaterType = base.waterType ?? extraWaterType ?? null;
            byKey.set(key, {
              ...base,
              image: extra.image ?? base.image,
              verified: base.verified ?? true,
              waterType: resolvedWaterType ?? undefined,
            });
          }
          if (!cancelled) setSpeciesList(Array.from(byKey.values()));
          if (!cancelled) setLoading(false);
          return;
        }
      } catch {}
      if (!cancelled) setSpeciesList(FISH_SPECIES);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const speciesIndex = React.useMemo(() => {
    const index = new Map<string, Species>();
    for (const s of speciesList) index.set(normalizeName(s.name), s);
    return index;
  }, [speciesList]);

  const isSpeciesVerified = React.useCallback(
    (key: string) => {
      const spec = speciesIndex.get(key);
      if (!spec) return false;
      const status = normalizeStatus(spec.status);
      const pending =
        status &&
        ['pending', 'en attente', 'in_review', 'review', 'a_valider', 'to_validate', 'draft', 'proposed'].includes(status);
      const rejected = status && ['rejected', 'refused', 'deny', 'denied', 'blocked', 'archived'].includes(status);
      if (spec.verified === false || pending || rejected) return false;
      if (spec.verified === true) return true;
      if (status && ['verified', 'validated', 'valide', 'approved', 'approuve', 'approuvee', 'published', 'active'].includes(status))
        return true;
      return true;
    },
    [speciesIndex],
  );

  const verifiedDiscovered = React.useMemo(() => {
    const out = new Set<string>();
    verifiedCatchSpecies.forEach((key) => {
      if (isSpeciesVerified(key)) out.add(key);
    });
    return out;
  }, [verifiedCatchSpecies, isSpeciesVerified]);

  const filtered = React.useMemo(() => {
    const q = normalizeName(search);
    const base = q ? speciesList.filter((s) => normalizeName(s.name).includes(q)) : speciesList;
    return base.filter((s) => {
      const key = normalizeName(s.name);
      const isDiscovered = verifiedDiscovered.has(key);
      if (discoveredFilter === 'discovered' && !isDiscovered) return false;
      if (discoveredFilter === 'undiscovered' && isDiscovered) return false;
      if (waterFilter === 'fresh' && s.waterType !== 'fresh') return false;
      if (waterFilter === 'salt' && s.waterType !== 'salt') return false;
      return true;
    });
  }, [search, speciesList, verifiedDiscovered, discoveredFilter, waterFilter]);

  React.useEffect(() => {
    if (!scrollTarget) return;
    const index = filtered.findIndex((s) => normalizeName(s.name) === scrollTarget);
    if (index < 0) return;
    const timer = setTimeout(() => {
      if (!listRef.current) return;
      try {
        listRef.current.scrollToIndex({ index, animated: true });
      } catch {
        const row = Math.floor(index / 3);
        listRef.current.scrollToOffset({ offset: row * rowHeight, animated: true });
      }
      setScrollTarget(null);
    }, 120);
    return () => clearTimeout(timer);
  }, [scrollTarget, filtered, rowHeight]);

  const getItemLayout = React.useCallback(
    (_: Species[] | null | undefined, index: number) => {
      const row = Math.floor(index / 3);
      return { index, length: rowHeight, offset: row * rowHeight };
    },
    [rowHeight],
  );

  const onScrollToIndexFailed = React.useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const row = Math.floor(info.index / 3);
      const offset = row * rowHeight;
      listRef.current?.scrollToOffset({ offset, animated: true });
      setScrollTarget(null);
    },
    [rowHeight],
  );

  const discoveredCount = verifiedDiscovered.size;
  const totalCount = speciesList.length;

  return (
    <ThemedSafeArea style={{ backgroundColor: HEADER_COLOR }}>
      <ThemedView style={{ flex: 1 }}>
        <View style={[styles.header, { paddingTop: 0, backgroundColor: HEADER_COLOR }]}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <ThemedText style={styles.title}>Fishdex</ThemedText>
              <ThemedText style={styles.subtitle}>Deviens le meilleur pecheur</ThemedText>
            </View>
            <View style={styles.statsBox}>
              <ThemedText style={styles.statsText}>
                {discoveredCount}/{totalCount}
              </ThemedText>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              placeholder="Rechercher une espece..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholderTextColor="#94A3B8"
            />
            <Pressable
              onPress={() => setSearch('')}
              style={[styles.clearButton, search.length === 0 && styles.clearButtonHidden]}
              disabled={search.length === 0}
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersRow}
          >
            <Pressable
              onPress={() => setDiscoveredFilter((v) => (v === 'discovered' ? 'all' : 'discovered'))}
              style={[styles.chip, discoveredFilter === 'discovered' && styles.chipActive]}
            >
              <Ionicons
                name={discoveredFilter === 'discovered' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={16}
                color={discoveredFilter === 'discovered' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.chipText, discoveredFilter === 'discovered' && styles.chipTextActive]}>
                Decouverts
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDiscoveredFilter((v) => (v === 'undiscovered' ? 'all' : 'undiscovered'))}
              style={[styles.chip, discoveredFilter === 'undiscovered' && styles.chipActive]}
            >
              <Ionicons
                name={discoveredFilter === 'undiscovered' ? 'help-circle' : 'help-circle-outline'}
                size={16}
                color={discoveredFilter === 'undiscovered' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.chipText, discoveredFilter === 'undiscovered' && styles.chipTextActive]}>
                A decouvrir
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setWaterFilter((v) => (v === 'fresh' ? 'all' : 'fresh'))}
              style={[styles.chip, waterFilter === 'fresh' && styles.chipActive]}
            >
              <Ionicons
                name={waterFilter === 'fresh' ? 'water' : 'water-outline'}
                size={16}
                color={waterFilter === 'fresh' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.chipText, waterFilter === 'fresh' && styles.chipTextActive]}>Eau douce</Text>
            </Pressable>

            <Pressable
              onPress={() => setWaterFilter((v) => (v === 'salt' ? 'all' : 'salt'))}
              style={[styles.chip, waterFilter === 'salt' && styles.chipActive]}
            >
              <Ionicons
                name={waterFilter === 'salt' ? 'boat' : 'boat-outline'}
                size={16}
                color={waterFilter === 'salt' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.chipText, waterFilter === 'salt' && styles.chipTextActive]}>Eau salée</Text>
            </Pressable>
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: padding, paddingBottom: 24 }}
            data={filtered}
            keyExtractor={(item) => item.name}
            numColumns={3}
            columnWrapperStyle={{ gap }}
            onEndReached={() => {}}
            getItemLayout={getItemLayout}
            onScrollToIndexFailed={onScrollToIndexFailed}
            renderItem={({ item }) => {
              const key = normalizeName(item.name);
              const isDiscovered = verifiedDiscovered.has(key);
              const isPending = pendingCatchSpecies.has(key) && !isDiscovered;
              const userPhoto = photoBySpecies[key] ?? null;
              const uri = item.image ?? (isDiscovered || isPending ? userPhoto ?? null : null);
              return (
                <SpeciesTile
                  item={item}
                  tileWidth={tileW}
                  isDiscovered={isDiscovered}
                  isPending={isPending}
                  onPress={() =>
                    router.push({ pathname: '/species/[slug]', params: { slug: key, name: item.name } })
                  }
                  imageUri={uri}
                />
              );
            }}
            ListEmptyComponent={() => (
              <View style={[styles.center, { paddingTop: 60 }]}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="fish-outline" size={48} color="#94A3B8" />
                </View>
                <ThemedText style={styles.emptyText}>Aucune espece trouvee</ThemedText>
                <ThemedText style={styles.emptySubtext}>Essayez de modifier vos filtres</ThemedText>
              </View>
            )}
          />
        )}
      </ThemedView>
    </ThemedSafeArea>
  );
}

type SpeciesTileProps = {
  item: Species;
  tileWidth: number;
  isDiscovered: boolean;
  isPending?: boolean;
  onPress: () => void;
  imageUri: string | null;
};

const SpeciesTile = React.memo(function SpeciesTile({
  item,
  tileWidth,
  isDiscovered,
  isPending = false,
  onPress,
  imageUri,
}: SpeciesTileProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { width: tileWidth, marginBottom: 12 },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View
        style={[
          styles.tile,
          !isDiscovered && styles.tileUndiscovered,
          { height: tileWidth },
        ]}
      >
        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.tileImage} contentFit="cover" />
            {!isDiscovered && <View style={styles.tileOverlay} />}
          </>
        ) : (
          <View style={styles.tilePlaceholder}>
            <Ionicons name="fish-outline" size={36} color={isDiscovered ? '#94A3B8' : '#CBD5E1'} />
          </View>
        )}

        {isPending && (
          <View style={styles.pendingBadge}>
            <Ionicons name="time-outline" size={16} color="#F97316" />
          </View>
        )}

        {isDiscovered && (
          <View style={styles.discoveredBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          </View>
        )}
      </View>

      <Text style={[styles.tileLabel, !isDiscovered && styles.tileLabelDim]} numberOfLines={1}>
        {item.name}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E3A8A',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
  },
  statsBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  statsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E5FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonHidden: {
    opacity: 0,
  },
  filtersScroll: {
    marginHorizontal: -16,
  },
  filtersRow: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  chipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  chipText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  tile: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tileUndiscovered: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.7)',
  },
  tilePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  pendingBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  discoveredBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tileLabel: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    color: '#0F172A',
  },
  tileLabelDim: {
    color: '#94A3B8',
    fontWeight: '500',
  },
});
