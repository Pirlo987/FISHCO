import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

type Catch = {
  id: string;
  species: string;
  weight_kg: number | null;
  length_cm: number | null;
  notes: string | null;
  caught_at: string;
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
    if (!error && data) setData(data as any);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
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
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.species}>{item.species}</Text>
            <Text style={styles.meta}>
              {new Date(item.caught_at).toLocaleString()} •
              {item.weight_kg ? ` ${item.weight_kg} kg` : ''}
              {item.length_cm ? ` • ${item.length_cm} cm` : ''}
            </Text>
            {item.notes ? <Text numberOfLines={2} style={styles.notes}>{item.notes}</Text> : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  flexGrow: { flexGrow: 1 },
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', backgroundColor: 'white' },
  species: { fontWeight: '600', fontSize: 16 },
  meta: { color: '#666', marginTop: 2 },
  notes: { marginTop: 6 },
});

