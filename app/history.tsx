import React from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePulse } from '@/hooks/usePulse';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { ThemedSafeArea } from '@/components/SafeArea';
import { useLanguage } from '@/providers/LanguageProvider';
import { Ionicons } from '@expo/vector-icons';
import { usePremium, FREE_HISTORY_LIMIT } from '@/hooks/usePremium';

type Catch = {
  id: string;
  species: string;
  weight_kg: number | null;
  length_cm: number | null;
  notes: string | null;
  caught_at: string;
  photo_path: string | null;
  region?: string | null;
};

// Row height must match styles.row total height for getItemLayout to work
const ROW_HEIGHT = 96; // padding 16*2 + image 64

const urlFromPhotoPath = (path?: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from('catch-photos').getPublicUrl(path);
  return data.publicUrl ?? null;
};

type RowProps = { item: Catch; onPress: (id: string) => void };

const CatchRow = React.memo(function CatchRow({ item, onPress }: RowProps) {
  const { t } = useLanguage();
  const url = urlFromPhotoPath(item.photo_path);
  return (
    <Pressable onPress={() => onPress(item.id)}>
      <View style={styles.row}>
        {url ? (
          <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]} />
        )}
        <View style={styles.info}>
          <Text style={styles.species}>{item.species}</Text>
          <Text style={styles.meta}>
            {new Date(item.caught_at).toLocaleString()}
            {item.weight_kg ? ` · ${item.weight_kg} kg` : ''}
            {item.length_cm ? ` · ${item.length_cm} cm` : ''}
          </Text>
          {item.region ? (
            <Text numberOfLines={1} style={styles.location}>{t('history_location')}{item.region}</Text>
          ) : null}
          {item.notes ? (
            <Text numberOfLines={2} style={styles.notes}>{t('history_lure')}{item.notes}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

export default function HistoryScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { session } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremium();
  const [data, setData] = React.useState<Catch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!session) return;
    const query = supabase
      .from('catches')
      .select('id,species,weight_kg,length_cm,notes,caught_at,photo_path,region')
      .eq('user_id', session.user.id)
      .order('caught_at', { ascending: false });

    const { data: rows, error } = (isPremium || isPremiumLoading)
      ? await query
      : await query.limit(FREE_HISTORY_LIMIT);

    if (!error && rows) setData(rows as unknown as Catch[]);
    setLoading(false);
  }, [session, isPremium, isPremiumLoading]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handlePress = React.useCallback(
    (id: string) => router.push({ pathname: '/catches/[id]', params: { id } }),
    [router],
  );

  const keyExtractor = React.useCallback((item: Catch) => item.id, []);

  const renderItem = React.useCallback(
    ({ item }: { item: Catch }) => <CatchRow item={item} onPress={handlePress} />,
    [handlePress],
  );

  const getItemLayout = React.useCallback(
    (_: any, index: number) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index }),
    [],
  );

  if (loading) {
    return (
      <ThemedSafeArea>
        <HistorySkeleton />
      </ThemedSafeArea>
    );
  }

  return (
    <ThemedSafeArea>
      <FlatList
        contentContainerStyle={data.length === 0 ? styles.flexGrow : undefined}
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={11}
        ListFooterComponent={
          !isPremium && !isPremiumLoading && data.length >= FREE_HISTORY_LIMIT ? (
            <Pressable onPress={() => router.push('/premium')} style={styles.limitBanner}>
              <Ionicons name="lock-closed" size={18} color="#B45309" />
              <View style={styles.limitBannerText}>
                <Text style={styles.limitBannerTitle}>
                  Historique limite a {FREE_HISTORY_LIMIT} prises
                </Text>
                <Text style={styles.limitBannerSub}>
                  Passe Premium pour voir tout ton historique
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B45309" />
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>{t('history_no_catches')}</Text>
            <Text>{t('history_add_first')}</Text>
          </View>
        }
      />
    </ThemedSafeArea>
  );
}

function HistorySkeleton() {
  const opacity = usePulse();
  return (
    <View style={{ flex: 1 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Animated.View key={i} style={[skeletonStyles.row, { opacity }]}>
          <View style={skeletonStyles.thumb} />
          <View style={skeletonStyles.lines}>
            <View style={[skeletonStyles.line, { width: '55%' }]} />
            <View style={[skeletonStyles.line, { width: '80%', marginTop: 8 }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#CBD5E1' },
  lines: { flex: 1, gap: 0 },
  line: { height: 12, borderRadius: 6, backgroundColor: '#CBD5E1' },
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  flexGrow: { flexGrow: 1 },
  row: {
    height: ROW_HEIGHT,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    backgroundColor: 'white',
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: { flex: 1 },
  species: { fontWeight: '600', fontSize: 16 },
  meta: { color: '#666', marginTop: 2 },
  location: { color: '#374151', marginTop: 6 },
  notes: { marginTop: 4, color: '#374151' },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#eee' },
  thumbEmpty: { backgroundColor: '#F3F4F6' },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  limitBannerText: { flex: 1, gap: 3 },
  limitBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  limitBannerSub: { fontSize: 12, color: '#B45309' },
});
