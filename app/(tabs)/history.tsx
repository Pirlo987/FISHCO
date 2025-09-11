import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Image } from 'expo-image';
import { ThemedSafeArea } from '@/components/SafeArea';

type Catch = {
  id: string;
  species: string;
  weight_kg: number | null;
  length_cm: number | null;
  notes: string | null;
  caught_at: string;
  photo_path: string | null;   // ⬅️ on utilise le chemin Storage
};

export default function HistoryScreen() {
  const { session } = useAuth();
  const [data, setData] = React.useState<Catch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('catches')
      .select('*')
      .eq('user_id', session.user.id)
      .order('caught_at', { ascending: false });

    if (!error && data) setData(data as unknown as Catch[]);
    setLoading(false);
  }, [session]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Bucket PUBLIC → URL directe
  const urlFromPhotoPath = (path?: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from('catch-photos').getPublicUrl(path);
    return data.publicUrl ?? null;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemedSafeArea>
    <FlatList
      contentContainerStyle={data.length === 0 && styles.flexGrow}
      data={data}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={() => (
        <View style={styles.center}>
          <Text>Aucune prise pour le moment.</Text>
          <Text>Ajoute ta première depuis l'onglet "Ajouter".</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const url = urlFromPhotoPath(item.photo_path);
        return (
          <View style={styles.row}>
            {url ? <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.species}>{item.species}</Text>
              <Text style={styles.meta}>
                {new Date(item.caught_at).toLocaleString()}
                {item.weight_kg ? ` · ${item.weight_kg} kg` : ''}
                {item.length_cm ? ` · ${item.length_cm} cm` : ''}
              </Text>
              {item.notes ? <Text numberOfLines={2} style={styles.notes}>{item.notes}</Text> : null}
            </View>
          </View>
        );
      }}
    />
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  flexGrow: { flexGrow: 1 },
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', backgroundColor: 'white', gap: 12, flexDirection: 'row' },
  species: { fontWeight: '600', fontSize: 16 },
  meta: { color: '#666', marginTop: 2 },
  notes: { marginTop: 6 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#eee' },
});
