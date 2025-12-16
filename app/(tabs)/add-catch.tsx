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
// Use legacy API to avoid SDK 54 deprecation warnings
import * as FileSystem from 'expo-file-system/legacy';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { decode } from 'base64-arraybuffer';
import { ThemedSafeArea } from '@/components/SafeArea';
import { FISH_SPECIES, normalizeName, type Species } from '@/constants/species';
import { awardCatchPoints } from '@/lib/gamification';

const SPECIES_AI_FUNCTION =
  process.env.EXPO_PUBLIC_SPECIES_AI_FUNCTION ?? 'detect-species';

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
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [image, setImage] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
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
            const imageUrl =
              r.image_url ??
              r.url ??
              r.image ??
              r.photo_url ??
              r.image_path ??
              r.url_path ??
              r.path ??
              undefined;
            return { name, image: imageUrl } as Species;
          })
          .filter((s) => s.name);
        const byKey = new Map<string, Species>();
        for (const option of mapped) {
          const key = normalizeName(option.name);
          if (!byKey.has(key)) byKey.set(key, option);
        }
        next = Array.from(byKey.values());
      }
    } catch {}
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
  }, [refreshSpeciesOptions]);

  useFocusEffect(
    React.useCallback(() => {
      if (hasLoadedSpeciesRef.current) {
        refreshSpeciesOptions();
      }
      return undefined;
    }, [refreshSpeciesOptions])
  );

  React.useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
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
    setDescription('');
    setImage(null);
    setErrors({});
    setSpeciesFocused(false);
    setSpeciesTouched(false);
    clearAiState();
  }, [clearAiState]);

  const ensureLibraryPermission = React.useCallback(async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    const iosLimited = Platform.OS === 'ios' && (current as any).accessPrivileges === 'limited';
    if (current.granted || iosLimited) return true;
    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const iosRequestedLimited =
      Platform.OS === 'ios' && (requested as any).accessPrivileges === 'limited';
    if (requested.granted || iosRequestedLimited) return true;
    Alert.alert('Permission requise', "Autorise l'accÃ¨s Ã  la photothÃ¨que pour sÃ©lectionner une image.");
    return false;
  }, []);

  const requestCameraPermission = React.useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorise l'accÃ¨s Ã  la camÃ©ra pour prendre une photo.");
      return false;
    }
    return true;
  }, []);

  const onPickImage = React.useCallback(async () => {
    const ok = await ensureLibraryPermission();
    if (!ok) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled) setImage(res.assets[0]);
  }, [ensureLibraryPermission]);

  const onTakePhoto = React.useCallback(async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled) setImage(res.assets[0]);
  }, [requestCameraPermission]);

  const speciesSuggestions = React.useMemo(() => {
    const q = normalizeName(species);
    if (!q) return speciesOptions.slice(0, 8);
    return speciesOptions.filter((s) => normalizeName(s.name).includes(q)).slice(0, 8);
  }, [species, speciesOptions]);

  const isKnownSpecies = React.useMemo(() => {
    const normalized = normalizeName(species);
    if (!normalized) return false;
    return speciesOptions.some((option) => normalizeName(option.name) === normalized);
  }, [species, speciesOptions]);

  const shouldShowSpeciesDropdown = React.useMemo(() => {
    const hasOptions = speciesSuggestions.length > 0;
    const hasText = !!species.trim();
    const hasAiProposals = aiSuggestions.length > 0;
    return hasOptions && (speciesFocused || hasText || hasAiProposals);
  }, [aiSuggestions.length, species, speciesFocused, speciesSuggestions.length]);

  React.useEffect(() => {
    if (errors.species && species.trim()) {
      setErrors((prev) => ({ ...prev, species: undefined }));
    }
  }, [species, errors.species]);

  React.useEffect(() => {
    if (errors.image && image?.uri) {
      setErrors((prev) => ({ ...prev, image: undefined }));
    }
  }, [image?.uri, errors.image]);

  React.useEffect(() => {
    if (errors.location && location.trim()) {
      setErrors((prev) => ({ ...prev, location: undefined }));
    }
  }, [location, errors.location]);

  React.useEffect(() => {
    speciesValueRef.current = species;
  }, [species]);

  React.useEffect(() => {
    speciesTouchedRef.current = speciesTouched;
  }, [speciesTouched]);

  const isPositiveNumber = React.useCallback((value: string) => {
    if (!value || !value.trim()) return false;
    const parsed = parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0;
  }, []);

  const validateSpecies = React.useCallback(() => {
    const error = species.trim() ? undefined : "EspÃ¨ce requise";
    setErrors((prev) => ({ ...prev, species: error }));
    return !error;
  }, [species]);

  const validateMeasures = React.useCallback(() => {
    const weightError = isPositiveNumber(weight) ? undefined : 'Poids requis (> 0)';
    const lengthError = isPositiveNumber(length) ? undefined : 'Taille requise (> 0)';
    setErrors((prev) => ({ ...prev, weight: weightError, length: lengthError }));
    return !weightError && !lengthError;
  }, [isPositiveNumber, weight, length]);

  const validateImage = React.useCallback(() => {
    const error = image?.uri ? undefined : 'Photo requise';
    setErrors((prev) => ({ ...prev, image: error }));
    return !error;
  }, [image?.uri]);

  const validateLocation = React.useCallback(() => {
    const error = location.trim() ? undefined : 'Localisation requise';
    setErrors((prev) => ({ ...prev, location: error }));
    return !error;
  }, [location]);

  const validateAll = React.useCallback(() => {
    const speciesOk = validateSpecies();
    const measuresOk = validateMeasures();
    const imageOk = validateImage();
    const locationOk = validateLocation();
    return speciesOk && measuresOk && imageOk && locationOk;
  }, [validateSpecies, validateMeasures, validateImage, validateLocation]);

  const handleNextStep = React.useCallback(() => {
    if (step === 1) {
      if (validateImage()) setStep(2);
      return;
    }
    if (step === 2) {
      const speciesOk = validateSpecies();
      if (speciesOk) setStep(3);
      return;
    }
    if (step === 3) {
      const locationOk = validateLocation();
      const measuresOk = validateMeasures();
      if (locationOk && measuresOk) setStep(4);
    }
  }, [step, validateImage, validateLocation, validateMeasures, validateSpecies]);

  const handlePreviousStep = React.useCallback(() => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
    if (step === 4) setStep(3);
  }, [step]);

  const normalizeFileUri = React.useCallback((uri: string) => {
    if (!uri) return uri;
    return uri.startsWith('file://') ? uri : `file://${uri}`;
  }, []);

  const prepareImageForUpload = React.useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<PreparedImage> => {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      const fileUri = normalizeFileUri(manipulated.uri ?? asset.uri);
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);
      return {
        arrayBuffer,
        contentType: 'image/jpeg',
        ext: 'jpg',
        base64,
      };
    },
    [normalizeFileUri],
  );

    const classifyCatchPhoto = React.useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!asset?.uri) return;
      const requestId = ++aiRequestIdRef.current;
      setAiLoading(true);
      setAiError(null);
      setAiSuggestions([]);
      try {
        const prepared = await prepareImageForUpload(asset);
        if (aiRequestIdRef.current !== requestId) return;
        const imageUrl = `data:${prepared.contentType};base64,${prepared.base64}`;
        const { data, error } = await supabase.functions.invoke<DetectSpeciesResponse>(
          SPECIES_AI_FUNCTION,
          {
            body: { image: imageUrl },
          },
        );
        if (aiRequestIdRef.current !== requestId) return;
        if (error) {
          throw new Error(error.message ?? 'Analyse indisponible');
        }
        if (data?.error) {
          throw new Error(data.error);
        }
        const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
        if (!suggestions.length) {
          throw new Error('Aucune proposition reçue.');
        }
        setAiSuggestions(suggestions.slice(0, 3));
        if (!speciesTouchedRef.current && !speciesValueRef.current.trim() && suggestions[0]) {
          setSpecies(suggestions[0].species);
        }
      } catch (error) {
        if (aiRequestIdRef.current !== requestId) return;
        const message =
          error instanceof Error ? error.message : 'Analyse impossible. Réessaie plus tard.';
        setAiError(message);
      } finally {
        if (aiRequestIdRef.current === requestId) {
          setAiLoading(false);
        }
      }
    },
    [prepareImageForUpload],
  );

  React.useEffect(() => {
    if (!image) {
      clearAiState();
      return;
    }
    clearAiState();
    setSpecies('');
    setSpeciesTouched(false);
    setErrors((prev) => ({ ...prev, species: undefined }));
    classifyCatchPhoto(image);
  }, [image, classifyCatchPhoto, clearAiState]);

  const handleAiSuggestionPress = React.useCallback((value: string) => {
    if (!value) return;
    setSpecies(value);
    setSpeciesTouched(true);
    setErrors((prev) => ({ ...prev, species: undefined }));
    try {
      Keyboard.dismiss();
    } catch {}
  }, []);

  const uploadToSupabase = React.useCallback(
    async (
      payload: PreparedImage,
      userId: string,
    ) => {
      const filePath = `catches/${userId}/${Date.now()}.${payload.ext}`;
      const { error } = await supabase.storage
        .from('catch-photos')
        .upload(filePath, payload.arrayBuffer, {
          contentType: payload.contentType,
          cacheControl: '3600',
          upsert: false,
        });
      if (error) throw error;
      return filePath;
    },
    [],
  );

  const persistCatch = React.useCallback(async () => {
    setLoading(true);

    let photoPath: string | undefined;
    let previousBest: { weight_kg: number | null; length_cm: number | null } | null = null;
    let insertedCatch: { id?: string } | null = null;
    if (!image?.uri) {
      setLoading(false);
      setErrors((prev) => ({ ...prev, image: 'Photo requise' }));
      Alert.alert('Photo requise', 'Ajoute une photo pour enregistrer la prise.');
      return;
    }

    try {
      const prepared = await prepareImageForUpload(image);
      photoPath = await uploadToSupabase(prepared, session!.user.id);
    } catch (error: any) {
      console.warn('Image upload failed:', error?.message ?? error);
      const message = String(error?.message ?? error);
      if (/row-level security/i.test(message)) {
        Alert.alert(
          'RLS Supabase',
          "Upload bloqué par RLS. Vérifie :\n- bucket catch-photos\n- chemin catches/{auth.uid()}/...\n- policies INSERT/UPDATE/DELETE actives",
        );
      } else {
        Alert.alert(
          'Photo non importée',
          "Impossible d'importer la photo. La prise sera enregistrée sans image.",
        );
      }
    }

    const trimmedSpecies = species.trim();

    let alreadyDiscovered = false;
    try {
      const { count, error: countError } = await supabase
        .from('catches')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session!.user.id)
        .ilike('species', trimmedSpecies);
      if (!countError) {
        alreadyDiscovered = (count ?? 0) > 0;
      }
    } catch {}

    const payload: Record<string, any> = {
      user_id: session!.user.id,
      species: trimmedSpecies,
      notes: lure.trim() || null,
      region: location.trim() || null,
      caught_at: new Date().toISOString(),
      is_public: visibility === 'public',
      description: description.trim() || null,
    };
    const weightValue = weight.trim() ? parseFloat(weight.replace(',', '.')) : null;
    const lengthValue = length.trim() ? parseFloat(length.replace(',', '.')) : null;

    if (photoPath) payload.photo_path = photoPath;
    if (weightValue !== null && !Number.isNaN(weightValue)) payload.weight_kg = weightValue;
    if (lengthValue !== null && !Number.isNaN(lengthValue)) payload.length_cm = lengthValue;

    if (alreadyDiscovered) {
      try {
        const { data: best } = await supabase
          .from('catches')
          .select('weight_kg,length_cm')
          .eq('user_id', session!.user.id)
          .ilike('species', trimmedSpecies)
          .order('weight_kg', { descending: true, nullsLast: true })
          .order('length_cm', { descending: true, nullsLast: true })
          .limit(1);
        previousBest = (best?.[0] as any) ?? null;
      } catch {}
    }

    if (!isKnownSpecies) {
      try {
        const { error: pendingError } = await supabase.from('pending_species').insert([
          {
            name: trimmedSpecies,
            user_id: session!.user.id,
            status: 'pending',
          },
        ]);
        if (pendingError) {
          console.warn('pending_species insert failed', pendingError);
          Alert.alert(
            'Sauvegarde espèce à vérifier',
            pendingError.message ?? 'Ajout dans la liste de vérification impossible.',
          );
        }
      } catch (err: any) {
        console.warn('pending_species insert failed', err);
        Alert.alert(
          'Sauvegarde espèce à vérifier',
          err?.message ?? 'Ajout dans la liste de vérification impossible.',
        );
      }
    }

    const { data: newCatch, error } = await supabase
      .from('catches')
      .insert([payload])
      .select()
      .single();

    setLoading(false);

    if (error) {
      Alert.alert('Sauvegarde impossible', error.message);
      return;
    }

    insertedCatch = newCatch ?? null;

    const normalized = normalizeName(trimmedSpecies);

    const target = !alreadyDiscovered
      ? { type: 'species' as const, slug: normalized, name: trimmedSpecies }
      : insertedCatch?.id
        ? ({ type: 'catch' as const, id: insertedCatch.id } as const)
        : undefined;

    const eventPayload = {
      species: trimmedSpecies,
      photoPath,
      normalized,
      catchId: insertedCatch?.id,
      firstDiscovery: !alreadyDiscovered,
      target,
    };

    Keyboard.dismiss();
    resetForm();

    router.replace('/(tabs)/explore');

    const isPersonalBest =
      !!previousBest &&
      ((payload.weight_kg && previousBest.weight_kg && payload.weight_kg > previousBest.weight_kg) ||
        (payload.length_cm && previousBest.length_cm && payload.length_cm > previousBest.length_cm));

    // Gamification: award points (fire-and-forget to avoid blocking UI)
    awardCatchPoints({
      session,
      catchId: insertedCatch?.id,
      species: trimmedSpecies,
      knownSpecies: isKnownSpecies,
      firstForUser: !alreadyDiscovered,
      isPublic: visibility === 'public',
      personalBest: isPersonalBest,
    }).catch(() => {
      /* non critical */
    });

    setTimeout(() => {
      try {
        events.emit('catch:added', eventPayload);
      } catch {}
    }, 0);
  }, [
    image,
    isKnownSpecies,
    length,
    location,
    lure,
    router,
    session,
    visibility,
    description,
    species,
    uploadToSupabase,
    weight,
    prepareImageForUpload,
    resetForm,
  ]);

  const onSave = React.useCallback(() => {
    if (!session) {
      Alert.alert('Non connecté', 'Veuillez vous connecter.');
      return;
    }
    if (!validateAll()) {
      Alert.alert('Champs requis', 'Complète les champs obligatoires.');
      return;
    }

    if (!isKnownSpecies) {
      Alert.alert(
        'Espèce en vérification',
        "Cette espèce n'est pas encore dans Fishbook. Elle sera vérifiée puis ajoutée plus tard.",
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Continuer', style: 'default', onPress: () => persistCatch() },
        ],
      );
      return;
    }

    persistCatch();
  }, [isKnownSpecies, persistCatch, session, validateAll]
  );

  const primaryLabel =
    step === 4 ? (loading ? 'Enregistrement...' : 'Enregistrer') : 'Continuer';
  const showBackButton = step > 1;

  const Step1 = (
    <>
      <View style={styles.heroHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Photo de ta prise</Text>
          <Text style={styles.heroSubtitle}>Ajoute une photo avant de donner les d?tails.</Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="camera-outline" size={24} color="#1E40AF" />
        </View>
      </View>
      {image?.uri ? (
        <>
          <View style={[styles.hero, styles.heroPreview]}>
            <Image source={{ uri: image.uri }} style={styles.heroImage} contentFit="cover" />
          </View>
          <Pressable onPress={() => setImage(null)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Retirer la photo</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.photoRow}>
          <Pressable onPress={onPickImage} style={[styles.secondaryButton, styles.navButton]}>
            <Text style={styles.secondaryButtonText}>Choisir une photo</Text>
          </Pressable>
          <Pressable onPress={onTakePhoto} style={[styles.secondaryButton, styles.navButton]}>
            <Text style={styles.secondaryButtonText}>Prendre une photo</Text>
          </Pressable>
        </View>
      )}
      {!!errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
      {image?.uri && aiLoading ? (
        <View style={styles.aiBanner}>
          <ActivityIndicator size="small" color="#1E3A8A" />
          <Text style={styles.aiBannerText}>Analyse de la photo en cours...</Text>
        </View>
      ) : null}
      {image?.uri && aiError ? <Text style={styles.aiBannerError}>{aiError}</Text> : null}
    </>
  );

    const Step2 = (
    <>
      <Text style={styles.stepTitle}>Espèce</Text>
      <Text style={styles.stepSubtitle}>Choisis l'espèce correspondant à la photo.</Text>
      {aiLoading ? (
        <View style={[styles.aiBanner, styles.aiBannerInline]}>
          <ActivityIndicator size="small" color="#1E3A8A" />
          <Text style={styles.aiBannerText}>Analyse de la photo en cours...</Text>
        </View>
      ) : null}
      {!!aiError && !aiLoading ? <Text style={styles.aiBannerError}>{aiError}</Text> : null}
      <View onLayout={onSpeciesFieldLayout} style={{ marginTop: 16 }}>
        <Text style={styles.fieldLabel}>Espèce</Text>
        {!!errors.species && <Text style={styles.errorText}>{errors.species}</Text>}
        <TextInput
          placeholder="Ex. Brochet, Sandre, Bar..."
          placeholderTextColor="#94A3B8"
          value={species}
          onChangeText={(value) => {
            setSpecies(value);
            setSpeciesTouched(true);
            if (errors.species) setErrors((prev) => ({ ...prev, species: undefined }));
          }}
          onFocus={handleSpeciesFocus}
          onBlur={handleSpeciesBlur}
          style={[
            styles.largeInput,
            errors.species && styles.inputError,
          ]}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {shouldShowSpeciesDropdown ? (
          <View style={styles.suggestions}>
            {speciesSuggestions.map((option, index) => (
              <Pressable
                key={normalizeName(option.name) + '-' + index}
                onPress={() => {
                  setSpecies(option.name);
                  setSpeciesTouched(true);
                  setSpeciesFocused(false);
                  setErrors((prev) => ({ ...prev, species: undefined }));
                  try {
                    Keyboard.dismiss();
                  } catch {}
                }}
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionText}>{option.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {!!aiSuggestions.length && !aiLoading ? (
        <View style={styles.aiSuggestionsBox}>
          <Text style={styles.aiSuggestionsTitle}>Suggestions IA</Text>
          {aiSuggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.species + '-' + index}
              onPress={() => handleAiSuggestionPress(suggestion.species)}
              style={styles.aiSuggestionChip}
            >
              <Text style={styles.aiSuggestionSpecies}>{suggestion.species}</Text>
              <Text style={styles.aiSuggestionConfidence}>{suggestion.confidence}%</Text>
            </Pressable>
          ))}
          <Text style={styles.aiSuggestionsHint}>
            Touchez une proposition pour remplir automatiquement.
          </Text>
        </View>
      ) : null}
      {!!species.trim() && !isKnownSpecies ? (
        <View style={styles.unknownSpeciesBox}>
          <Text style={styles.unknownSpeciesTitle}>Espèce non encore référencée</Text>
          <Text style={styles.unknownSpeciesText}>
            Nous ne trouvons pas cette espèce dans la base. Elle sera enregistrée dans ta
            collection et mise en vérification avant d'être ajoutée définitivement.
          </Text>
        </View>
      ) : null}
    </>
  );
  const Step3 = (
    <>
      <Text style={styles.stepTitle}>Lieu et mesures</Text>
      <Text style={styles.stepSubtitle}>
        Indique la localisation de ta prise puis ses mesures et le leurre utilisé.
      </Text>
      <TextInput
        placeholder="Lieu de la prise (obligatoire)"
        placeholderTextColor="#9CA3AF"
        value={location}
        onChangeText={(value) => {
          setLocation(value);
          if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
        }}
        style={[styles.input, errors.location && styles.inputError]}
        autoCapitalize="sentences"
      />
      {!!errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
      <View style={{ marginTop: 16 }}>
        <TextInput
          placeholder="Poids (kg)*"
          placeholderTextColor="#9CA3AF"
          value={weight}
          onChangeText={(value) => {
            setWeight(value);
            if (errors.weight) setErrors((prev) => ({ ...prev, weight: undefined }));
          }}
          style={[styles.input, errors.weight && styles.inputError]}
          keyboardType="decimal-pad"
        />
        {!!errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
        <TextInput
          placeholder="Taille (cm)*"
          placeholderTextColor="#9CA3AF"
          value={length}
          onChangeText={(value) => {
            setLength(value);
            if (errors.length) setErrors((prev) => ({ ...prev, length: undefined }));
          }}
          style={[styles.input, errors.length && styles.inputError]}
          keyboardType="decimal-pad"
        />
        {!!errors.length && <Text style={styles.errorText}>{errors.length}</Text>}
        <TextInput
          placeholder="Leurre utilisé (optionnel)"
          placeholderTextColor="#9CA3AF"
          value={lure}
          onChangeText={setLure}
          style={styles.input}
        />
      </View>
    </>
  );


  const Step4 = (
    <>
      <Text style={styles.stepTitle}>Visibilite et descriptif</Text>
      <Text style={styles.stepSubtitle}>
        Choisis si ta prise est publique ou privee et ajoute un descriptif rapide.
      </Text>
      <View style={styles.visibilityRow}>
        <Pressable
          onPress={() => setVisibility('public')}
          style={[
            styles.visibilityCard,
            visibility === 'public' && styles.visibilityCardActive,
          ]}
        >
          <Text style={styles.visibilityTitle}>Publique</Text>
          <Text style={styles.visibilityText}>Partage ta prise avec la communaute.</Text>
        </Pressable>
        <Pressable
          onPress={() => setVisibility('private')}
          style={[
            styles.visibilityCard,
            visibility === 'private' && styles.visibilityCardActive,
          ]}
        >
          <Text style={styles.visibilityTitle}>Privee</Text>
          <Text style={styles.visibilityText}>Seulement visible pour toi dans l'historique.</Text>
        </Pressable>
      </View>
      <View style={{ marginTop: 16 }}>
        <Text style={styles.fieldLabel}>Descriptif</Text>
        <TextInput
          placeholder="Ajoute un petit resume de ta prise (optionnel)"
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          style={styles.textarea}
          multiline
          numberOfLines={4}
        />
      </View>
    </>
  );

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.screen}>
          <View
            style={[
              styles.header,
              {
                paddingTop: 16 + insets.top,
              },
            ]}
          >
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                {[1, 2, 3, 4].map((value) => (
                  <View
                    key={value}
                    style={[
                      styles.progressSegment,
                      value <= step ? styles.progressSegmentActive : null,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <View style={styles.stepContainer}>
              {step === 1 ? Step1 : step === 2 ? Step2 : step === 3 ? Step3 : Step4}
              <View style={styles.contentSpacer} />
            </View>
          </ScrollView>
          <View
            style={[
              styles.navigationRow,
              styles.footer,
              !showBackButton && styles.singleButtonRow,
              { paddingBottom: insets.bottom + TAB_BAR_SPACER + 16 },
            ]}
          >
            {showBackButton ? (
              <Pressable
                onPress={handlePreviousStep}
                style={[styles.secondaryButton, styles.navButton]}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Précédent</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={step === 4 ? onSave : handleNextStep}
              style={[
                styles.primaryButtonWrapper,
                styles.navButton,
                !showBackButton && styles.navButtonFull,
              ]}
              disabled={step === 4 && loading}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.primaryButton,
                  step === 4 && loading && styles.primaryButtonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const TAB_BAR_SPACER = 56;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 16 },
  contentSpacer: { height: TAB_BAR_SPACER },
  progressBarContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 200,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  progressSegmentActive: {
    backgroundColor: '#2563EB',
  },
  stepContainer: {
    gap: 16,
    marginTop: 12,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  stepTitle: { fontSize: 20, fontWeight: '600' },
  stepSubtitle: { color: '#6B7280' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  largeInput: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  inputError: { borderColor: '#e11d48' },
  errorText: { color: '#e11d48', marginTop: -4 },
  fieldLabel: { fontWeight: '600', color: '#0F172A', marginTop: 12 },
  suggestions: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  suggestionText: { color: '#111' },
  navigationRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  footerTabSpacer: TAB_BAR_SPACER,
  singleButtonRow: { justifyContent: 'flex-end' },
  navButton: { flex: 1 },
  navButtonFull: { flex: 1 },
  primaryButtonWrapper: {
    flex: 1,
    borderRadius: 999,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  primaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 999,
  },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: 'white', fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#333', fontWeight: '600' },
  aiBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiBannerInline: {
    marginTop: 12,
  },
  aiBannerText: { color: '#0F172A', flex: 1 },
  aiBannerError: { marginTop: 12, color: '#B91C1C' },
  aiSuggestionsBox: {
    marginTop: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  aiSuggestionsTitle: { fontWeight: '600', color: '#0F172A' },
  aiSuggestionChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  aiSuggestionSpecies: { fontWeight: '600', color: '#0F172A', flex: 1 },
  aiSuggestionConfidence: { color: '#1E3A8A', fontWeight: '600' },
  aiSuggestionsHint: { fontSize: 12, color: '#475569' },
  unknownSpeciesBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FDBA74',
    gap: 6,
  },
  unknownSpeciesTitle: { fontWeight: '700', color: '#9A3412' },
  unknownSpeciesText: { color: '#9A3412' },
  photoRow: { flexDirection: 'row', gap: 12 },
  hero: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
    marginBottom: 8,
  },
  heroPreview: { marginTop: 16 },
  heroImage: { width: '100%', height: '100%' },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#0F172A' },
  heroSubtitle: { color: '#475569', marginTop: 6 },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  visibilityCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    padding: 14,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  visibilityCardActive: { borderColor: '#2563EB', backgroundColor: '#EEF2FF' },
  visibilityTitle: { fontWeight: '700', color: '#0F172A' },
  visibilityText: { color: '#475569', fontSize: 13 },
  textarea: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    minHeight: 110,
  },
});











































