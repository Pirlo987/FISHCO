import React from 'react';
import { Alert, Button, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedSafeArea } from '@/components/SafeArea';
import { ThemedText } from '@/components/ThemedText';
import { normalizeName } from '@/constants/species';
import { supabase } from '@/lib/supabase';

// Minimal debug page to verify image retrieval from:
// 1) A direct public URL
// 2) The Supabase `species` table (url / image_url ...)

export default function DebugImageScreen() {
  const [directUrl, setDirectUrl] = React.useState(
    'https://nvjaoluxgdzcmatwthry.supabase.co/storage/v1/object/public/species/Atlantic-Pacific%20bluefin%20tuna.png'
  );

  const [speciesQuery, setSpeciesQuery] = React.useState('Thon rouge');
  const [dbCandidate, setDbCandidate] = React.useState<string | null>(null);
  const [dbComputedUrl, setDbComputedUrl] = React.useState<string | null>(null);
  const [dbError, setDbError] = React.useState<string | null>(null);
  const [dbRowCount, setDbRowCount] = React.useState<number | null>(null);
  const [dbSampleColumns, setDbSampleColumns] = React.useState<string[] | null>(null);
  const [dbSampleNames, setDbSampleNames] = React.useState<string[] | null>(null);

  const SPECIES_BUCKET = process.env.EXPO_PUBLIC_SPECIES_BUCKET as string | undefined;

  const toPublicUrl = (candidate?: string | null, bucketHint?: string | null): string | undefined => {
    if (!candidate) return undefined;
    if (/^https?:\/\//i.test(candidate)) return candidate;
    // Accept common storage shapes
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

  const onFetchDbImage = async () => {
    setDbError(null);
    setDbCandidate(null);
    setDbComputedUrl(null);
    try {
      const { data, error } = await supabase.from('species').select('*').limit(1000);
      if (error) throw error;
      const arr: any[] = Array.isArray(data) ? data : [];
      setDbRowCount(arr.length);
      setDbSampleColumns(arr[0] ? Object.keys(arr[0]) : []);
      const q = normalizeName(speciesQuery || '');
      const nameFields = ['name', 'nom', 'Nom commun', 'nom commun', 'french_name', 'label', 'title'];
      const findName = (row: any) => {
        for (const f of nameFields) if (row && typeof row[f] === 'string') return row[f] as string;
        return '';
      };
      setDbSampleNames(arr.slice(0, 5).map((r) => findName(r) || '(vide)'));
      const row = arr.find((r) => normalizeName(findName(r)).includes(q));
      if (!row) {
        setDbError('Aucune espèce trouvée pour ce nom.');
        return;
      }
      const candidate: string | null =
        row.url ?? row.image_url ?? row.image ?? row.photo_url ?? row.image_path ?? row.url_path ?? row.path ?? null;
      setDbCandidate(candidate);
      const computed = toPublicUrl(
        candidate,
        row.url_bucket ?? row.image_bucket ?? row.photo_bucket ?? row.bucket ?? null
      );
      setDbComputedUrl(computed ?? null);
    } catch (e: any) {
      setDbError(String(e?.message || e));
    }
  };

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <ThemedText type="title">Debug Image</ThemedText>

          <View style={styles.card}>
            <Text style={styles.label}>1) URL directe</Text>
            <TextInput value={directUrl} onChangeText={setDirectUrl} placeholder="https://..." style={styles.input} />
            <View style={styles.imageBox}>
              {!!directUrl && (
                <Image source={{ uri: directUrl }} style={styles.image} contentFit="contain" cachePolicy="immutable" />
              )}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>2) Depuis la BDD `species`</Text>
            <TextInput
              value={speciesQuery}
              onChangeText={setSpeciesQuery}
              placeholder="Nom de l'espèce (ex: Thon rouge)"
              style={styles.input}
            />
          <Button title="Charger depuis Supabase" onPress={onFetchDbImage} />
          {dbError ? <Text style={styles.error}>Erreur: {dbError}</Text> : null}
          <Text style={styles.small}>Rows: {dbRowCount ?? '—'}</Text>
          <Text style={styles.small}>Columns: {dbSampleColumns ? dbSampleColumns.join(', ') : '—'}</Text>
          <Text style={styles.small}>First names: {dbSampleNames ? dbSampleNames.join(' | ') : '—'}</Text>
          <Text style={styles.small}>Candidate: {dbCandidate ?? '—'}</Text>
          <Text style={styles.small}>Computed URL: {dbComputedUrl ?? '—'}</Text>
            <View style={styles.imageBox}>
              {!!dbComputedUrl && (
                <Image source={{ uri: dbComputedUrl }} style={styles.image} contentFit="contain" />
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16, padding: 16 },
  card: { padding: 12, borderRadius: 10, backgroundColor: '#fff', gap: 10 },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  imageBox: { height: 200, borderWidth: 1, borderColor: '#eee', borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  error: { color: '#b00020' },
  small: { color: '#555', fontSize: 12 },
});
