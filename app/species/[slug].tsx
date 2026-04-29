import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Image as RNImage,
} from 'react-native';
import { usePulse } from '@/hooks/usePulse';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  name?: string;
  latin_name?: string;
  english_name?: string;
  french_name?: string;
  fish_type?: string;
  water_type?: string;
  opening_period?: string;
  average_weight_kg?: number | string | null;
  max_weight_kg?: number | string | null;
  average_lifespan_years?: number | string | null;
  conservation_status?: string;
  diet?: string;
  region_stock?: string;
  regions?: string[] | null;
  average_size_cm?: number | string | null;
  maturity_size_cm?: number | string | null;
  optimal_season?: string;
  fishing_methods?: string;
  baits?: string;
  legal_min_size_cm?: number | string | null;
  image_url?: string;
  nom?: string;
  label?: string;
  title?: string;
  'Nom commun'?: string;
  'English common name'?: string;
  'Nom scientifique'?: string;
  'Nom français'?: string;
  ' Type de poisson'?: string;
  'Type de poisson'?: string;
  'Type de point d\'eau'?: string;
  'Période d\'ouverture (indicative)'?: string;
  'Poids moyen (kg)'?: number | string | null;
  'Poids max (kg)'?: number | string | null;
  'Longévité moyenne (années)'?: number | string | null;
  'Statut de conservation (UICN)'?: string;
  'Régime alimentaire détaillé'?: string;
  ' Region / Stock'?: string;
  'Region / Stock'?: string;
  'Région / Stock'?: string;
  'Taille moyenne (cm)'?: number | string | null;
  'Taille maturite 50% (cm)'?: number | string | null;
  'Saison optimale'?: string;
  'methodes de peche'?: string;
  'Méthodes de pêche'?: string;
  Appats?: string;
  'Appâts'?: string;
  'Taille minimale legale (cm)'?: number | string | null;
  url?: string;
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

const REGION_LABELS: Record<string, string> = {
  atl_n: 'Atlantique Nord',
  atl_s: 'Atlantique Sud',
  med: 'Méditerranée',
  north_sea: 'Mer du Nord',
  baltic: 'Mer Baltique',
  black: 'Mer Noire',
  pac_n: 'Pacifique Nord',
  pac_s: 'Pacifique Sud',
  indian: 'Océan Indien',
  arctic: 'Arctique',
  southern: 'Océan Austral',
  freshwater_eu: 'Eaux douces EU',
  freshwater_na: 'Eaux douces Amérique',
  freshwater_sa: 'Amazonie',
  freshwater_af: 'Afrique',
  freshwater_as: 'Asie',
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
      if (m2) { bucket = m2[1]; path = m2[2]; } else { path = rest; }
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [record, setRecord] = React.useState<SpeciesRecord | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = React.useState<'infos' | 'catches'>('infos');
  const [imagePreviewVisible, setImagePreviewVisible] = React.useState(false);
  const [imageSize, setImageSize] = React.useState<{ width: number; height: number } | null>(null);
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
        const safe = q.replace(/'/g, "''");
        const { data, error } = await supabase
          .from('species')
          .select('*')
          .or(`name.ilike.%${safe}%,french_name.ilike.%${safe}%,english_name.ilike.%${safe}%`)
          .limit(20);
        if (error) throw error;
        let best: SpeciesRecord | undefined;
        if (Array.isArray(data) && data.length) {
          const want = normalizeName(initialName || slug);
          const pickName = (r: any) =>
            r?.name || r?.french_name || r?.english_name ||
            r?.['Nom commun'] || r?.nom || r?.label || r?.title || '';
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
            const raw = pick('image_url', 'url', 'image', 'photo_url', 'image_path', 'url_path', 'path');
            const bucket = pick('image_bucket', 'url_bucket', 'photo_bucket', 'bucket');
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
    return () => { mounted = false; };
  }, [slug, initialName]);

  React.useEffect(() => {
    if (!imageUrl) { setImageSize(null); return; }
    let cancelled = false;
    RNImage.getSize(
      imageUrl,
      (width, height) => { if (!cancelled) setImageSize({ width, height }); },
      () => { if (!cancelled) setImageSize(null); },
    );
    return () => { cancelled = true; };
  }, [imageUrl]);

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

  const isPointInsideImage = React.useCallback(
    (x: number, y: number) => {
      if (!imageSize || !screenWidth || !screenHeight) return false;
      const aspect = imageSize.width / imageSize.height;
      const screenAspect = screenWidth / screenHeight;
      let displayWidth = screenWidth;
      let displayHeight = screenHeight;
      if (aspect > screenAspect) {
        displayHeight = screenWidth / aspect;
      } else {
        displayWidth = screenHeight * aspect;
      }
      const offsetX = (screenWidth - displayWidth) / 2;
      const offsetY = (screenHeight - displayHeight) / 2;
      return x >= offsetX && x <= offsetX + displayWidth && y >= offsetY && y <= offsetY + displayHeight;
    },
    [imageSize, screenWidth, screenHeight],
  );

  const refreshCatches = React.useCallback(async () => {
    if (!session) { setMyCatches([]); return; }
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
    } catch {
      setMyCatches([]);
    } finally {
      setLoadingCatches(false);
    }
  }, [session, slug, initialName]);

  React.useEffect(() => {
    let mounted = true;
    (async () => { if (mounted) await refreshCatches(); })();
    return () => { mounted = false; };
  }, [refreshCatches]);

  React.useEffect(() => {
    const off = events.on('catch:added', () => { refreshCatches(); });
    return off;
  }, [refreshCatches]);

  function normKey(k: string) {
    return k.trim().toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ');
  }

  const recIndex = React.useMemo(() => {
    const r = record as Record<string, any> | null;
    const map = new Map<string, any>();
    if (r) { for (const [k, v] of Object.entries(r)) map.set(normKey(k), v); }
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
    (getField('name', 'french_name', 'english_name', 'Nom commun', 'nom', 'label', 'title') as string | undefined) ||
    initialName || slug;
  const sciName = getField('latin_name', 'Nom scientifique');
  const enName = getField('english_name', 'English common name');
  const region = getField('region_stock', 'Region / Stock', ' Region / Stock', 'Région / Stock');
  const regionTags = React.useMemo(() => {
    if (Array.isArray(record?.regions) && record.regions.length > 0) return record.regions as string[];
    const fromRegion = parseRegionToTags(region ? String(region) : '');
    if (fromRegion.length) return fromRegion;
    return parseRegionToTags(displayName || '');
  }, [record, region, displayName]);
  const season = getField('optimal_season', 'Saison optimale');
  const methods = getField('fishing_methods', 'methodes de peche', 'Méthodes de pêche');
  const baits = getField('baits', 'Appats', 'Appâts');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <SpeciesDetailSkeleton />
      ) : error ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ThemedText>Erreur : {error}</ThemedText>
        </View>
      ) : (
        <>
          <ParallaxScrollView
            headerBackgroundColor={{ light: '#DBEAFE', dark: '#0f172a' }}
            headerImage={
              <View style={{ flex: 1, marginTop: -insets.top }}>
                {imageUrl ? (
                  <Pressable onPress={() => setImagePreviewVisible(true)} style={{ flex: 1 }}>
                    <Image source={{ uri: imageUrl }} style={styles.cover} contentFit="cover" />
                  </Pressable>
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <Text style={{ fontSize: 42 }}>🐟</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => router.back()}
                  style={[styles.backBtn, { top: 12 + insets.top }]}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back" size={26} color="#000" />
                </Pressable>
              </View>
            }
          >
            {/* Titre */}
            <View style={styles.titleRow}>
              <ThemedText type="title" style={styles.titleText}>{displayName}</ThemedText>
              {!!sciName && <Text style={styles.latinName}>{String(sciName)}</Text>}
            </View>

            {/* Stats — identique à la page prise */}
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

            {/* Tabs */}
            <View style={styles.tabBar}>
              <Pressable onPress={() => setActiveTab('infos')} style={styles.tabItem}>
                <Text style={[styles.tabText, activeTab === 'infos' && styles.tabTextActive]}>Infos</Text>
                {activeTab === 'infos' && <View style={styles.tabUnderline} />}
              </Pressable>
              <Pressable onPress={() => setActiveTab('catches')} style={styles.tabItem}>
                <Text style={[styles.tabText, activeTab === 'catches' && styles.tabTextActive]}>Mes prises</Text>
                {activeTab === 'catches' && <View style={styles.tabUnderline} />}
              </Pressable>
            </View>

            {activeTab === 'infos' ? (
              <>
                {/* Fiche espèce */}
                {(enName || region || season || methods || baits) && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Fiche espèce</Text>
                    <View style={styles.infoCard}>
                      {enName && (
                        <InfoRow icon="language-outline" label="Nom anglais" value={String(enName)} />
                      )}
                      {region && (
                        <InfoRow icon="location-outline" label="Région / Stock" value={String(region)} />
                      )}
                      {season && (
                        <InfoRow icon="calendar-outline" label="Saison optimale" value={String(season)} />
                      )}
                      {methods && (
                        <InfoRow icon="fish-outline" label="Méthodes de pêche" value={String(methods)} />
                      )}
                      {baits && (
                        <InfoRow icon="leaf-outline" label="Appâts recommandés" value={String(baits)} />
                      )}
                    </View>
                  </View>
                )}

                {/* Zones de présence */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Zones de présence</Text>
                  <WorldMiniMap tags={regionTags} height={140} />
                  {regionTags.length > 0 && (
                    <View style={styles.tagRow}>
                      {regionTags.map((tag) => (
                        <View style={styles.tag} key={tag}>
                          <Text style={styles.tagText}>{REGION_LABELS[tag] ?? tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.section}>
                {!session ? (
                  <Text style={styles.emptyText}>Connecte-toi pour voir tes prises de cette espèce.</Text>
                ) : loadingCatches ? (
                  <ActivityIndicator color="#1E3A8A" style={{ marginTop: 8 }} />
                ) : myCatches.length === 0 ? (
                  <Text style={styles.emptyText}>Aucune prise enregistrée pour cette espèce.</Text>
                ) : (
                  <>
                    {myCatches.map((c) => (
                      <CatchRow key={c.id} item={c} urlFromPhotoPath={urlFromPhotoPath} />
                    ))}
                  </>
                )}
              </View>
            )}
          </ParallaxScrollView>

          <Modal
            visible={imagePreviewVisible}
            animationType="fade"
            transparent
            onRequestClose={() => setImagePreviewVisible(false)}
          >
            <Pressable
              style={styles.imageModalBackdrop}
              onPress={(event) => {
                const { locationX, locationY } = event.nativeEvent;
                if (!isPointInsideImage(locationX, locationY)) setImagePreviewVisible(false);
              }}
            >
              {imageUrl ? (
                <ScrollView
                  style={styles.imageModalScroll}
                  contentContainerStyle={styles.imageModalContent}
                  minimumZoomScale={1}
                  maximumZoomScale={4}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  centerContent
                  bounces={false}
                >
                  <Image source={{ uri: imageUrl }} style={styles.imageModalImage} contentFit="contain" />
                </ScrollView>
              ) : null}
              <Pressable style={styles.imageModalClose} onPress={() => setImagePreviewVisible(false)}>
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SpeciesDetailSkeleton() {
  const opacity = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Animated.View style={[{ height: 280, backgroundColor: '#CBD5E1' }, { opacity }]} />
      <Animated.View style={[{ padding: 20, gap: 16 }, { opacity }]}>
        <View style={{ gap: 10 }}>
          <View style={{ height: 28, width: '55%', borderRadius: 8, backgroundColor: '#CBD5E1' }} />
          <View style={{ height: 14, width: '40%', borderRadius: 6, backgroundColor: '#CBD5E1' }} />
        </View>
        <View style={{ flexDirection: 'row', borderRadius: 12, backgroundColor: '#CBD5E1', height: 72 }} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ height: 44, borderRadius: 10, backgroundColor: '#CBD5E1' }} />
        ))}
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  cover: { height: '100%', width: '100%', backgroundColor: '#DBEAFE' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
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

  // Titre
  titleRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
  titleText: { marginRight: 4 },
  latinName: { fontSize: 15, color: '#6b7280', fontStyle: 'italic' },

  // Stats — même style que catches/[id].tsx
  statsCard: {
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

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
  },
  tabItem: {
    paddingBottom: 10,
    paddingRight: 20,
    position: 'relative',
  },
  tabText: { fontWeight: '600', color: '#6b7280', fontSize: 15 },
  tabTextActive: { color: '#1E3A8A' },
  tabUnderline: {
    position: 'absolute',
    bottom: -1.5,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#1E3A8A',
  },

  // Sections — même style que catches/[id].tsx
  section: { gap: 8 },
  sectionLabel: { fontWeight: '600', fontSize: 16 },
  emptyText: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  // Info card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFDBFE',
    paddingHorizontal: 16,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#DBEAFE',
  },
  infoRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoLabel: { fontSize: 12, color: '#1E40AF', fontWeight: '600' },
  infoValue: { fontSize: 15, color: '#0F172A', marginTop: 2 },

  // Tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E0ECFF',
  },
  tagText: { fontSize: 12, color: '#1E3A8A', fontWeight: '600' },

  // Modal
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalScroll: { width: '100%', height: '100%' },
  imageModalContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  imageModalImage: { width: '100%', height: '100%', borderRadius: 0, backgroundColor: '#000' },
  imageModalClose: {
    position: 'absolute',
    top: 40,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
  },
});

// ── CatchRow ──────────────────────────────────────────────────────────────────

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

function CatchRow({ item, urlFromPhotoPath }: {
  item: CatchItem;
  urlFromPhotoPath: (p?: string | null) => Promise<string | null>;
}) {
  const router = useRouter();
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await urlFromPhotoPath(item.photo_path);
      if (mounted) setUrl(u);
    })();
    return () => { mounted = false; };
  }, [item.photo_path, urlFromPhotoPath]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/catches/[id]', params: { id: item.id } })}
      style={({ pressed }) => [
        catchStyles.row,
        pressed && { opacity: 0.7 },
      ]}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={catchStyles.thumb}
          contentFit="cover"
        />
      ) : (
        <View style={catchStyles.thumbPlaceholder}>
          <Ionicons name="fish-outline" size={20} color="#9CA3AF" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={catchStyles.date}>
          {new Date(item.caught_at).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>
        <Text style={catchStyles.meta}>
          {[
            item.weight_kg ? `${item.weight_kg} kg` : null,
            item.length_cm ? `${item.length_cm} cm` : null,
            item.region ?? null,
          ].filter(Boolean).join(' · ')}
        </Text>
        {item.notes ? (
          <Text numberOfLines={1} style={catchStyles.notes}>Leurre : {item.notes}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </Pressable>
  );
}

const catchStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  notes: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});

// ── InfoRow ───────────────────────────────────────────────────────────────────

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowIcon}>
        <Ionicons name={icon} size={17} color="#1E40AF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}
