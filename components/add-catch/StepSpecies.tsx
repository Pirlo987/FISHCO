import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { P } from '@/constants/addCatchPalette';
import { ThemedText } from '@/components/ThemedText';
import type { AISuggestion } from '@/hooks/useAiClassification';

export type AiSuggestionWithImage = AISuggestion & { image?: string };

export type CombinedSuggestion = {
  name: string;
  source: 'ai' | 'list';
  confidence?: number;
  image?: string;
};

type Props = {
  subStep: 'ai' | 'db' | 'search';
  // Sous-étape IA
  aiLoading: boolean;
  aiError: string | null;
  aiSuggestions: AiSuggestionWithImage[];
  onRetryAi: () => void;
  onSelectAiSuggestion: (s: AiSuggestionWithImage) => void;
  onChooseOther: () => void;
  // Sous-étape DB
  aiPickedSuggestion: AiSuggestionWithImage | null;
  dbMatches: CombinedSuggestion[];
  // Sous-étape recherche manuelle
  searchQuery: string;
  onChangeSearchQuery: (v: string) => void;
  searchResults: CombinedSuggestion[];
  // Sélection finale
  onSelectSpecies: (name: string) => void;
  selectedSpecies: string;
};

// ── Miniature espèce ──────────────────────────────────────────────────────────
function SpeciesThumb({
  uri,
  size,
  radius,
  primary,
}: {
  uri?: string;
  size: number;
  radius: number;
  primary?: boolean;
}) {
  const [err, setErr] = useState(false);

  if (uri && !err) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        onError={() => setErr(true)}
        transition={200}
      />
    );
  }

  if (primary) {
    return (
      <LinearGradient
        colors={[P.blue, P.blueDark]}
        style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="fish" size={size * 0.45} color={P.white} />
      </LinearGradient>
    );
  }

  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: P.blueGhost, borderWidth: 1, borderColor: P.borderBlue, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="fish-outline" size={size * 0.45} color={P.blue} />
    </View>
  );
}

// ── Barre de confiance ────────────────────────────────────────────────────────
function ConfBar({ pct, muted }: { pct: number; muted?: boolean }) {
  return (
    <View style={conf.row}>
      <View style={[conf.track, muted && conf.trackMuted]}>
        <View style={[conf.fill, muted && conf.fillMuted, { width: `${pct}%` as any }]} />
      </View>
      <ThemedText style={[conf.label, muted && conf.labelMuted]}>{pct}%</ThemedText>
    </View>
  );
}

const conf = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: P.borderBlue, overflow: 'hidden' },
  trackMuted: { backgroundColor: P.border },
  fill: { height: '100%', borderRadius: 2, backgroundColor: P.blue },
  fillMuted: { backgroundColor: P.slateLight },
  label: { fontSize: 11, fontWeight: '700', color: P.blue, minWidth: 28 },
  labelMuted: { color: P.slateLight },
});

// ── Sous-étape : Suggestions IA ───────────────────────────────────────────────
function SubStepAi({
  aiLoading,
  aiError,
  aiSuggestions,
  onRetryAi,
  onSelectAiSuggestion,
  onChooseOther,
}: Pick<Props, 'aiLoading' | 'aiError' | 'aiSuggestions' | 'onRetryAi' | 'onSelectAiSuggestion' | 'onChooseOther'>) {
  return (
    <View style={styles.container}>
      {/* En-tête section */}
      <View style={styles.sectionHeader}>
        <Ionicons name="sparkles" size={11} color={P.blue} />
        <ThemedText style={styles.sectionLabel}>Détection IA</ThemedText>
      </View>

      {/* Chargement */}
      {aiLoading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={P.blue} />
          <ThemedText style={styles.loadingText}>
            L'IA analyse votre photo pour identifier l'espèce…
          </ThemedText>
        </View>
      )}

      {/* Erreur */}
      {aiError && !aiLoading && (
        <View style={styles.errorCard}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
          </View>
          <View style={styles.errorBody}>
            <ThemedText style={styles.errorText}>{aiError}</ThemedText>
            <Pressable
              onPress={onRetryAi}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="refresh-outline" size={12} color={P.blue} />
              <ThemedText style={styles.retryText}>Réessayer</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Suggestions */}
      {!aiLoading && aiSuggestions.length > 0 && (
        <>
          {/* Carte principale */}
          {(() => {
            const s = aiSuggestions[0];
            const pct = Math.min(100, Math.round(s.confidence ?? 0));
            return (
              <Pressable
                onPress={() => onSelectAiSuggestion(s)}
                style={({ pressed }) => [styles.primaryCard, pressed && { opacity: 0.88 }]}
              >
                <SpeciesThumb uri={s.image} size={54} radius={11} primary />
                <View style={styles.primaryInfo}>
                  <ThemedText style={styles.primaryName} numberOfLines={1}>{s.species}</ThemedText>
                  {pct > 0 && <ConfBar pct={pct} />}
                  <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={10} color={P.blue} />
                    <ThemedText style={styles.aiBadgeText}>Meilleure correspondance</ThemedText>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={P.blue} />
              </Pressable>
            );
          })()}

          {/* Autres suggestions */}
          {aiSuggestions.slice(1).map((s) => {
            const pct = Math.min(100, Math.round(s.confidence ?? 0));
            return (
              <Pressable
                key={s.species}
                onPress={() => onSelectAiSuggestion(s)}
                style={({ pressed }) => [styles.secondaryCard, pressed && { opacity: 0.85 }]}
              >
                <SpeciesThumb uri={s.image} size={38} radius={9} />
                <View style={styles.secondaryInfo}>
                  <ThemedText style={styles.secondaryName} numberOfLines={1}>{s.species}</ThemedText>
                  {pct > 0 && <ConfBar pct={pct} muted />}
                </View>
                <Ionicons name="chevron-forward" size={16} color={P.slateLight} />
              </Pressable>
            );
          })}
        </>
      )}

      {/* Bouton "Autre espèce" — toujours visible sauf pendant le chargement */}
      {!aiLoading && (
        <Pressable
          onPress={onChooseOther}
          style={({ pressed }) => [styles.otherBtn, pressed && { opacity: 0.75 }]}
        >
          <Ionicons name="search-outline" size={15} color={P.blue} />
          <ThemedText style={styles.otherBtnText}>Autre espèce</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

// ── Sous-étape : Correspondances dans le catalogue ────────────────────────────
function SubStepDb({
  aiPickedSuggestion,
  dbMatches,
  onSelectSpecies,
  onChooseOther,
}: Pick<Props, 'aiPickedSuggestion' | 'dbMatches' | 'onSelectSpecies' | 'onChooseOther'>) {
  if (!aiPickedSuggestion) return null;

  const pct = Math.min(100, Math.round(aiPickedSuggestion.confidence ?? 0));

  return (
    <View style={styles.container}>
      {/* Contexte : suggestion IA sélectionnée */}
      <View style={styles.aiContextCard}>
        <Ionicons name="sparkles" size={13} color={P.blue} />
        <View style={styles.aiContextInfo}>
          <ThemedText style={styles.aiContextLabel}>L'IA a reconnu</ThemedText>
          <ThemedText style={styles.aiContextName} numberOfLines={1}>
            {aiPickedSuggestion.species}
          </ThemedText>
        </View>
        {pct > 0 && (
          <View style={styles.confBadge}>
            <ThemedText style={styles.confBadgeText}>{pct}%</ThemedText>
          </View>
        )}
      </View>

      {/* En-tête section */}
      <View style={styles.sectionHeader}>
        <Ionicons name="list-outline" size={11} color={P.slateLight} />
        <ThemedText style={[styles.sectionLabel, { color: P.slateLight }]}>
          Espèces dans le catalogue
        </ThemedText>
      </View>

      {dbMatches.length > 0 ? (
        /* Liste des correspondances */
        <View style={styles.matchList}>
          {dbMatches.map((s, i) => (
            <Pressable
              key={s.name}
              onPress={() => onSelectSpecies(s.name)}
              style={({ pressed }) => [
                styles.matchItem,
                i > 0 && styles.matchItemBorder,
                pressed && styles.matchItemPressed,
              ]}
            >
              <SpeciesThumb uri={s.image} size={38} radius={9} />
              <ThemedText style={styles.matchItemName} numberOfLines={1}>{s.name}</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={P.slateLight} />
            </Pressable>
          ))}
        </View>
      ) : (
        /* État vide */
        <View style={styles.emptyCard}>
          <Ionicons name="fish-outline" size={28} color={P.slateLight} />
          <ThemedText style={styles.emptyTitle}>Aucune correspondance trouvée</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            "{aiPickedSuggestion.species}" n'est pas encore dans notre catalogue
          </ThemedText>
          <Pressable
            onPress={() => onSelectSpecies(aiPickedSuggestion.species)}
            style={({ pressed }) => [styles.confirmAnywayBtn, pressed && { opacity: 0.8 }]}
          >
            <ThemedText style={styles.confirmAnywayText}>Confirmer quand même</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Lien recherche manuelle */}
      <Pressable
        onPress={onChooseOther}
        style={({ pressed }) => [styles.searchLink, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="search-outline" size={13} color={P.slateLight} />
        <ThemedText style={styles.searchLinkText}>Rechercher une autre espèce</ThemedText>
      </Pressable>
    </View>
  );
}

// ── Sous-étape : Recherche manuelle ──────────────────────────────────────────
function SubStepSearch({
  searchQuery,
  onChangeSearchQuery,
  searchResults,
  onSelectSpecies,
}: Pick<Props, 'searchQuery' | 'onChangeSearchQuery' | 'searchResults' | 'onSelectSpecies'>) {
  const inputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const showDropdown = searchResults.length > 0 && searchQuery.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* En-tête section */}
      <View style={styles.sectionHeader}>
        <Ionicons name="search-outline" size={11} color={P.slateLight} />
        <ThemedText style={[styles.sectionLabel, { color: P.slateLight }]}>
          Recherche manuelle
        </ThemedText>
      </View>

      {/* Groupe barre de recherche + dropdown */}
      <View style={styles.searchGroup}>
        <View style={[
          styles.searchBar,
          showDropdown && styles.searchBarOpen,
          searchQuery.length > 0 && { borderColor: P.borderBlue },
        ]}>
          <Ionicons
            name="search-outline"
            size={17}
            color={searchQuery ? P.blue : P.slateLight}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Nom de l'espèce…"
            placeholderTextColor={P.slateLight}
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => onChangeSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={P.slateLight} />
            </Pressable>
          )}
        </View>

        {showDropdown && (
          <View style={styles.listCard}>
            {searchResults.map((s, i) => (
              <Pressable
                key={s.name}
                onPress={() => { onSelectSpecies(s.name); Keyboard.dismiss(); }}
                style={({ pressed }) => [
                  styles.listItem,
                  i > 0 && styles.listItemBorder,
                  pressed && styles.listItemPressed,
                ]}
              >
                <SpeciesThumb uri={s.image} size={34} radius={8} />
                <ThemedText style={styles.listItemText} numberOfLines={1}>{s.name}</ThemedText>
                <Ionicons name="chevron-forward" size={14} color={P.slateLight} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export const StepSpecies = React.memo(function StepSpecies(props: Props) {
  if (props.subStep === 'ai') {
    return (
      <SubStepAi
        aiLoading={props.aiLoading}
        aiError={props.aiError}
        aiSuggestions={props.aiSuggestions}
        onRetryAi={props.onRetryAi}
        onSelectAiSuggestion={props.onSelectAiSuggestion}
        onChooseOther={props.onChooseOther}
      />
    );
  }

  if (props.subStep === 'db') {
    return (
      <SubStepDb
        aiPickedSuggestion={props.aiPickedSuggestion}
        dbMatches={props.dbMatches}
        onSelectSpecies={props.onSelectSpecies}
        onChooseOther={props.onChooseOther}
      />
    );
  }

  return (
    <SubStepSearch
      searchQuery={props.searchQuery}
      onChangeSearchQuery={props.onChangeSearchQuery}
      searchResults={props.searchResults}
      onSelectSpecies={props.onSelectSpecies}
    />
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { gap: 10 },

  // En-tête de section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.blue,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Chargement
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.blueGhost,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.borderBlue,
    padding: 16,
  },
  loadingText: { fontSize: 13, fontWeight: '500', color: P.blue, flex: 1 },

  // Erreur
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
  },
  errorIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  errorBody: { flex: 1, gap: 6 },
  errorText: { fontSize: 13, fontWeight: '500', color: '#92400E', lineHeight: 18 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: P.blueGhost,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: P.borderBlue,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: P.blue },

  // Carte principale IA (#1 suggestion)
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.border,
    padding: 11,
    shadowColor: P.blueDark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryInfo: { flex: 1, gap: 5 },
  primaryName: { fontSize: 17, fontWeight: '800', color: P.blueDark, letterSpacing: -0.2 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: P.blueGhost,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: P.borderBlue,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '600', color: P.blue },

  // Cartes secondaires IA (#2 et #3)
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    padding: 10,
  },
  secondaryInfo: { flex: 1, gap: 4 },
  secondaryName: { fontSize: 14, fontWeight: '600', color: P.blueDeep },

  // Bouton "Autre espèce"
  otherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: P.borderBlue,
    paddingVertical: 13,
    backgroundColor: P.blueGhost,
    marginTop: 2,
  },
  otherBtnText: { fontSize: 14, fontWeight: '700', color: P.blue },

  // Contexte IA (sous-étape DB)
  aiContextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.blueGhost,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.borderBlue,
    padding: 12,
  },
  aiContextInfo: { flex: 1 },
  aiContextLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: P.blue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiContextName: { fontSize: 15, fontWeight: '700', color: P.blueDeep },
  confBadge: {
    backgroundColor: P.blue,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confBadgeText: { fontSize: 12, fontWeight: '700', color: P.white },

  // Liste correspondances DB
  matchList: {
    backgroundColor: P.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.border,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  matchItemBorder: { borderTopWidth: 1, borderTopColor: P.border },
  matchItemPressed: { backgroundColor: P.surface },
  matchItemName: { flex: 1, fontSize: 15, fontWeight: '600', color: P.blueDeep },

  // État vide (DB sans correspondance)
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
    padding: 24,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: P.blueDeep },
  emptySubtitle: { fontSize: 12, color: P.slateLight, textAlign: 'center', lineHeight: 17 },
  confirmAnywayBtn: {
    marginTop: 4,
    backgroundColor: P.blue,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confirmAnywayText: { fontSize: 13, fontWeight: '700', color: P.white },

  // Lien recherche manuelle (pied de sous-étape DB)
  searchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  searchLinkText: { fontSize: 12, fontWeight: '600', color: P.slateLight },

  // Recherche manuelle
  searchGroup: { gap: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.border,
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchBarOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: P.blueDeep,
  },
  listCard: {
    backgroundColor: P.white,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: P.border,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  listItemBorder: { borderTopWidth: 1, borderTopColor: P.border },
  listItemPressed: { backgroundColor: P.surface },
  listItemText: { flex: 1, fontSize: 14, fontWeight: '500', color: P.blueDeep },
});
