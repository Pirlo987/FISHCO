import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type GamificationReason =
  | 'first_species'
  | 'repeat_species'
  | 'personal_best'
  | 'public_catch'
  | 'like_given'
  | 'like_received';

type Award = {
  points: number;
  reason: GamificationReason;
  metadata?: Record<string, any>;
};

export const GAMIFICATION_RULES = {
  firstSpecies: 100,
  repeatSpecies: 10,
  personalBest: 25,
  publicCatch: 5,
  likeGiven: 1,
  likeReceived: 1,
};

// Titles are intentionally short; tweak thresholds as you see fit.
export const LEVEL_TITLES: { min: number; title: string }[] = [
  { min: 0, title: 'Novice' },
  { min: 500, title: 'Apprenti' },
  { min: 1000, title: 'Moussaillon' },
  { min: 3000, title: 'Capitaine' },
  { min: 5000, title: 'Légende' },
];

export const titleForPoints = (points: number | null | undefined) => {
  if (!points || Number.isNaN(points)) return LEVEL_TITLES[0].title;
  const sorted = [...LEVEL_TITLES].sort((a, b) => a.min - b.min);
  const found = sorted.filter((t) => points >= t.min).pop();
  return found?.title ?? LEVEL_TITLES[0].title;
};

const pushAwards = async (targetUserId: string, awards: Award[]) => {
  if (!targetUserId || !awards.length) return;
  const payloads = awards.filter((a) => a.points > 0);
  if (!payloads.length) return;
  try {
    await supabase.rpc('award_points', {
      target_user_id: targetUserId,
      awards: payloads,
    });
  } catch (err: any) {
    console.warn('Gamification award failed', err?.message ?? err);
  }
};

export const awardCatchPoints = async ({
  session,
  catchId,
  species,
  knownSpecies,
  firstForUser,
  isPublic,
  personalBest,
}: {
  session: Session | null;
  catchId?: string;
  species?: string;
  knownSpecies: boolean;
  firstForUser: boolean;
  isPublic: boolean;
  personalBest: boolean;
}) => {
  if (!session?.user?.id) return;
  const awards: Award[] = [];
  if (knownSpecies) {
    awards.push({
      points: firstForUser ? GAMIFICATION_RULES.firstSpecies : GAMIFICATION_RULES.repeatSpecies,
      reason: firstForUser ? 'first_species' : 'repeat_species',
      metadata: { catchId, species },
    });
  }
  if (personalBest) {
    awards.push({
      points: GAMIFICATION_RULES.personalBest,
      reason: 'personal_best',
      metadata: { catchId, species },
    });
  }
  if (isPublic) {
    awards.push({
      points: GAMIFICATION_RULES.publicCatch,
      reason: 'public_catch',
      metadata: { catchId, species },
    });
  }
  await pushAwards(session.user.id, awards);
};

export const awardLikeGiven = async (session: Session | null, catchId?: string) => {
  if (!session?.user?.id) return;
  await pushAwards(session.user.id, [
    { points: GAMIFICATION_RULES.likeGiven, reason: 'like_given', metadata: { catchId } },
  ]);
};

export const awardLikeReceived = async (ownerUserId?: string | null, catchId?: string) => {
  if (!ownerUserId) return;
  await pushAwards(ownerUserId, [
    { points: GAMIFICATION_RULES.likeReceived, reason: 'like_received', metadata: { catchId } },
  ]);
};
