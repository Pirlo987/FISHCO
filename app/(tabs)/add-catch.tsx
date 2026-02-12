import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { events } from '@/lib/events';
import { useAuth } from '@/providers/AuthProvider';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
// Utilisation de l'API standard (évite les bugs de WeakMap sur certains SDK)
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { decode } from 'base64-arraybuffer';
import { ThemedSafeArea } from '@/components/SafeArea';
import { FISH_SPECIES, normalizeName, type Species } from '@/constants/species';
import { awardCatchPoints } from '@/lib/gamification';

// Polyfill atob/btoa for base64-arraybuffer in React Native (no external deps)
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
if (!(global as any).atob) {
  (global as any).atob = (input: string) => {
    let str = input.replace(/=+$/, '');
    let output = '';
    for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      buffer = base64Chars.indexOf(buffer);
    }
    return output;
  };
}
if (!(global as any).btoa) {
  (global as any).btoa = (input: string) => {
    let str = input;
    let output = '';
    for (let block = 0, charCode, i = 0, map = base64Chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
      charCode = str.charCodeAt(i += 3 / 4);
      if (charCode > 0xFF) throw new Error('btoa failed: invalid character');
      block = block << 8 | charCode;
    }
    return output;
  };
}

// Constantes déplacées en haut pour éviter les problèmes d'initialisation
const TAB_BAR_SPACER = 56;
const SPECIES_AI_FUNCTION = process.env.EXPO_PUBLIC_SPECIES_AI_FUNCTION ?? 'detect-species';
const AI_FALLBACK_MESSAGE = "Votre photo n'est pas assez nette pour déterminer l'espèce capturée. J'espère qu'au moins c'est un poisson :)";
const AI_UNMATCHED_MESSAGE = "Cette espèce ne figure pas encore dans notre base. Notre équipe va vérifier et l'ajoutera si elle s'avère être une espèce valide !";

type Step = 1 | 2 | 3 | 4;

type FormErrors = {
  species?: string;
  weight?: string;
  length?: string;
  image?: string;
  location?: string;
};

type PreparedImage = {
  arrayBuffer: ArrayBuffer;
  contentType: string;
  ext: string;
  base64: string;
};

type AISuggestion = {
  species: string;
  confidence: number;
  matched?: boolean;
  source?: 'database' | 'ai';
};

type DetectSpeciesResponse = {
  suggestions?: AISuggestion[];
  unmatched?: boolean;
  error?: string;
};

export default function AddCatchScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = React.useState<Step>(1);
  const [species, setSpecies] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [length, setLength] = React.useState('');
  const [lure, setLure] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [visibility, setVisibility] = React.useState<'public' | 'private'>('public');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [image, setImage] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [imageAspect, setImageAspect] = React.useState<number | null>(null);
  const [speciesOptions, setSpeciesOptions] = React.useState<Species[]>(FISH_SPECIES);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [speciesFocused, setSpeciesFocused] = React.useState(false);
  const [speciesTouched, setSpeciesTouched] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = React.useState<AISuggestion[]>([]);

  const scrollRef = React.useRef<ScrollView | null>(null);
  const speciesFieldOffset = React.useRef(0);
  const isMountedRef = React.useRef(true);
  const hasLoadedSpeciesRef = React.useRef(false);
  const speciesFetchIdRef = React.useRef(0);
  const aiRequestIdRef = React.useRef(0);
  const speciesValueRef = React.useRef(species);
  const speciesTouchedRef = React.useRef(speciesTouched);
  const forcedPrivateRef = React.useRef(false);

  // Mise à jour des refs pour les closures
  React.useEffect(() => { speciesValueRef.current = species; }, [species]);
  React.useEffect(() => { speciesTouchedRef.current = speciesTouched; }, [speciesTouched]);

  const onSpeciesFieldLayout = React.useCallback((event: LayoutChangeEvent) => {
    speciesFieldOffset.current = event.nativeEvent.layout.y;
  }, []);

  const scrollSpeciesFieldIntoView = React.useCallback(() => {
    const target = Math.max(speciesFieldOffset.current - 32, 0);
    scrollRef.current?.scrollTo({ y: target, animated: true });
  }, []);

  const handleSpeciesFocus = React.useCallback(() => {
    setSpeciesFocused(true);
    setTimeout(scrollSpeciesFieldIntoView, 16);
  }, [scrollSpeciesFieldIntoView]);

  const handleSpeciesBlur = React.useCallback(() => {
    setTimeout(() => setSpeciesFocused(false), 120);
  }, []);

  const refreshSpeciesOptions = React.useCallback(async () => {
    const requestId = ++speciesFetchIdRef.current;
    let next: Species[] | null = null;
    try {
      const { data, error } = await supabase.from('species').select('*');
      if (!error && Array.isArray(data)) {
        const mapped: Species[] = (data as any[])
          .map((r) => ({
            name: r.name || r.french_name || r.english_name || r.nom || '',
            image: r.image_url || r.image_path || undefined
          }))
          .filter((s) => s.name);
        
        const byKey = new Map<string, Species>();
        for (const option of mapped) {
          const key = normalizeName(option.name);
          if (!byKey.has(key)) byKey.set(key, option);
        }
        next = Array.from(byKey.values());
      }
    } catch (e) { console.error("Species load error", e); }

    if (!isMountedRef.current || requestId !== speciesFetchIdRef.current) return;
    if (next?.length) {
      setSpeciesOptions(next);
    } else if (!hasLoadedSpeciesRef.current) {
      setSpeciesOptions(FISH_SPECIES);
    }
    hasLoadedSpeciesRef.current = true;
  }, []);

  React.useEffect(() => {
    refreshSpeciesOptions();
    return () => { isMountedRef.current = false; };
  }, [refreshSpeciesOptions]);

  useFocusEffect(
    React.useCallback(() => {
      if (hasLoadedSpeciesRef.current) refreshSpeciesOptions();
    }, [refreshSpeciesOptions])
  );

  const clearAiState = React.useCallback(() => {
    aiRequestIdRef.current += 1;
    setAiSuggestions([]);
    setAiError(null);
    setAiLoading(false);
  }, []);

  const resetForm = React.useCallback(() => {
    setStep(1);
    setSpecies('');
    setWeight('');
    setLength('');
    setLure('');
    setLocation('');
    setVisibility('public');
    setTitle('');
    setDescription('');
    setImage(null);
    setErrors({});
    setSpeciesFocused(false);
    setSpeciesTouched(false);
    clearAiState();
  }, [clearAiState]);

  const onPickImage = React.useCallback(async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission requise', "Accès à la photothèque nécessaire.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!res.canceled) {
      const asset = res.assets[0];
      setImage(asset);
      if (asset.width && asset.height) setImageAspect(asset.width / asset.height);
    }
  }, []);

  const onTakePhoto = React.useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Accès à la caméra nécessaire.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.85,
    });
    if (!res.canceled) {
      const asset = res.assets[0];
      setImage(asset);
      if (asset.width && asset.height) setImageAspect(asset.width / asset.height);
    }
  }, []);
  
  const removeImage = React.useCallback(() => {
    setImage(null);
    setImageAspect(null);
    clearAiState();
  }, [clearAiState]);

  const speciesSuggestions = React.useMemo(() => {
    const q = normalizeName(species);
    if (!q) return speciesOptions.slice(0, 8);
    return speciesOptions.filter((s) => normalizeName(s.name).includes(q)).slice(0, 8);
  }, [species, speciesOptions]);

  const combinedSuggestions = React.useMemo(() => {
    const byKey = new Map<string, { name: string; source: 'ai' | 'list'; confidence?: number }>();
    for (const s of aiSuggestions) {
      const key = normalizeName(s.species);
      if (!byKey.has(key)) byKey.set(key, { name: s.species, source: 'ai', confidence: s.confidence });
    }
    for (const s of speciesSuggestions) {
      const key = normalizeName(s.name);
      if (!byKey.has(key)) byKey.set(key, { name: s.name, source: 'list' });
    }
    return Array.from(byKey.values()).slice(0, 8);
  }, [aiSuggestions, speciesSuggestions]);

  const isKnownSpecies = React.useMemo(() => {
    const normalized = normalizeName(species);
    return speciesOptions.some((option) => normalizeName(option.name) === normalized);
  }, [species, speciesOptions]);

  React.useEffect(() => {
    if (!isKnownSpecies) {
      if (visibility !== 'private') {
        forcedPrivateRef.current = true;
        setVisibility('private');
      }
    } else if (forcedPrivateRef.current && visibility === 'private') {
      // Restore public as first choice when the species becomes known again
      forcedPrivateRef.current = false;
      setVisibility('public');
    } else {
      forcedPrivateRef.current = false;
    }
  }, [isKnownSpecies, visibility]);

  const shouldShowSpeciesDropdown = React.useMemo(() => {
    return combinedSuggestions.length > 0 && (speciesFocused || !!species.trim() || aiSuggestions.length > 0);
  }, [aiSuggestions.length, species, speciesFocused, combinedSuggestions.length]);

  const validateAll = React.useCallback(() => {
    const sOk = !!species.trim();
    const wOk = !!weight.trim() && parseFloat(weight.replace(',', '.')) > 0;
    const lOk = !!length.trim() && parseFloat(length.replace(',', '.')) > 0;
    const iOk = !!image?.uri;
    const locOk = !!location.trim();

    setErrors({
      species: sOk ? undefined : "Espèce requise",
      weight: wOk ? undefined : "Poids requis",
      length: lOk ? undefined : "Taille requise",
      image: iOk ? undefined : "Photo requise",
      location: locOk ? undefined : "Lieu requis"
    });

    return sOk && wOk && lOk && iOk && locOk;
  }, [species, weight, length, image, location]);

  const prepareImageForUpload = React.useCallback(async (asset: ImagePicker.ImagePickerAsset): Promise<PreparedImage> => {
    // Downscale + compress to keep request under edge function limits
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );

    const base64 = manipulated.base64;
    if (!base64 || base64.length < 10) {
      throw new Error('Image invalide (base64 manquant)');
    }

    return {
      arrayBuffer: decode(base64),
      contentType: 'image/jpeg',
      ext: 'jpg',
      base64,
    };
  }, []);

  const classifyCatchPhoto = React.useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset?.uri) return;
    const requestId = ++aiRequestIdRef.current;
    setAiLoading(true);
    try {
      const prepared = await prepareImageForUpload(asset);
      if (aiRequestIdRef.current !== requestId) return;
      const imageUrl = `data:${prepared.contentType};base64,${prepared.base64}`;
      const { data, error } = await supabase.functions.invoke<DetectSpeciesResponse>(
        SPECIES_AI_FUNCTION,
        { body: { image: imageUrl } }
      );
      if (aiRequestIdRef.current !== requestId) return;
      if (error) {
        let debugBody = '';
        try { debugBody = JSON.stringify(await (error as any).context?.json()); } catch {}
        console.error('[detect-species] ERROR body:', debugBody || error.message);
        throw new Error(error.message || 'Analyse indisponible');
      }
      console.log('[detect-species] response', JSON.stringify(data, null, 2));
      if (data?.error && !data?.unmatched) {
        throw new Error(data.error);
      }

      // L'IA n'a trouvé aucune correspondance dans notre BDD
      if (data?.unmatched) {
        setAiSuggestions([]);
        setAiError(AI_UNMATCHED_MESSAGE);
        return;
      }

      const suggestions = data?.suggestions || [];
      const cleaned = suggestions.filter((s) => {
        const name = (s?.species || '').trim();
        if (!name) return false;
        const lower = name.toLowerCase();
        if (lower === 'unknown' || lower === 'unk' || lower === 'inconnu') return false;
        return true;
      });

      if (!cleaned.length) {
        setAiSuggestions([]);
        setAiError(AI_FALLBACK_MESSAGE);
        return;
      }

      setAiError(null);
      setAiSuggestions(cleaned.slice(0, 3));
      if (!speciesTouchedRef.current && cleaned[0]) {
        setSpecies(cleaned[0].species);
      }
    } catch (err: any) {
      console.error('AI classify error', err?.message || err);
      if (aiRequestIdRef.current === requestId) {
        const msg = (err?.message || '').toString().toLowerCase().includes('payload too large')
          ? "Image trop lourde, réessaie après recadrage"
          : (err?.message || "Analyse indisponible");
        setAiError(msg);
      }
    } finally {
      if (aiRequestIdRef.current === requestId) setAiLoading(false);
    }
  }, [prepareImageForUpload]);

  const retryAiAnalysis = React.useCallback(() => {
    if (!image) return;
    setAiError(null);
    classifyCatchPhoto(image);
  }, [classifyCatchPhoto, image]);

  React.useEffect(() => {
    if (image) {
      clearAiState();
      classifyCatchPhoto(image);
    }
  }, [image, classifyCatchPhoto, clearAiState]);

  const showNavigationRow = step > 1 || !!image;

  const enqueuePendingSpecies = React.useCallback(async ({ catchId, photoPath }: { catchId: string; photoPath: string }) => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase.from('pending_species').insert({
        user_id: session.user.id,
        name: species.trim(),
        statut: 'pending',
        notes: `catch=${catchId};photo=${photoPath}`,
        update_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn('pending_species insert failed', err?.message || err);
      Alert.alert(
        "Remontée échouée",
        "Nous n'avons pas pu envoyer cette espèce pour validation. Elle reste en privé."
      );
    }
  }, [session?.user?.id, species]);

  const persistCatch = React.useCallback(async () => {
    if (!session || !image) return;
    const isPublicAllowed = visibility === 'public' && isKnownSpecies;
    if (visibility === 'public' && !isKnownSpecies) {
      Alert.alert("Espèce inconnue", "Nous ne pouvons pas publier publiquement une espèce non reconnue. La prise sera enregistrée en privé.");
    }
    setLoading(true);
    try {
      const prepared = await prepareImageForUpload(image);
      const filePath = `catches/${session.user.id}/${Date.now()}.jpg`;
      const { error: storageError } = await supabase.storage
        .from('catch-photos')
        .upload(filePath, prepared.arrayBuffer, { contentType: 'image/jpeg' });

      if (storageError) throw storageError;

      const weightVal = parseFloat(weight.replace(',', '.'));
      const lengthVal = parseFloat(length.replace(',', '.'));

      const { data: newCatch, error: dbError } = await supabase
        .from('catches')
        .insert([{
          user_id: session.user.id,
          species: species.trim(),
          weight_kg: weightVal,
          length_cm: lengthVal,
          region: location.trim(),
          notes: lure.trim(),
          title: title.trim(),
          photo_path: filePath,
          is_public: isPublicAllowed,
          description: description.trim(),
          caught_at: new Date().toISOString()
        }])
        .select().single();

      if (dbError) throw dbError;

      // Gamification & Events
      awardCatchPoints({ session, catchId: newCatch.id, species: species.trim(), knownSpecies: isKnownSpecies });
      events.emit('catch:added', { species: species.trim(), catchId: newCatch.id });

      if (!isKnownSpecies) {
        await enqueuePendingSpecies({ catchId: newCatch.id, photoPath: filePath });
      }

      resetForm();
      router.replace('/(tabs)/explore');
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, [session, image, weight, length, species, location, lure, visibility, title, description, prepareImageForUpload, resetForm, router, isKnownSpecies]);

  // --- RENDU UI ---
  const Step1 = (
    <View style={[styles.stepContainer, !image && styles.step1Empty]}>
      <Text style={styles.heroTitle}>Photo de ta prise</Text>
      {image?.uri ? (
        <View style={styles.hero}>
          <View style={[styles.heroImageBox, imageAspect ? { aspectRatio: imageAspect } : null]}>
            <Image source={{ uri: image.uri }} style={styles.heroImage} contentFit="contain" />
          </View>
          <View style={styles.heroActions}>
            <Pressable onPress={onPickImage} style={[styles.secondaryButton, styles.fullWidthButton]}><Text>Changer la photo</Text></Pressable>
            <Pressable onPress={removeImage} style={[styles.dangerButton, styles.fullWidthButton]}><Text style={styles.dangerText}>Supprimer</Text></Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.photoRow}>
          <Pressable onPress={onPickImage} style={[styles.secondaryButton, styles.fullWidthButton]}><Text>Galerie</Text></Pressable>
          <Pressable onPress={onTakePhoto} style={[styles.secondaryButton, styles.fullWidthButton]}><Text>Appareil photo</Text></Pressable>
        </View>
      )}
    </View>
  );

  const Step2 = (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Quelle espèce ?</Text>
      <TextInput
        style={styles.largeInput}
        placeholder="Nom du poisson..."
        value={species}
        onChangeText={(v) => { setSpecies(v); setSpeciesTouched(true); }}
        onFocus={handleSpeciesFocus}
        onBlur={handleSpeciesBlur}
      />
      {aiLoading && <View style={styles.aiRow}><ActivityIndicator size="small" /><Text style={styles.aiText}>Analyse IA...</Text></View>}
      {aiError && (
        <View style={styles.aiRow}>
          <Text style={styles.aiError}>{aiError}</Text>
          <Pressable onPress={retryAiAnalysis} style={styles.retryChip}>
            <Text style={styles.retryText}>Relancer</Text>
          </Pressable>
        </View>
      )}
      {shouldShowSpeciesDropdown && (
        <View style={styles.suggestions}>
          {combinedSuggestions.map((s, i) => (
            <Pressable
              key={i}
              style={styles.suggestionChip}
              onPress={() => { setSpecies(s.name); setSpeciesFocused(false); Keyboard.dismiss(); }}
            >
              <View style={styles.suggestionRow}>
                <Text>{s.name}</Text>
                {s.source === 'ai' && (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>{s.confidence ? `${Math.min(100, Math.round(s.confidence))}%` : 'IA'}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const Step3 = (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Lieu et mesures</Text>
      <TextInput style={styles.input} placeholder="Lieu" value={location} onChangeText={setLocation} />
      <TextInput style={styles.input} placeholder="Poids (kg)" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
      <TextInput style={styles.input} placeholder="Taille (cm)" keyboardType="decimal-pad" value={length} onChangeText={setLength} />
      <TextInput style={styles.input} placeholder="Leurre (Optionnel)" value={lure} onChangeText={setLure} />
    </View>
  );

  const Step4 = (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Détails finaux</Text>
      <View style={styles.visibilityRow}>
        <Pressable
          onPress={() => {
            if (!isKnownSpecies) {
              Alert.alert("Espèce inconnue", "Publier est désactivé tant que l'espèce n'est pas reconnue.");
              setVisibility('private');
              return;
            }
            setVisibility('public');
          }}
          style={[
            styles.visibilityCard,
            visibility === 'public' && styles.visibilityCardActive,
            !isKnownSpecies && styles.visibilityCardDisabled
          ]}
        >
          <Text>Publique</Text>
        </Pressable>
        <Pressable onPress={() => setVisibility('private')} style={[styles.visibilityCard, visibility === 'private' && styles.visibilityCardActive]}>
          <Text>Privée</Text>
        </Pressable>
      </View>
      {!isKnownSpecies && (
        <Text style={styles.helperText}>Espèce non reconnue : la prise sera privée et transmise en validation.</Text>
      )}
      <TextInput style={styles.input} placeholder="Titre (Optionnel)" value={title} onChangeText={setTitle} />
      <TextInput style={styles.textarea} placeholder="Description..." multiline value={description} onChangeText={setDescription} />
    </View>
  );

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + TAB_BAR_SPACER }
          ]}
        >
          <View style={styles.progressBar}>
            {[1, 2, 3, 4].map(v => <View key={v} style={[styles.progressSegment, v <= step && styles.progressSegmentActive]} />)}
          </View>

          {step === 1 ? Step1 : step === 2 ? Step2 : step === 3 ? Step3 : Step4}

          {showNavigationRow && (
            <View style={[styles.navigationRow, step === 1 && styles.navigationRowStep1]}>
              {step > 1 && (
                <Pressable style={styles.secondaryButton} onPress={() => setStep((s) => (s - 1) as Step)}>
                  <Text>Retour</Text>
                </Pressable>
              )}
              <Pressable 
                style={styles.primaryButtonWrapper} 
                onPress={() => {
                  if (step < 4) {
                      if (step === 1 && !image) return Alert.alert("Photo requise");
                      if (step === 2 && !species) return Alert.alert("Espèce requise");
                      if (step === 3) {
                        if (!location.trim()) return Alert.alert("Lieu requis", "Indique où la prise a été faite.");
                        if (!weight.trim()) return Alert.alert("Poids requis", "Renseigne le poids de la prise.");
                        if (!length.trim()) return Alert.alert("Taille requise", "Renseigne la taille de la prise.");
                      }
                      setStep((s) => (s + 1) as Step);
                  } else {
                      if (validateAll()) persistCatch();
                  }
                }}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>{loading ? 'Envoi...' : (step === 4 ? 'Enregistrer' : 'Suivant')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, flexGrow: 1 },
  progressBar: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  progressSegment: { flex: 1, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },
  progressSegmentActive: { backgroundColor: '#2563EB' },
  stepContainer: { gap: 15 },
  heroTitle: { fontSize: 24, fontWeight: 'bold' },
  hero: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 12, gap: 12, alignItems: 'center' },
  heroImageBox: { width: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#0f172a10' },
  heroImage: { width: '100%', height: '100%' },
  heroActions: { flexDirection: 'row', gap: 10, width: '100%' },
  stepTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', padding: 12, borderRadius: 10 },
  largeInput: { borderWidth: 1, borderColor: '#2563EB', padding: 15, borderRadius: 12, fontSize: 18 },
  textarea: { borderWidth: 1, borderColor: '#CBD5E1', padding: 12, borderRadius: 10, height: 100, textAlignVertical: 'top' },
  photoRow: { gap: 14, alignItems: 'center', width: '100%', maxWidth: 320 },
  suggestions: { backgroundColor: 'white', borderRadius: 10, elevation: 3, padding: 5 },
  suggestionChip: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  aiBadge: { backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  aiBadgeText: { color: '#3730A3', fontWeight: '700', fontSize: 11 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  aiText: { color: '#475569', fontSize: 13 },
  aiError: { color: '#b91c1c', fontSize: 13 },
  retryChip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EEF2FF', borderRadius: 999 },
  retryText: { color: '#3730A3', fontWeight: '700', fontSize: 12 },
  navigationRow: { flexDirection: 'row', gap: 10, marginTop: 30, paddingTop: 20 },
  navigationRowStep1: { marginTop: 80 },
  primaryButtonWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  primaryButton: { paddingVertical: 17, alignItems: 'center', borderRadius: 999 },
  primaryButtonText: { color: '#f8fafc', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  secondaryButton: { padding: 15, backgroundColor: '#F1F5F9', borderRadius: 10, alignItems: 'center', flex: 1 },
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityCard: { flex: 1, padding: 15, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, alignItems: 'center' },
  visibilityCardActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  visibilityCardDisabled: { opacity: 0.4 },
  helperText: { marginTop: 6, color: '#B45309', fontSize: 13 },
  fullWidthButton: { alignSelf: 'stretch' },
  step1Empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, gap: 24, minHeight: 420 },
  dangerButton: { padding: 15, backgroundColor: '#FEE2E2', borderRadius: 10, alignItems: 'center', flex: 1, borderWidth: 1, borderColor: '#FCA5A5' },
  dangerText: { color: '#991B1B', fontWeight: '700' },
});
