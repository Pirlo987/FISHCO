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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedSafeArea } from '@/components/SafeArea';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { awardCatchPoints } from '@/lib/gamification';
import { normalizeName } from '@/constants/species';
import { useSpeciesLoader } from '@/hooks/useSpeciesLoader';

// Liste étendue de toutes les espèces pêchables (eau douce + mer)
// Noms alignés sur le champ `name` de la table species en BDD
// après migration supabase/species_migration.sql
const ALL_FISHABLE_SPECIES = [
  // ── Eau douce ────────────────────────────────────────────────
  'Ablette',
  'Anguille',
  'Barbeau',
  'Black-bass',
  'Breme',
  'Brochet',
  'Carpe amour',
  'Carpe commune',
  'Carpe cuir',
  'Carpe miroir',
  'Chevesne',
  'Gardon',
  'Goujon',
  'Ide melanote',
  'Lotte de riviere',
  'Ombre commun',
  'Omble chevalier',
  'Perche',
  'Perche soleil',
  'Poisson-chat',
  'Rotengle',
  'Sandre',
  'Silure glane',
  'Tanche',
  'Truite arc-en-ciel',
  'Truite de lac',
  'Truite fario',
  'Vairon',
  'Vandoise',
  // ── Migrateurs ───────────────────────────────────────────────
  'Saumon atlantique',
  'Eperlan',
  // ── Mer ──────────────────────────────────────────────────────
  'Bar',
  'Barbue',
  'Bonite a dos raye',
  'Cabillaud',
  'Carangue GT',
  'Chinchard',
  'Congre',
  'Dorade grise',
  'Dorade royale',
  'Espadon',
  'Germon',
  'Grondin gris',
  'Grondin rouge',
  'Hareng',
  'Jobfish vert',
  'Kawakawa',
  'Kob',
  'Leerfish',
  'Lieu jaune',
  'Lieu noir',
  'Little tunny',
  'Listao',
  'Lotte de mer',
  'Mahi-mahi',
  'Maquereau',
  'Marlin bleu',
  'Marlin bleu Indo-Pacifique',
  'Marlin noir',
  'Marlin raye',
  'Merou brun',
  'Merlan',
  'Mulet',
  'Oblade',
  'Orphie',
  'Pagre',
  'Pageot',
  'Raie',
  'Rouget barbet',
  'Saint-Pierre',
  'Sar commun',
  'Sardine',
  'Saupe',
  'Seriole',
  'Sole commune',
  'Tacaud',
  'Thon jaune',
  'Thon obese',
  'Thon rouge',
  'Turbot',
  'Vieille',
  'Voilier',
  // ── Monde ────────────────────────────────────────────────────
  'Arapaima',
  'Barramundi',
  'Blue catfish',
  'Bluegill',
  'Channel catfish',
  'Dorado',
  'Giant snakehead',
  'Largemouth bass',
  'Mahi-mahi',
  'Peacock bass',
  'Perche du Nil',
  'Piranha rouge',
  'Saumon chinook',
  'Saumon coho',
  'Striped bass',
  'Walleye',
  'Wahoo',
].sort((a, b) => a.localeCompare(b, 'fr'));

type CatchEntry = {
  id: string;
  species: string;
  taille: string;
  poids: string;
  appat: string;
  ville: string;
  isKnown: boolean;
};

export default function ImportCatchesStep() {
  const router = useRouter();
  const { session } = useAuth();
  const { isKnownSpecies, speciesOptions } = useSpeciesLoader();
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

  // État du modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [formTaille, setFormTaille] = useState('');
  const [formPoids, setFormPoids] = useState('');
  const [formAppat, setFormAppat] = useState('');
  const [formVille, setFormVille] = useState('');

  const filteredSpecies = useMemo(() => {
    const q = normalizeName(query);
    if (!q) return ALL_FISHABLE_SPECIES;
    return ALL_FISHABLE_SPECIES.filter((s) => normalizeName(s).includes(q));
  }, [query]);

  const openModal = useCallback((species: string) => {
    setSelectedSpecies(species);
    setFormTaille('');
    setFormPoids('');
    setFormAppat('');
    setFormVille('');
    setModalVisible(true);
  }, []);

  const addCatch = useCallback(() => {
    if (!selectedSpecies) return;
    // Utiliser le nom exact de la BDD pour garantir le match dans le fishdex
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
    };
    setCatches((prev) => [...prev, entry]);
    setModalVisible(false);
  }, [selectedSpecies, formTaille, formPoids, formAppat, formVille, isKnownSpecies]);

  const removeCatch = useCallback((id: string) => {
    setCatches((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleFinish = useCallback(async () => {
    if (!session?.user?.id || catches.length === 0) {
      exit();
      return;
    }
    setLoading(true);
    for (const entry of catches) {
      try {
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
            photo_path: null,
            is_public: false,
            description: null,
            caught_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && newCatch) {
          if (entry.isKnown) {
            await awardCatchPoints({
              session,
              catchId: newCatch.id,
              species: entry.species,
              knownSpecies: true,
              firstForUser: true,
              isPublic: false,
              personalBest: false,
            });
          } else {
            await supabase.from('pending_species').insert({
              user_id: session.user.id,
              name: entry.species,
              statut: 'pending',
              notes: `catch=${newCatch.id}`,
              update_at: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn('Import catch error:', e);
      }
    }
    setLoading(false);
    exit();
  }, [session, catches, exit, router]);

  // ─── PHASE CHOIX ────────────────────────────────────────────────────────────
  if (phase === 'choice') {
    return (
      <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
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
            contentContainerStyle={styles.choiceContent}
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
                <Text style={styles.progressDone}>✓</Text>
              </View>

              <View style={styles.emojiWrap}>
                <Text style={styles.bigEmoji}>🎣</Text>
              </View>
              <Text style={styles.title}>Tes prises passées</Text>
              <Text style={styles.subtitle}>
                Tu pêches déjà ? Importe tes anciennes captures pour démarrer ton FishDex avec une longueur d'avance.
              </Text>
            </View>

            <View style={styles.cards}>
              {/* Carte principale — importer */}
              <Pressable onPress={() => setPhase('import')}>
                <LinearGradient
                  colors={['#1E3A5F', '#0F2744']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryCard}
                >
                  <Text style={styles.cardEmoji}>📋</Text>
                  <View style={styles.cardBody}>
                    <Text style={styles.primaryCardTitle}>Importer mes prises</Text>
                    <Text style={styles.primaryCardSub}>
                      Renseigne tes captures passées et débloque des espèces dans ton FishDex
                    </Text>
                  </View>
                  <Text style={styles.cardChevron}>›</Text>
                </LinearGradient>
              </Pressable>

              {/* Carte secondaire — passer */}
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

  // ─── PHASE IMPORT ────────────────────────────────────────────────────────────
  return (
    <ThemedSafeArea edges={['top', 'bottom']} style={{ backgroundColor: '#ffffff' }}>
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

          {/* En-tête import */}
          <View style={styles.importHeader}>
            <Pressable onPress={() => setPhase('choice')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>‹</Text>
            </Pressable>
            <Text style={styles.importTitle}>Sélectionne tes espèces</Text>
            {catches.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{catches.length}</Text>
              </View>
            )}
          </View>

          {/* Recherche */}
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une espèce..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Text style={styles.clearIcon}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Chips des prises ajoutées */}
          {catches.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {catches.map((c) => (
                <View key={c.id} style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>{c.species}</Text>
                  <Pressable onPress={() => removeCatch(c.id)} hitSlop={6} style={styles.chipRemove}>
                    <Text style={styles.chipRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Liste des espèces */}
          <FlatList
            data={filteredSpecies}
            keyExtractor={(item) => item}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Aucune espèce trouvée pour "{query}"</Text>
                <Text style={styles.emptyHint}>Elle sera ajoutée en tant qu'espèce inconnue</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.speciesRow} onPress={() => openModal(item)}>
                <Text style={styles.speciesName}>{item}</Text>
                <View style={styles.addCircle}>
                  <Text style={styles.addIcon}>+</Text>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.finishBtn, loading && styles.disabled]}
              onPress={handleFinish}
              disabled={loading}
            >
              <LinearGradient
                colors={['#1E3A5F', '#0F2744']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.finishGradient}
              >
                <Text style={styles.finishText}>
                  {loading
                    ? 'Import en cours...'
                    : catches.length > 0
                    ? `Terminer l'import · ${catches.length} prise${catches.length > 1 ? 's' : ''}`
                    : 'Passer cette étape'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Modal saisie détails d'une prise */}
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
            <View style={styles.sheet}>
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
                    <Text style={styles.label}>Taille (cm)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ex : 45"
                      placeholderTextColor="#94A3B8"
                      value={formTaille}
                      onChangeText={setFormTaille}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>Poids (kg)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ex : 2.5"
                      placeholderTextColor="#94A3B8"
                      value={formPoids}
                      onChangeText={setFormPoids}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Ville / Lieu de pêche</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ex : La Rochelle"
                    placeholderTextColor="#94A3B8"
                    value={formVille}
                    onChangeText={setFormVille}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Appâts utilisés{' '}
                    <Text style={styles.optional}>(optionnel)</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ex : Vers, cuillère argentée..."
                    placeholderTextColor="#94A3B8"
                    value={formAppat}
                    onChangeText={setFormAppat}
                  />
                </View>

                <View style={styles.modalBtns}>
                  <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelText}>Annuler</Text>
                  </Pressable>
                  <Pressable style={styles.addBtnWrap} onPress={addCatch}>
                    <LinearGradient
                      colors={['#1E3A5F', '#0F2744']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.addGradient}
                    >
                      <Text style={styles.addText}>Ajouter cette prise</Text>
                    </LinearGradient>
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

  // ── Phase choix ──────────────────────────────────────────────
  choiceContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 28,
  },
  header: { gap: 16 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFillFull: { width: '100%', height: '100%' },
  progressDone: { fontSize: 13, fontWeight: '700', color: '#1E3A5F', minWidth: 20 },
  emojiWrap: { alignItems: 'center', paddingVertical: 8 },
  bigEmoji: { fontSize: 56 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  subtitle: { color: '#64748B', fontSize: 15, lineHeight: 22 },
  cards: { gap: 14 },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 20,
  },
  cardEmoji: { fontSize: 28 },
  cardBody: { flex: 1, gap: 4 },
  primaryCardTitle: { color: '#ffffff', fontWeight: '800', fontSize: 17 },
  primaryCardSub: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 18 },
  cardChevron: { color: '#ffffff', fontSize: 28, fontWeight: '300', opacity: 0.7 },
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

  // ── Phase import ─────────────────────────────────────────────
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 22, color: '#1E3A5F', fontWeight: '600', lineHeight: 26 },
  importTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0f172a' },
  badge: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  clearIcon: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },

  chipsScroll: { maxHeight: 48, marginBottom: 6 },
  chipsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6,
    maxWidth: 180,
  },
  chipText: { color: '#1E40AF', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  chipRemove: { padding: 2 },
  chipRemoveText: { color: '#93C5FD', fontSize: 11, fontWeight: '700' },

  list: { flex: 1, marginTop: 4 },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  speciesName: { fontSize: 15, color: '#0f172a', fontWeight: '500', flex: 1 },
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: { fontSize: 18, color: '#1E3A5F', fontWeight: '700', lineHeight: 22 },
  sep: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 20 },
  emptyWrap: { padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { color: '#64748B', fontSize: 15, textAlign: 'center' },
  emptyHint: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  finishBtn: { borderRadius: 16, overflow: 'hidden' },
  finishGradient: { paddingVertical: 18, alignItems: 'center' },
  finishText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.6 },

  // ── Modal ────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    gap: 20,
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
  sheetHeader: { gap: 6 },
  modalSpecies: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  modalSub: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  row: { flexDirection: 'row', gap: 14 },
  half: { flex: 1, gap: 8 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151' },
  optional: { fontWeight: '400', color: '#94A3B8' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#F8FAFC',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelText: { color: '#64748B', fontWeight: '700', fontSize: 15 },
  addBtnWrap: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  addGradient: { paddingVertical: 16, alignItems: 'center' },
  addText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
