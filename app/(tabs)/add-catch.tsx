import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
import type { AISuggestion } from '@/hooks/useAiClassification';

import { ProgressBar } from '@/components/add-catch/ProgressBar';
import { NavigationRow } from '@/components/add-catch/NavigationRow';
import { StepPhoto } from '@/components/add-catch/StepPhoto';
import { StepSpecies } from '@/components/add-catch/StepSpecies';
import type { CombinedSuggestion } from '@/components/add-catch/StepSpecies';
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

export default function AddCatchScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Form state ──
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
  const [speciesFocused, setSpeciesFocused] = React.useState(false);
  const [speciesTouched, setSpeciesTouched] = React.useState(false);

  const scrollRef = React.useRef<ScrollView | null>(null);
  const speciesTouchedRef = React.useRef(speciesTouched);
  const forcedPrivateRef = React.useRef(false);

  React.useEffect(() => { speciesTouchedRef.current = speciesTouched; }, [speciesTouched]);

  // ── Custom hooks ──
  const { image, imageAspect, pickImage, takePhoto, removeImage: rawRemoveImage } = useImagePicker();
  const { isKnownSpecies: checkKnown, filterSpecies } = useSpeciesLoader();
  const { aiLoading, aiError, aiSuggestions, clearAi, classify } = useAiClassification();

  const knownSpecies = React.useMemo(() => checkKnown(species), [checkKnown, species]);

  // ── Species suggestions ──
  const speciesSuggestions = React.useMemo(() => filterSpecies(species), [filterSpecies, species]);

  const combinedSuggestions = React.useMemo<CombinedSuggestion[]>(() => {
    const byKey = new Map<string, CombinedSuggestion>();
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

  const showDropdown = React.useMemo(
    () => combinedSuggestions.length > 0 && (speciesFocused || !!species.trim() || aiSuggestions.length > 0),
    [aiSuggestions.length, species, speciesFocused, combinedSuggestions.length],
  );

  // ── Visibility auto-switch for unknown species ──
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

  // ── AI classification trigger ──
  React.useEffect(() => {
    if (image) {
      clearAi();
      classify(image, (name) => {
        if (!speciesTouchedRef.current) setSpecies(name);
      });
    }
  }, [image, classify, clearAi]);

  // ── Handlers ──
  const handleSpeciesChange = React.useCallback((v: string) => {
    setSpecies(v);
    setSpeciesTouched(true);
  }, []);

  const handleSpeciesFocus = React.useCallback(() => {
    setSpeciesFocused(true);
  }, []);

  const handleSpeciesBlur = React.useCallback(() => {
    setTimeout(() => setSpeciesFocused(false), 120);
  }, []);

  const retryAi = React.useCallback(() => {
    if (!image) return;
    classify(image, (name) => {
      if (!speciesTouchedRef.current) setSpecies(name);
    });
  }, [classify, image]);

  const removeImage = React.useCallback(() => {
    rawRemoveImage();
    clearAi();
  }, [rawRemoveImage, clearAi]);

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
    setSpeciesFocused(false);
    setSpeciesTouched(false);
    clearAi();
  }, [clearAi]);

  // ── Persist ──
  const persistCatch = React.useCallback(async () => {
    if (!session || !image) return;
    const isPublicAllowed = visibility === 'public' && knownSpecies;
    if (visibility === 'public' && !knownSpecies) {
      Alert.alert(t('add_unknown_species'), t('add_unknown_species_msg'));
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
          caught_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (dbError) throw dbError;

      awardCatchPoints({ session, catchId: newCatch.id, species: species.trim(), knownSpecies });
      events.emit('catch:added', { species: species.trim(), catchId: newCatch.id });

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

      resetForm();
      router.replace('/(tabs)/explore');
    } catch (err: any) {
      Alert.alert(t('add_error'), err.message || t('add_error_occurred'));
    } finally {
      setLoading(false);
    }
  }, [session, image, weight, length, species, location, lure, visibility, title, description, knownSpecies, resetForm, router]);

  // ── Navigation ──
  const showNav = step > 1 || !!image;

  const handleBack = React.useCallback(() => {
    setStep((s) => (s - 1) as Step);
  }, []);

  const handleNext = React.useCallback(() => {
    if (step < 4) {
      if (step === 1 && !image) return Alert.alert(t('add_photo_required'));
      if (step === 2 && !species) return Alert.alert(t('add_species_required'));
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
            species={species}
            onChangeSpecies={handleSpeciesChange}
            aiLoading={aiLoading}
            aiError={aiError}
            onRetryAi={retryAi}
            suggestions={combinedSuggestions}
            showDropdown={showDropdown}
            onFocus={handleSpeciesFocus}
            onBlur={handleSpeciesBlur}
          />
        );
      case 3:
        return (
          <StepDetails
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
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>{t('add_title')}</ThemedText>
            <View style={styles.stepBadge}>
              <ThemedText style={styles.stepBadgeText}>{step}/4</ThemedText>
            </View>
          </View>

          <ProgressBar current={step} />

          {renderStep()}

          {showNav && (
            <NavigationRow
              step={step}
              loading={loading}
              isFirstStep={step === 1}
              onBack={handleBack}
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: P.blueDeep, letterSpacing: -0.3 },
  stepBadge: {
    backgroundColor: P.blueGhost,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: P.border,
  },
  stepBadgeText: { fontSize: 13, fontWeight: '700', color: P.blue },
});
