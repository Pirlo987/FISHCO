/** @jest-environment node */
/**
 * Tests de la logique de gamification (points, niveaux).
 * Critique car les points sont liés à l'engagement utilisateur.
 */

// Reproduit la logique de lib/gamification.ts sans imports natifs
type Level = {
  name: string;
  minPoints: number;
  color: string;
};

const LEVELS: Level[] = [
  { name: 'Novice',      minPoints: 0,    color: '#94A3B8' },
  { name: 'Apprenti',   minPoints: 100,  color: '#34D399' },
  { name: 'Moussaillon',minPoints: 300,  color: '#60A5FA' },
  { name: 'Capitaine',  minPoints: 700,  color: '#F59E0B' },
  { name: 'Légende',    minPoints: 1500, color: '#A78BFA' },
];

function getLevelForPoints(points: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

function getProgressToNextLevel(points: number): number {
  const currentIndex = LEVELS.findIndex((l) => l === getLevelForPoints(points));
  const next = LEVELS[currentIndex + 1];
  if (!next) return 1;
  const current = LEVELS[currentIndex];
  return (points - current.minPoints) / (next.minPoints - current.minPoints);
}

describe('Niveaux de gamification', () => {
  it('0 point → Novice', () => {
    expect(getLevelForPoints(0).name).toBe('Novice');
  });

  it('100 points → Apprenti', () => {
    expect(getLevelForPoints(100).name).toBe('Apprenti');
  });

  it('99 points → toujours Novice', () => {
    expect(getLevelForPoints(99).name).toBe('Novice');
  });

  it('1500 points → Légende', () => {
    expect(getLevelForPoints(1500).name).toBe('Légende');
  });

  it('9999 points → Légende (plafond max)', () => {
    expect(getLevelForPoints(9999).name).toBe('Légende');
  });
});

describe('Progression vers le niveau suivant', () => {
  it('progrès à 0% au début d\'un niveau', () => {
    expect(getProgressToNextLevel(0)).toBe(0);
  });

  it('progrès à 50% à mi-chemin entre Novice et Apprenti', () => {
    expect(getProgressToNextLevel(50)).toBeCloseTo(0.5);
  });

  it('progrès à 1 (100%) au niveau max', () => {
    expect(getProgressToNextLevel(1500)).toBe(1);
  });
});
