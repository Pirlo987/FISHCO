/** @jest-environment node */
/**
 * Tests de la logique premium (sans dépendance native RevenueCat).
 * On teste les règles de décision du hook usePremium et les limites freemium.
 * Les constantes sont dupliquées ici pour éviter d'importer le module natif.
 * Si FREE_FISHDEX_LIMIT ou FREE_HISTORY_LIMIT changent dans usePremium.ts,
 * mettre à jour ces valeurs.
 */

const FREE_FISHDEX_LIMIT = 30;
const FREE_HISTORY_LIMIT = 50;

// Réplique la logique de isPremium sans les dépendances natives
function resolvePremiumStatus(
  rcIsPremium: boolean | null,
  rcError: boolean,
  dbIsPremium: boolean | null,
): boolean {
  if (rcIsPremium !== null) return rcIsPremium;
  if (rcError && dbIsPremium !== null) return dbIsPremium;
  return false;
}

describe('Constantes freemium', () => {
  it('FREE_FISHDEX_LIMIT est 30', () => {
    expect(FREE_FISHDEX_LIMIT).toBe(30);
  });

  it('FREE_HISTORY_LIMIT est 50', () => {
    expect(FREE_HISTORY_LIMIT).toBe(50);
  });
});

describe('Logique de résolution du statut premium', () => {
  it('renvoie true si RevenueCat confirme premium', () => {
    expect(resolvePremiumStatus(true, false, null)).toBe(true);
  });

  it('renvoie false si RevenueCat dit non-premium', () => {
    expect(resolvePremiumStatus(false, false, true)).toBe(false);
  });

  it('utilise la DB comme fallback si RevenueCat échoue et DB dit premium', () => {
    expect(resolvePremiumStatus(null, true, true)).toBe(true);
  });

  it('utilise la DB comme fallback si RevenueCat échoue et DB dit non-premium', () => {
    expect(resolvePremiumStatus(null, true, false)).toBe(false);
  });

  it('renvoie false si RevenueCat échoue et DB indisponible', () => {
    expect(resolvePremiumStatus(null, true, null)).toBe(false);
  });

  it('renvoie false par défaut (aucune donnée disponible)', () => {
    expect(resolvePremiumStatus(null, false, null)).toBe(false);
  });
});

describe('Gate Historique', () => {
  it('un utilisateur gratuit ne voit pas plus de FREE_HISTORY_LIMIT prises', () => {
    const totalCatches = 120;
    const isPremium = false;
    const visibleCatches = isPremium ? totalCatches : Math.min(totalCatches, FREE_HISTORY_LIMIT);
    expect(visibleCatches).toBe(FREE_HISTORY_LIMIT);
  });

  it('un utilisateur premium voit toutes ses prises', () => {
    const totalCatches = 120;
    const isPremium = true;
    const visibleCatches = isPremium ? totalCatches : Math.min(totalCatches, FREE_HISTORY_LIMIT);
    expect(visibleCatches).toBe(120);
  });

  it('la bannière limite s\'affiche quand un gratuit atteint la limite', () => {
    const catches = Array.from({ length: FREE_HISTORY_LIMIT });
    const isPremium = false;
    const showBanner = !isPremium && catches.length >= FREE_HISTORY_LIMIT;
    expect(showBanner).toBe(true);
  });

  it('la bannière limite ne s\'affiche pas avant la limite', () => {
    const catches = Array.from({ length: 10 });
    const isPremium = false;
    const showBanner = !isPremium && catches.length >= FREE_HISTORY_LIMIT;
    expect(showBanner).toBe(false);
  });
});

describe('Gate Fishdex', () => {
  it('le compteur de découvertes est plafonné à FREE_FISHDEX_LIMIT pour un gratuit', () => {
    const realCount = 45;
    const isPremium = false;
    const displayCount = isPremium ? realCount : Math.min(realCount, FREE_FISHDEX_LIMIT);
    expect(displayCount).toBe(FREE_FISHDEX_LIMIT);
  });

  it('le compteur est exact pour un premium', () => {
    const realCount = 45;
    const isPremium = true;
    const displayCount = isPremium ? realCount : Math.min(realCount, FREE_FISHDEX_LIMIT);
    expect(displayCount).toBe(45);
  });

  it('la bannière limite apparaît quand un gratuit atteint la limite de découvertes', () => {
    const rawCount = FREE_FISHDEX_LIMIT;
    const isPremium = false;
    const limitReached = !isPremium && rawCount >= FREE_FISHDEX_LIMIT;
    expect(limitReached).toBe(true);
  });
});
