import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { events } from '@/lib/events';
import { useAuth } from '@/providers/AuthProvider';
import { normalizeName } from '@/constants/species';
import { awardCatchPoints } from '@/lib/gamification';
import { P, TAB_BAR_SPACER } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/providers/LanguageProvider';

import { useImagePicker } from '@/hooks/useImagePicker';
import { useSpeciesLoader } from '@/hooks/useSpeciesLoader';
import { useAiClassification, prepareImageForUpload } from '@/hooks/useAiClassification';
import { trackEvent } from '@/lib/analytics';

import { ProgressBar } from '@/components/add-catch/ProgressBar';
import { NavigationRow } from '@/components/add-catch/NavigationRow';
import { StepPhoto } from '@/components/add-catch/StepPhoto';
import { StepSpecies } from '@/components/add-catch/StepSpecies';
import type { CombinedSuggestion, AiSuggestionWithImage } from '@/components/add-catch/StepSpecies';
import { StepDetails } from '@/components/add-catch/StepDetails';
import { StepPublish } from '@/components/add-catch/StepPublish';

// Polyfill atob/btoa for base64-arraybuffer in React Native
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

type Step = 1 | 2 | 3 | 4;
type SpeciesSubStep = 'ai' | 'db' | 'search';

export default function AddCatchScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Form state ──
  const [step, setStep] = React.useState<Step>(1);
  const [speciesSubStep, setSpeciesSubStep] = React.useState<SpeciesSubStep>('ai');
  const [aiPickedSuggestion, setAiPickedSuggestion] = React.useState<AiSuggestionWithImage | null>(null);
  const [species, setSpecies] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [length, setLength] = React.useState('');
  const [lure, setLure] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [visibility, setVisibility] = React.useState<'public' | 'private'>('public');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const scrollRef = React.useRef<ScrollView | null>(null);
  const forcedPrivateRef = React.useRef(false);

  // ── Custom hooks ──
  const { image, imageAspect, pickImage, takePhoto, removeImage: rawRemoveImage } = useImagePicker();
  const { speciesOptions, isKnownSpecies: checkKnown, filterSpecies } = useSpeciesLoader();
  const { aiLoading, aiError, aiSuggestions, clearAi, classify } = useAiClassification();

  const knownSpecies = React.useMemo(() => checkKnown(species), [checkKnown, species]);

  // ── Suggestions IA enrichies avec images du catalogue ──
  const aiSuggestionsWithImages = React.useMemo<AiSuggestionWithImage[]>(() => {
    return aiSuggestions.map((s) => {
      const key = normalizeName(s.species);
      const dbMatch = speciesOptions.find((o) => normalizeName(o.name) === key);
      return { ...s, image: dbMatch?.image };
    });
  }, [aiSuggestions, speciesOptions]);

  // ── Correspondances catalogue pour la suggestion IA choisie ──
  const dbMatches = React.useMemo<CombinedSuggestion[]>(() => {
    if (!aiPickedSuggestion) return [];
    return filterSpecies(aiPickedSuggestion.species).map((s) => ({
      name: s.name,
      source: 'list' as const,
      image: s.image,
    }));
  }, [aiPickedSuggestion, filterSpecies]);

  // ── Résultats de la recherche manuelle ──
  const searchResults = React.useMemo<CombinedSuggestion[]>(() => {
    if (speciesSubStep !== 'search' || !species.trim()) return [];
    return filterSpecies(species).map((s) => ({
      name: s.name,
      source: 'list' as const,
      image: s.image,
    }));
  }, [speciesSubStep, species, filterSpecies]);

  // ── Visibilité auto (espèce inconnue → privé) ──
  React.useEffect(() => {
    if (!knownSpecies) {
      if (visibility !== 'private') {
        forcedPrivateRef.current = true;
        setVisibility('private');
      }
    } else if (forcedPrivateRef.current && visibility === 'private') {
      forcedPrivateRef.current = false;
      setVisibility('public');
    } else {
      forcedPrivateRef.current = false;
    }
  }, [knownSpecies, visibility]);

  // ── Déclenchement classification IA dès qu'une image est choisie ──
  React.useEffect(() => {
    if (image) {
      clearAi();
      classify(image);
    }
  }, [image, classify, clearAi]);

  // ── Handlers ──
  const handleSelectAiSuggestion = React.useCallback((s: AiSuggestionWithImage) => {
    const matches = filterSpecies(s.species);
    if (matches.length > 0) {
      // Espèce trouvée dans le catalogue → sélection directe sans passer par l'étape DB
      setSpecies(matches[0].name);
      setStep(3);
    } else {
      // Espèce inconnue du catalogue → afficher l'étape de confirmation
      setAiPickedSuggestion(s);
      setSpeciesSubStep('db');
    }
  }, [filterSpecies]);

  const handleChooseOther = React.useCallback(() => {
    setSpeciesSubStep('search');
    setSpecies('');
  }, []);

  // Sélection finale d'une espèce → avance automatiquement à l'étape 3
  const handleSelectSpecies = React.useCallback((name: string) => {
    setSpecies(name);
    setStep(3);
  }, []);

  const retryAi = React.useCallback(() => {
    if (!image) return;
    classify(image);
  }, [classify, image]);

  const removeImage = React.useCallback(() => {
    rawRemoveImage();
    clearAi();
  }, [rawRemoveImage, clearAi]);

  const resetForm = React.useCallback(() => {
    setStep(1);
    setSpeciesSubStep('ai');
    setAiPickedSuggestion(null);
    setSpecies('');
    setWeight('');
    setLength('');
    setLure('');
    setLocation('');
    setVisibility('public');
    setTitle('');
    setDescription('');
    rawRemoveImage();
    clearAi();
  }, [rawRemoveImage, clearAi]);

  // ── Persist ──
  const persistCatch = React.useCallback(async () => {
    if (!session || !image) return;
    const isPublicAllowed = visibility === 'public' && knownSpecies;
    if (visibility === 'public' && !knownSpecies) {
      Alert.alert(t('add_unknown_species'), t('add_unknown_species_msg'));
    }

    setLoading(true);
    try {
      const { count: prevCount } = await supabase
        .from('catches')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('species', species.trim());
      const isFirstCatch = (prevCount ?? 0) === 0;

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
          caught_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (dbError) throw dbError;

      awardCatchPoints({ session, catchId: newCatch.id, species: species.trim(), knownSpecies, firstForUser: isFirstCatch, isPublic: isPublicAllowed, personalBest: false });
      events.emit('catch:added', { species: species.trim(), catchId: newCatch.id });
      trackEvent('catch_added', { species: species.trim(), is_public: isPublicAllowed, known_species: knownSpecies });

      if (!knownSpecies) {
        try {
          await supabase.from('pending_species').insert({
            user_id: session.user.id,
            name: species.trim(),
            statut: 'pending',
            notes: `catch=${newCatch.id};photo=${filePath}`,
            update_at: new Date().toISOString(),
          });
        } catch (err: any) {
          console.warn('pending_species insert failed', err?.message || err);
          Alert.alert(t('add_submission_failed'), t('add_species_validation_failed'));
        }
      }

      const speciesName = species.trim();
      const catchId = newCatch.id;
      resetForm();
      if (isFirstCatch && knownSpecies) {
        router.replace({ pathname: '/species/[slug]', params: { slug: normalizeName(speciesName), name: speciesName } });
      } else {
        router.replace({ pathname: '/catches/[id]', params: { id: catchId } });
      }
    } catch (err: any) {
      Alert.alert(t('add_error'), err.message || t('add_error_occurred'));
    } finally {
      setLoading(false);
    }
  }, [session, image, weight, length, species, location, lure, visibility, title, description, knownSpecies, resetForm, router]);

  // ── Navigation ──
  // Le bouton "Suivant" n'est visible qu'à l'étape recherche manuelle (step 2 search),
  // ainsi qu'aux étapes 3 et 4. Les sous-étapes ai et db naviguent par tap sur les cartes.
  const showNav = step === 1 ? !!image : (step === 2 ? speciesSubStep === 'search' : true);

  const handleBack = React.useCallback(() => {
    if (step === 2) {
      if (speciesSubStep !== 'ai') {
        // Retour vers les suggestions IA
        setSpeciesSubStep('ai');
        setSpecies('');
        setAiPickedSuggestion(null);
      } else {
        // Retour vers l'étape photo
        setStep(1);
      }
    } else {
      setStep((s) => (s - 1) as Step);
    }
  }, [step, speciesSubStep]);

  const handleNext = React.useCallback(() => {
    if (step < 4) {
      if (step === 1 && !image) return Alert.alert(t('add_photo_required'));
      if (step === 2 && !species.trim()) return Alert.alert(t('add_species_required'));
      if (step === 3) {
        if (!location.trim()) return Alert.alert(t('add_location_required'), t('add_location_hint'));
        if (!weight.trim()) return Alert.alert(t('add_weight_required'), t('add_weight_hint'));
        if (!length.trim()) return Alert.alert(t('add_size_required'), t('add_size_hint'));
      }
      setStep((s) => (s + 1) as Step);
    } else {
      const sOk = !!species.trim();
      const wOk = !!weight.trim() && parseFloat(weight.replace(',', '.')) > 0;
      const lOk = !!length.trim() && parseFloat(length.replace(',', '.')) > 0;
      const iOk = !!image?.uri;
      const locOk = !!location.trim();
      if (sOk && wOk && lOk && iOk && locOk) persistCatch();
    }
  }, [step, image, species, location, weight, length, persistCatch]);

  // ── Render ──
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepPhoto
            imageUri={image?.uri ?? null}
            imageAspect={imageAspect}
            onPickImage={pickImage}
            onTakePhoto={takePhoto}
            onRemoveImage={removeImage}
          />
        );
      case 2:
        return (
          <StepSpecies
            subStep={speciesSubStep}
            aiLoading={aiLoading}
            aiError={aiError}
            aiSuggestions={aiSuggestionsWithImages}
            onRetryAi={retryAi}
            onSelectAiSuggestion={handleSelectAiSuggestion}
            onChooseOther={handleChooseOther}
            aiPickedSuggestion={aiPickedSuggestion}
            dbMatches={dbMatches}
            searchQuery={species}
            onChangeSearchQuery={setSpecies}
            searchResults={searchResults}
            onSelectSpecies={handleSelectSpecies}
            selectedSpecies={species}
          />
        );
      case 3:
        return (
          <StepDetails
            species={species}
            location={location}
            weight={weight}
            length={length}
            lure={lure}
            onChangeLocation={setLocation}
            onChangeWeight={setWeight}
            onChangeLength={setLength}
            onChangeLure={setLure}
          />
        );
      case 4:
        return (
          <StepPublish
            visibility={visibility}
            title={title}
            description={description}
            isKnownSpecies={knownSpecies}
            onChangeVisibility={setVisibility}
            onChangeTitle={setTitle}
            onChangeDescription={setDescription}
          />
        );
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex1}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + TAB_BAR_SPACER }]}
          showsVerticalScrollIndicator={false}
        >
          {(step > 1 || speciesSubStep !== 'ai') && (
            <View style={styles.header}>
              <Pressable
                onPress={handleBack}
                style={({ pressed }) => [styles.backArrow, { opacity: pressed ? 0.6 : 1 }]}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={22} color={P.blueDeep} />
              </Pressable>
            </View>
          )}

          <ProgressBar current={step} />

          {renderStep()}

          {showNav && (
            <NavigationRow
              step={step}
              loading={loading}
              onNext={handleNext}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
