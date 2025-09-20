import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

const DRAFT_KEY = 'profile_draft';

export type ProfileDraft = {
  ownerId: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  country?: string;
  dialCode?: string;
  phone?: string;
  level?: string;
  username?: string;
};

type DraftRecord = Partial<Omit<ProfileDraft, 'ownerId'>> & { ownerId?: string };

const parseDraft = (raw: string | null): DraftRecord | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as DraftRecord;
  } catch {
    return null;
  }
};

const getStoredDraft = async (): Promise<DraftRecord | null> => {
  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  const parsed = parseDraft(raw);
  if (!parsed) {
    await AsyncStorage.removeItem(DRAFT_KEY);
    return null;
  }
  return parsed;
};

const resolveOwnerId = async (session: Session | null): Promise<string | null> => {
  if (session?.user?.id) return session.user.id;
  const existing = await getStoredDraft();
  return existing?.ownerId ?? null;
};

export async function readProfileDraft(session: Session | null): Promise<ProfileDraft | null> {
  const parsed = await getStoredDraft();
  if (!parsed?.ownerId) {
    if (parsed) await AsyncStorage.removeItem(DRAFT_KEY);
    return null;
  }
  const userId = session?.user?.id;
  if (userId && parsed.ownerId !== userId) {
    await AsyncStorage.removeItem(DRAFT_KEY);
    return null;
  }
  if (!userId) return null;
  return { ...parsed, ownerId: parsed.ownerId } as ProfileDraft;
}

export async function mergeProfileDraft(
  session: Session | null,
  patch: Partial<Omit<ProfileDraft, 'ownerId'>>
) {
  const ownerId = await resolveOwnerId(session);
  if (!ownerId) return;
  await AsyncStorage.mergeItem(DRAFT_KEY, JSON.stringify({ ...patch, ownerId }));
}

export async function setProfileDraft(
  session: Session | null,
  payload: Partial<Omit<ProfileDraft, 'ownerId'>>
) {
  const ownerId = await resolveOwnerId(session);
  if (!ownerId) return;
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...payload, ownerId }));
}

export async function clearProfileDraft() {
  await AsyncStorage.removeItem(DRAFT_KEY);
}
