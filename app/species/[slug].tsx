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
import Ionicons from '@expo/vector-icons/Ionicons';
import { events } from '@/lib/events';
import { useAuth } from '@/providers/AuthProvider';
import WorldMiniMap from '@/components/WorldMiniMap';
import { parseRegionToTags } from '@/constants/regionTags';

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
  const { session } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [record, setRecord] = React.useState<SpeciesRecord | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = React.useState<'infos' | 'catches'>('infos');
  const [myCatches, setMyCatches] = React.useState<Array<{
    id: string;
    species: string;
    weight_kg: number | null;
    length_cm: number | null;
    notes: string | null;
    caught_at: string;
    photo_path: string | null;
    region?: string | null;
  }>>([]);
  const [loadingCatches, setLoadingCatches] = React.useState(false);
  const stats = React.useMemo(() => {
    const total = myCatches.length;
    const weights = myCatches.map((c) => (typeof c.weight_kg === 'number' ? c.weight_kg : 0)).filter((v) => v > 0);
    const lengths = myCatches.map((c) => (typeof c.length_cm === 'number' ? c.length_cm : 0)).filter((v) => v > 0);
    const maxWeight = weights.length ? Math.max(...weights) : null;
    const maxLength = lengths.length ? Math.max(...lengths) : null;
    return { total, maxWeight, maxLength };
  }, [myCatches]);

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

  // URL signée (ou publique) pour photos utilisateur
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

  const refreshCatches = React.useCallback(async () => {
    if (!session) {
      setMyCatches([]);
      return;
    }
    setLoadingCatches(true);
    try {
      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .eq('user_id', session.user.id)
        .order('caught_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const want = normalizeName(initialName || slug);
      const rows = Array.isArray(data) ? (data as any[]) : [];
      const filtered = rows.filter((r) => r?.species && normalizeName(String(r.species)) === want);
      setMyCatches(filtered);
    } catch (e) {
      setMyCatches([]);
    } finally {
      setLoadingCatches(false);
    }
  }, [session, slug, initialName]);

  // Charger à l'affichage
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await refreshCatches();
    })();
    return () => {
      mounted = false;
    };
  }, [refreshCatches]);

  // Rafraîchir après ajout de prise
  React.useEffect(() => {
    const off = events.on('catch:added', () => {
      refreshCatches();
    });
    return off;
  }, [refreshCatches]);

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
  const regionTags = React.useMemo(() => {
    const fromRegion = parseRegionToTags(region ? String(region) : '');
    if (fromRegion.length) return fromRegion;
    // Fallback: try to infer from display name (e.g., "Saumon atlantique")
    return parseRegionToTags(displayName || '');
  }, [region, displayName]);
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
                <Ionicons name="chevron-back" size={26} color="#000" />
              </Pressable>
            </View>
          }>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>{displayName}</ThemedText>
            {!!sciName && <Text style={styles.latinName}>{String(sciName)}</Text>}
          </View>

          {/* Stats card under the title, above tabs */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Plus gros</Text>
              <Text style={styles.statValue}>
                {stats.maxWeight !== null ? `${Number(stats.maxWeight.toFixed(2))} kg` : '—'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total prises</Text>
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Plus long</Text>
              <Text style={styles.statValue}>
                {stats.maxLength !== null ? `${Math.round(stats.maxLength)} cm` : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setActiveTab('infos')}
              style={[styles.tabBtn, activeTab === 'infos' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeTab === 'infos' && styles.tabTextActive]}>Infos</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('catches')}
              style={[styles.tabBtn, activeTab === 'catches' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeTab === 'catches' && styles.tabTextActive]}>Mes prises</Text>
            </Pressable>
          </View>

          {activeTab === 'infos' ? (
            <View style={styles.section}>
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>Zones de présence</Text>
                <WorldMiniMap tags={regionTags} height={140} />
              </View>
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
          ) : (
            <View style={[styles.section, { marginTop: 8 }]}> 
              {!session ? (
                <Text style={{ color: '#666', marginTop: 6 }}>Connecte-toi pour voir tes prises de cette espèce.</Text>
              ) : loadingCatches ? (
                <View style={[styles.center, { paddingVertical: 16 }]}>
                  <ActivityIndicator />
                </View>
              ) : myCatches.length === 0 ? (
                <Text style={{ color: '#666', marginTop: 6 }}>Aucune prise enregistrée pour cette espèce.</Text>
              ) : (
                <View style={{ marginTop: 4 }}>
                  {myCatches.map((c) => (
                    <CatchRow key={c.id} item={c} urlFromPhotoPath={urlFromPhotoPath} />
                  ))}
                </View>
              )}
            </View>
          )}
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
  titleRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  titleText: { marginRight: 6 },
  latinName: { fontSize: 16, color: '#666' },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#f1f1f1' },
  tabBtnActive: { backgroundColor: '#1e90ff' },
  tabText: { fontWeight: '600', color: '#333' },
  tabTextActive: { color: 'white' },
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
});

type CatchItem = {
  id: string;
  species: string;
  weight_kg: number | null;
  length_cm: number | null;
  notes: string | null;
  caught_at: string;
  photo_path: string | null;
  region?: string | null;
};

function CatchRow({ item, urlFromPhotoPath }: { item: CatchItem; urlFromPhotoPath: (p?: string | null) => Promise<string | null> }) {
  const router = useRouter();
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await urlFromPhotoPath(item.photo_path);
      if (mounted) setUrl(u);
    })();
    return () => {
      mounted = false;
    };
  }, [item.photo_path, urlFromPhotoPath]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/catches/[id]', params: { id: item.id } })}
      style={{ paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', gap: 10, flexDirection: 'row' }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: '#eee' }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600' }}>{item.species}</Text>
        <Text style={{ color: '#666', marginTop: 2 }}>
          {new Date(item.caught_at).toLocaleString()}
          {item.weight_kg ? ` · ${item.weight_kg} kg` : ''}
          {item.length_cm ? ` · ${item.length_cm} cm` : ''}
        </Text>
        {item.region ? (
          <Text numberOfLines={1} style={{ marginTop: 4, color: '#374151' }}>
            Lieu : {item.region}
          </Text>
        ) : null}
        {item.notes ? (
          <Text numberOfLines={2} style={{ marginTop: 4, color: '#374151' }}>
            Leurre : {item.notes}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
