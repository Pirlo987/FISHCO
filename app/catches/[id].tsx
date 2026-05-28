import React from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, Image as RNImage } from 'react-native';
import { usePulse } from '@/hooks/usePulse';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { normalizeName } from '@/constants/species';
import { useLanguage } from '@/providers/LanguageProvider';

type CatchItem = {
  id: string;
  user_id: string;
  species: string;
  weight_kg: number | null;
  length_cm: number | null;
  notes: string | null;
  caught_at: string;
  photo_path: string | null;
  region?: string | null;
  title?: string | null;
  description?: string | null;
};

export default function CatchDetailScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [item, setItem] = React.useState<CatchItem | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [imagePreviewVisible, setImagePreviewVisible] = React.useState(false);
  const [imageSize, setImageSize] = React.useState<{ width: number; height: number } | null>(null);
  const [latinName, setLatinName] = React.useState<string | null>(null);

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
        if (!data) throw new Error(t('catch_not_found'));
        if (cancelled) return;
        setItem(data as CatchItem);
        const url = await urlFromPhotoPath((data as CatchItem).photo_path);
        if (!cancelled) setPhotoUrl(url);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || t('catch_loading_error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, urlFromPhotoPath]);

  React.useEffect(() => {
    if (!photoUrl) { setImageSize(null); return; }
    let cancelled = false;
    RNImage.getSize(photoUrl, (w, h) => { if (!cancelled) setImageSize({ width: w, height: h }); }, () => { if (!cancelled) setImageSize(null); });
    return () => { cancelled = true; };
  }, [photoUrl]);

  const isPointInsideImage = React.useCallback((x: number, y: number) => {
    if (!imageSize) return false;
    const aspect = imageSize.width / imageSize.height;
    const screenAspect = screenWidth / screenHeight;
    let displayWidth = screenWidth;
    let displayHeight = screenHeight;
    if (aspect > screenAspect) {
      displayHeight = screenWidth / aspect;
    } else {
      displayWidth = screenHeight * aspect;
    }
    const left = (screenWidth - displayWidth) / 2;
    const top = (screenHeight - displayHeight) / 2;
    return x >= left && x <= left + displayWidth && y >= top && y <= top + displayHeight;
  }, [imageSize, screenWidth, screenHeight]);

  React.useEffect(() => {
    if (!item?.species) return;
    let cancelled = false;
    (async () => {
      const safe = item.species.replace(/'/g, "''");
      const { data } = await supabase
        .from('species')
        .select('latin_name, name, french_name')
        .or(`name.ilike.%${safe}%,french_name.ilike.%${safe}%`)
        .limit(5);
      if (cancelled || !Array.isArray(data) || !data.length) return;
      const want = normalizeName(item.species);
      const match = data.find((r: any) => normalizeName(r.name || r.french_name || '') === want) ?? data[0];
      const latin = (match as any)?.latin_name ?? null;
      if (!cancelled && latin) setLatinName(String(latin));
    })();
    return () => { cancelled = true; };
  }, [item?.species]);

  const goToSpecies = React.useCallback(() => {
    if (!item?.species) return;
    const key = normalizeName(item.species);
    router.push({ pathname: '/species/[slug]', params: { slug: key, name: item.species } });
  }, [item, router]);

  if (loading) {
    return <CatchDetailSkeleton />;
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
            <Pressable onPress={() => photoUrl && setImagePreviewVisible(true)} style={{ flex: 1 }}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.cover} contentFit="cover" />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Text style={{ fontSize: 42 }}>📷</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={[styles.backBtn, { top: 12 + insets.top }]} hitSlop={10}>
              <Ionicons name="chevron-back" size={26} color="#000" />
            </Pressable>
          </View>
        }>
        {/* En-tête : espèce + nom latin + date + lien fiche */}
        <View style={styles.headerSection}>
          <View style={styles.speciesRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.titleText}>{item.species}</Text>
              {latinName ? <Text style={styles.latinName}>{latinName}</Text> : null}
            </View>
            {item.species ? (
              <Pressable onPress={goToSpecies} hitSlop={8} style={styles.speciesLinkBadge}>
                <Text style={styles.speciesLinkText}>Fiche</Text>
                <Ionicons name="chevron-forward" size={11} color="#2563EB" />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
            <Text style={styles.dateText}>
              {new Date(item.caught_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Stats poids + taille */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="scale-outline" size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.statValue}>
              {item.weight_kg ? `${Number(item.weight_kg.toFixed(2))} kg` : '—'}
            </Text>
            <Text style={styles.statLabel}>{t('catch_weight')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="resize-outline" size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.statValue}>
              {item.length_cm ? `${Math.round(item.length_cm)} cm` : '—'}
            </Text>
            <Text style={styles.statLabel}>{t('catch_size')}</Text>
          </View>
        </View>

        {/* Titre & description du post */}
        {(item.title || item.description) ? (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={[styles.infoCardIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#7C3AED" />
              </View>
              <Text style={styles.infoCardTitle}>Publication</Text>
            </View>
            {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
            {item.description ? <Text style={styles.infoCardText}>{item.description}</Text> : null}
          </View>
        ) : null}

        {/* Leurre / Notes */}
        {item.notes ? (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={[styles.infoCardIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="leaf-outline" size={16} color="#16A34A" />
              </View>
              <Text style={styles.infoCardTitle}>{t('catch_lure')}</Text>
            </View>
            <Text style={styles.infoCardText}>{item.notes}</Text>
          </View>
        ) : null}

        {/* Zone de pêche */}
        {item.region ? (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={[styles.infoCardIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="location-outline" size={16} color="#2563EB" />
              </View>
              <Text style={styles.infoCardTitle}>{t('catch_location')}</Text>
            </View>
            <Text style={styles.infoCardText}>{item.region}</Text>
          </View>
        ) : null}
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
          {photoUrl ? (
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
              <Image source={{ uri: photoUrl }} style={styles.imageModalImage} contentFit="contain" />
            </ScrollView>
          ) : null}
          <Pressable style={styles.imageModalClose} onPress={() => setImagePreviewVisible(false)}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function CatchDetailSkeleton() {
  const opacity = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Animated.View style={[{ height: 300, backgroundColor: '#CBD5E1' }, { opacity }]} />
      <Animated.View style={[{ padding: 20, gap: 16 }, { opacity }]}>
        <View style={{ height: 26, width: '50%', borderRadius: 8, backgroundColor: '#CBD5E1' }} />
        <View style={{ flexDirection: 'row', borderRadius: 12, backgroundColor: '#CBD5E1', height: 72 }} />
        <View style={{ height: 14, width: '70%', borderRadius: 6, backgroundColor: '#CBD5E1' }} />
        <View style={{ height: 14, width: '50%', borderRadius: 6, backgroundColor: '#CBD5E1' }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  cover: { height: '100%', width: '100%', backgroundColor: '#0F172A' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  // Header
  headerSection: { gap: 6 },
  speciesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titleText: { fontSize: 26, fontWeight: '800', color: '#0F172A', flex: 1 },
  speciesLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  latinName: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', fontWeight: '400', marginTop: 1 },
  speciesLinkText: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  // Stats — dark card
  statsCard: {
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.12)' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', lineHeight: 26 },

  // Info cards
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoCardText: { fontSize: 15, color: '#0F172A', lineHeight: 22 },
  postTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  backBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalScroll: { width: '100%', height: '100%' },
  imageModalContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  imageModalImage: { width: '100%', height: '100%', borderRadius: 0, backgroundColor: '#000' },
  imageModalClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
