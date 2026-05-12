import React, { useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedSafeArea } from '@/components/SafeArea';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { awardCatchPoints } from '@/lib/gamification';
import { normalizeName } from '@/constants/species';
import { useSpeciesLoader } from '@/hooks/useSpeciesLoader';
import { events } from '@/lib/events';

type CatchEntry = {
  id: string;
  species: string;
  taille: string;
  poids: string;
  appat: string;
  ville: string;
  isKnown: boolean;
  photo: ImagePicker.ImagePickerAsset | null;
};

export default function ImportCatchesStep() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { speciesOptions } = useSpeciesLoader();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isFromSettings = from === 'settings';

  const exit = useCallback(() => {
    if (isFromSettings) router.back();
    else router.replace('/(tabs)');
  }, [isFromSettings, router]);

  const [phase, setPhase] = useState<'choice' | 'import'>('choice');
  const [query, setQuery] = useState('');
  const [catches, setCatches] = useState<CatchEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // État modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [formTaille, setFormTaille] = useState('');
  const [formPoids, setFormPoids] = useState('');
  const [formAppat, setFormAppat] = useState('');
  const [formVille, setFormVille] = useState('');
  const [formPhoto, setFormPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [formErrors, setFormErrors] = useState({ taille: false, poids: false, ville: false });

  // Focus states
  const [searchFocused, setSearchFocused] = useState(false);
  const [tailleFocused, setTailleFocused] = useState(false);
  const [poidsFocused, setPoidsFocused] = useState(false);
  const [villeFocused, setVilleFocused] = useState(false);
  const [appatFocused, setAppatFocused] = useState(false);

  const sortedSpeciesNames = useMemo(
    () => speciesOptions.map((s) => s.name).sort((a, b) => a.localeCompare(b, 'fr')),
    [speciesOptions],
  );

  const filteredSpecies = useMemo(() => {
    const q = normalizeName(query);
    if (!q) return sortedSpeciesNames;
    return sortedSpeciesNames.filter((s) => normalizeName(s).includes(q));
  }, [query, sortedSpeciesNames]);

  const openModal = useCallback((species: string) => {
    setSelectedSpecies(species);
    setFormTaille('');
    setFormPoids('');
    setFormAppat('');
    setFormVille('');
    setFormPhoto(null);
    setFormErrors({ taille: false, poids: false, ville: false });
    setModalVisible(true);
  }, []);

  const pickPhoto = useCallback(async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    } as any);
    if (!res.canceled) setFormPhoto(res.assets[0]);
  }, []);

  const addCatch = useCallback(() => {
    if (!selectedSpecies) return;
    const errors = {
      taille: !formTaille.trim(),
      poids: !formPoids.trim(),
      ville: !formVille.trim(),
    };
    if (errors.taille || errors.poids || errors.ville) {
      setFormErrors(errors);
      return;
    }
    const normalizedSelected = normalizeName(selectedSpecies);
    const dbMatch = speciesOptions.find((s) => normalizeName(s.name) === normalizedSelected);
    const speciesName = dbMatch?.name ?? selectedSpecies;
    const entry: CatchEntry = {
      id: `${Date.now()}-${Math.random()}`,
      species: speciesName,
      taille: formTaille,
      poids: formPoids,
      appat: formAppat,
      ville: formVille,
      isKnown: !!dbMatch,
      photo: formPhoto,
    };
    setCatches((prev) => [...prev, entry]);
    setModalVisible(false);
  }, [selectedSpecies, formTaille, formPoids, formAppat, formVille, formPhoto, speciesOptions]);

  const removeCatch = useCallback((id: string) => {
    setCatches((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const uploadCatchPhoto = useCallback(
    async (asset: ImagePicker.ImagePickerAsset, userId: string): Promise<string | null> => {
      const manipulated = await ImageManipulator.manipulateAsync(asset.uri, [], {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const rand = Math.random().toString(36).slice(2, 8);
      const filePath = `${userId}/${stamp}-${rand}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { error } = await supabase.storage
        .from('catch-photos')
        .upload(filePath, decode(base64), { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
      if (error) throw error;
      return filePath;
    },
    [],
  );

  const handleFinish = useCallback(async () => {
    if (!session?.user?.id || catches.length === 0) {
      exit();
      return;
    }
    setLoading(true);

    // Toutes les prises en parallèle — on n'attend que l'insert principal
    await Promise.all(
      catches.map(async (entry) => {
        try {
          let photoPath: string | null = null;
          if (entry.photo) {
            try {
              photoPath = await uploadCatchPhoto(entry.photo, session.user.id);
            } catch {
              console.warn('Import: photo upload failed, saving catch without photo');
            }
          }

          const { data: newCatch, error } = await supabase
            .from('catches')
            .insert({
              user_id: session.user.id,
              species: entry.species,
              weight_kg: entry.poids ? parseFloat(entry.poids) : null,
              length_cm: entry.taille ? parseFloat(entry.taille) : null,
              region: entry.ville || null,
              notes: entry.appat || null,
              title: null,
              photo_path: photoPath,
              is_public: false,
              description: null,
              caught_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) {
            console.warn('Import: catches insert error', error.message);
            return;
          }
          if (!newCatch) return;

          events.emit('catch:added', { species: entry.species, catchId: newCatch.id });

          // Fire-and-forget : gamification et validation espèces ne bloquent pas l'utilisateur
          if (entry.isKnown) {
            awardCatchPoints({
              session,
              catchId: newCatch.id,
              species: entry.species,
              knownSpecies: true,
              firstForUser: true,
              isPublic: false,
              personalBest: false,
            }).catch((e) => console.warn('awardCatchPoints failed:', e));
          } else {
            supabase
              .from('pending_species')
              .insert({
                user_id: session.user.id,
                name: entry.species,
                statut: 'pending',
                notes: `catch=${newCatch.id}`,
                update_at: new Date().toISOString(),
              })
              .then(({ error: e }) => { if (e) console.warn('pending_species insert failed:', e.message); });
          }
        } catch (e) {
          console.warn('Import catch error:', e);
        }
      }),
    );

    setLoading(false);
    exit();
  }, [session, catches, exit, uploadCatchPhoto]);

  // ─── PHASE CHOIX ──────────────────────────────────────────────────────────────
  if (phase === 'choice') {
    return (
      <ThemedSafeArea edges={['top']} style={{ backgroundColor: '#ffffff' }}>
        <View style={styles.wrapper}>
          <View style={styles.topAccent}>
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.choiceContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#1E3A5F', '#0F2744']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressFillFull}
                  />
                </View>
                <Text style={styles.progressText}>✓</Text>
              </View>

              <Text style={styles.title}>Tes prises passées</Text>
              <Text style={styles.subtitle}>
                Tu pêches déjà ? Importe tes anciennes captures pour démarrer ton FishDex avec une longueur d'avance.
              </Text>
            </View>

            <View style={styles.cards}>
              <Pressable style={styles.primaryCard} onPress={() => setPhase('import')}>
                <Text style={styles.cardEmoji}>📋</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.primaryCardTitle}>Importer mes prises</Text>
                  <Text style={styles.primaryCardSub}>
                    Renseigne tes captures passées et débloque des espèces dans ton FishDex
                  </Text>
                </View>
                <Text style={styles.primaryChevron}>›</Text>
              </Pressable>

              <Pressable style={styles.secondaryCard} onPress={exit}>
                <Text style={styles.cardEmoji}>🚀</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.secondaryCardTitle}>Commencer sans importer</Text>
                  <Text style={styles.secondaryCardSub}>Tu pourras toujours ajouter tes prises plus tard</Text>
                </View>
                <Text style={styles.secondaryChevron}>›</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </ThemedSafeArea>
    );
  }

  // ─── PHASE IMPORT ─────────────────────────────────────────────────────────────
  return (
    <ThemedSafeArea edges={['top']} style={{ backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.wrapper}>
          <View style={styles.topAccent}>
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />
          </View>

          {/* En-tête */}
          <View style={styles.importHeader}>
            <Pressable onPress={() => setPhase('choice')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>‹</Text>
            </Pressable>
            <View style={styles.importTitleRow}>
              <Text style={styles.importTitle}>Sélectionne tes espèces</Text>
              {catches.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{catches.length}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Recherche */}
          <View style={styles.searchWrap}>
            <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
              <Ionicons name="search" size={17} color={searchFocused ? '#3B82F6' : '#94A3B8'} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une espèce..."
                placeholderTextColor="#94A3B8"
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Chips */}
          {catches.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {catches.map((c) => (
                <View key={c.id} style={styles.chip}>
                  {c.photo && <Ionicons name="image" size={12} color="#3B82F6" />}
                  <Text style={styles.chipText} numberOfLines={1}>{c.species}</Text>
                  <Pressable onPress={() => removeCatch(c.id)} hitSlop={6}>
                    <Ionicons name="close" size={13} color="#94A3B8" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Liste */}
          <FlatList
            data={filteredSpecies}
            keyExtractor={(item) => item}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              query.trim() ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Aucune espèce trouvée pour "{query}"</Text>
                  <Pressable style={styles.addCustomBtnWrap} onPress={() => openModal(query.trim())}>
                    <View style={styles.addCustomBtn}>
                      <Ionicons name="add" size={18} color="#ffffff" />
                      <Text style={styles.addCustomText}>Ajouter "{query.trim()}"</Text>
                    </View>
                  </Pressable>
                  <Text style={styles.emptyHint}>Sera soumise pour vérification</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable style={styles.speciesRow} onPress={() => openModal(item)}>
                <Text style={styles.speciesName}>{item}</Text>
                <View style={styles.addCircle}>
                  <Ionicons name="add" size={18} color="#1E293B" />
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              style={[styles.finishBtn, loading && styles.disabled]}
              onPress={handleFinish}
              disabled={loading}
            >
              <Text style={styles.finishText}>
                {loading
                  ? 'Import en cours...'
                  : catches.length > 0
                  ? `Terminer · ${catches.length} prise${catches.length > 1 ? 's' : ''}`
                  : 'Passer cette étape'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Modal détails d'une prise */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.overlay}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
            <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={styles.sheetContent}
              >
                <View style={styles.handle} />

                <View style={styles.sheetHeader}>
                  <Text style={styles.modalSpecies}>{selectedSpecies}</Text>
                  <Text style={styles.modalSub}>Renseigne les détails de ta prise</Text>
                </View>

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.label}>
                      Taille (cm) <Text style={styles.required}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.inputContainer,
                        tailleFocused && styles.inputContainerFocused,
                        formErrors.taille && styles.inputContainerError,
                      ]}
                    >
                      <TextInput
                        style={styles.input}
                        placeholder="ex : 45"
                        placeholderTextColor="#94A3B8"
                        value={formTaille}
                        onChangeText={(v) => {
                          setFormTaille(v);
                          if (formErrors.taille) setFormErrors((e) => ({ ...e, taille: false }));
                        }}
                        onFocus={() => setTailleFocused(true)}
                        onBlur={() => setTailleFocused(false)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {formErrors.taille && <Text style={styles.errorText}>Champ obligatoire</Text>}
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>
                      Poids (kg) <Text style={styles.required}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.inputContainer,
                        poidsFocused && styles.inputContainerFocused,
                        formErrors.poids && styles.inputContainerError,
                      ]}
                    >
                      <TextInput
                        style={styles.input}
                        placeholder="ex : 2.5"
                        placeholderTextColor="#94A3B8"
                        value={formPoids}
                        onChangeText={(v) => {
                          setFormPoids(v);
                          if (formErrors.poids) setFormErrors((e) => ({ ...e, poids: false }));
                        }}
                        onFocus={() => setPoidsFocused(true)}
                        onBlur={() => setPoidsFocused(false)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {formErrors.poids && <Text style={styles.errorText}>Champ obligatoire</Text>}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Lieu de pêche <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      villeFocused && styles.inputContainerFocused,
                      formErrors.ville && styles.inputContainerError,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="ex : La Rochelle"
                      placeholderTextColor="#94A3B8"
                      value={formVille}
                      onChangeText={(v) => {
                        setFormVille(v);
                        if (formErrors.ville) setFormErrors((e) => ({ ...e, ville: false }));
                      }}
                      onFocus={() => setVilleFocused(true)}
                      onBlur={() => setVilleFocused(false)}
                    />
                  </View>
                  {formErrors.ville && <Text style={styles.errorText}>Champ obligatoire</Text>}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Appâts / Leurre <Text style={styles.optional}>(optionnel)</Text>
                  </Text>
                  <View style={[styles.inputContainer, appatFocused && styles.inputContainerFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="ex : Vers, cuillère argentée..."
                      placeholderTextColor="#94A3B8"
                      value={formAppat}
                      onChangeText={setFormAppat}
                      onFocus={() => setAppatFocused(true)}
                      onBlur={() => setAppatFocused(false)}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Photo <Text style={styles.optional}>(optionnel)</Text>
                  </Text>
                  {formPhoto ? (
                    <View style={styles.photoPreviewWrap}>
                      <Image source={{ uri: formPhoto.uri }} style={styles.photoPreview} contentFit="cover" />
                      <Pressable style={styles.photoRemove} onPress={() => setFormPhoto(null)} hitSlop={8}>
                        <Ionicons name="close-circle" size={24} color="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.photoPickerBtn} onPress={pickPhoto}>
                      <Ionicons name="image-outline" size={20} color="#64748B" />
                      <Text style={styles.photoPickerText}>Choisir depuis la galerie</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.modalBtns}>
                  <Pressable
                    style={styles.cancelBtnWrap}
                    onPress={() => setModalVisible(false)}
                  >
                    <View style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>Annuler</Text>
                    </View>
                  </Pressable>
                  <Pressable style={styles.addBtnWrap} onPress={addCatch}>
                    <View style={styles.addBtn}>
                      <Text style={styles.addBtnText}>Ajouter cette prise</Text>
                    </View>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#ffffff' },
  topAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 10 },
  accentBar: { flex: 1 },
  scrollView: { flex: 1 },

  // ── Header commun ────────────────────────────────────────────
  header: { gap: 14 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFillFull: { width: '100%', height: '100%' },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    minWidth: 24,
    textAlign: 'right',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  subtitle: { color: '#64748B', fontSize: 15, lineHeight: 22 },

  // ── Phase choix ───────────────────────────────────────────────
  choiceContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 28,
  },
  cards: { gap: 12 },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#0f172a',
  },
  cardEmoji: { fontSize: 28 },
  cardBody: { flex: 1, gap: 4 },
  primaryCardTitle: { color: '#ffffff', fontWeight: '800', fontSize: 17 },
  primaryCardSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18 },
  primaryChevron: { color: '#ffffff', fontSize: 28, fontWeight: '300', opacity: 0.6 },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  secondaryCardTitle: { color: '#0f172a', fontWeight: '700', fontSize: 17 },
  secondaryCardSub: { color: '#64748B', fontSize: 13, lineHeight: 18 },
  secondaryChevron: { color: '#94A3B8', fontSize: 28, fontWeight: '300' },

  // ── Phase import ──────────────────────────────────────────────
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 22, color: '#1E293B', fontWeight: '600', lineHeight: 26 },
  importTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  importTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2 },
  badge: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },

  searchWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchRowFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#ffffff',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500' },

  chipsScroll: { maxHeight: 46, marginBottom: 4 },
  chipsContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6,
    maxWidth: 180,
  },
  chipText: { color: '#1E40AF', fontSize: 13, fontWeight: '600', flexShrink: 1 },

  list: { flex: 1, marginTop: 2 },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  speciesName: { fontSize: 15, color: '#0f172a', fontWeight: '500', flex: 1 },
  addCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 20 },

  emptyWrap: { paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', gap: 14 },
  emptyText: { color: '#64748B', fontSize: 15, textAlign: 'center', fontWeight: '500' },
  emptyHint: { color: '#94A3B8', fontSize: 12, textAlign: 'center' },
  addCustomBtnWrap: { alignSelf: 'stretch' },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
    borderRadius: 14,
  },
  addCustomText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  finishBtn: {
    paddingVertical: 18,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    alignItems: 'center',
  },
  finishText: { color: '#ffffff', fontWeight: '800', fontSize: 17, letterSpacing: 0.3 },
  disabled: { opacity: 0.6 },

  // ── Modal ──────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 18,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: { gap: 4 },
  modalSpecies: { fontSize: 22, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  modalSub: { fontSize: 14, color: '#64748B', lineHeight: 20 },

  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, gap: 6 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151' },
  required: { color: '#EF4444', fontWeight: '700' },
  optional: { fontWeight: '400', color: '#94A3B8' },
  errorText: { fontSize: 11, color: '#EF4444', fontWeight: '500' },

  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  inputContainerFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#ffffff',
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  input: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },

  photoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  photoPickerText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  photoPreviewWrap: { position: 'relative', alignSelf: 'flex-start' },
  photoPreview: { width: 100, height: 100, borderRadius: 12 },
  photoRemove: { position: 'absolute', top: -8, right: -8 },

  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtnWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  cancelBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelText: { color: '#1E293B', fontWeight: '700', fontSize: 16 },
  addBtnWrap: { flex: 2 },
  addBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
  },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});
