import { supabase } from '@/lib/supabase';
import type { Profile } from '@/components/community/types';

export const formatDate = (value: string | null | undefined) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
};

export const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const fixed = Math.round(value * 100) / 100;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(2).replace(/\.00$/, '');
};

export const displayName = (profile?: Profile | null) => {
  if (!profile) return 'Pecheur anonyme';
  const parts = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return parts || profile.username || 'Pecheur anonyme';
};

export const avatarUrlFromProfile = (profile?: Profile | null) => {
  if (!profile) return null;
  if (profile.avatar_url) return profile.avatar_url;
  if (profile.photo_url) return profile.photo_url;
  if (profile.avatar_path) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_path);
    if (data.publicUrl) return data.publicUrl;
  }
  if (profile.photo_path) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.photo_path);
    if (data.publicUrl) return data.publicUrl;
  }
  return null;
};

export const catchPhotoUrl = (path?: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from('catch-photos').getPublicUrl(path);
  return data.publicUrl ?? null;
};

export const formatTimeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'maintenant';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}j`;
  return formatDate(date);
};
