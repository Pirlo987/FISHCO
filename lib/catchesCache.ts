import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@fishbook/cache/';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

type CacheEntry<T> = { data: T; savedAt: number };

function key(userId: string, scope: string): string {
  return `${PREFIX}${userId}/${scope}`;
}

export async function saveCache<T>(userId: string, scope: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, savedAt: Date.now() };
    await AsyncStorage.setItem(key(userId, scope), JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — ignore, cache is best-effort
  }
}

export async function loadCache<T>(userId: string, scope: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key(userId, scope));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.savedAt > TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export async function clearUserCache(userId: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = allKeys.filter((k) => k.startsWith(`${PREFIX}${userId}/`));
    if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
  } catch {
    // Ignore
  }
}
