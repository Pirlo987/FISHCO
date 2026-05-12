import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { awardLikeGiven, awardLikeReceived } from '@/lib/gamification';
import type { FeedItem, CommentRow } from '@/components/community/types';

const URL_REGEX = /https?:\/\/|www\./i;
export const MAX_COMMENT_LENGTH = 500;
const PAGE_SIZE = 12;

const FEED_SELECT =
  'id,user_id,title,species,weight_kg,length_cm,region,description,photo_path,caught_at,catch_likes(count),catch_comments(count),profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)';

export function useCommunityFeed() {
  const { session } = useAuth();

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [photoRatios, setPhotoRatios] = useState<Record<string, number>>({});
  const [likesById, setLikesById] = useState<Record<string, number>>({});
  const [commentsById, setCommentsById] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentOpen, setCommentOpen] = useState<Record<string, boolean>>({});
  const [commentsList, setCommentsList] = useState<Record<string, CommentRow[]>>({});
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [reportedCommentIds, setReportedCommentIds] = useState<Set<string>>(new Set());
  const [savedByMe, setSavedByMe] = useState<Record<string, boolean>>({});

  const visibleFeed = useMemo(
    () => feed.filter((item) => !hiddenIds.has(item.id) && !blockedUserIds.has(item.user_id)),
    [feed, hiddenIds, blockedUserIds],
  );

  const ownerByCatch = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of feed) {
      if (item.id && item.user_id) map[item.id] = item.user_id;
    }
    return map;
  }, [feed]);

  // ── Chargements secondaires (seulement pour le nouveau batch) ──

  const loadComments = useCallback(async (ids: string[]) => {
    if (!ids.length) return {} as Record<string, CommentRow[]>;
    const next: Record<string, CommentRow[]> = {};
    const { data, error: cError } = await supabase
      .from('catch_comments')
      .select(
        'id,catch_id,content,created_at,profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)',
      )
      .in('catch_id', ids)
      .order('created_at', { ascending: false });
    if (cError) return {};
    for (const row of (data as unknown as CommentRow[]) ?? []) {
      const cid = row.catch_id;
      if (!cid) continue;
      const list = next[cid] ?? [];
      if (list.length < 3) list.push(row);
      next[cid] = list;
    }
    return next;
  }, []);

  const loadMySaves = useCallback(
    async (ids: string[]) => {
      if (!session?.user?.id || !ids.length) return {} as Record<string, boolean>;
      const { data } = await supabase
        .from('catch_bookmarks')
        .select('catch_id')
        .eq('user_id', session.user.id)
        .in('catch_id', ids);
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) {
        const cid = (row as any)?.catch_id;
        if (cid) map[cid] = true;
      }
      return map;
    },
    [session?.user?.id],
  );

  const loadMyLikes = useCallback(
    async (ids: string[]) => {
      if (!session?.user?.id || !ids.length) return {} as Record<string, boolean>;
      const { data } = await supabase
        .from('catch_likes')
        .select('catch_id')
        .eq('user_id', session.user.id)
        .in('catch_id', ids);
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) {
        const cid = (row as any)?.catch_id;
        if (cid) map[cid] = true;
      }
      return map;
    },
    [session?.user?.id],
  );

  // ── Merge helper pour les données secondaires d'un batch ──

  const mergeSecondaryData = useCallback(
    async (rows: FeedItem[], replace: boolean) => {
      const newLikes: Record<string, number> = {};
      const newComments: Record<string, number> = {};
      for (const row of rows) {
        newLikes[row.id] = row.catch_likes?.[0]?.count ?? 0;
        newComments[row.id] = row.catch_comments?.[0]?.count ?? 0;
      }

      const ids = rows.map((r) => r.id);
      const [commentMap, likedMap, savedMap] = await Promise.all([
        loadComments(ids),
        loadMyLikes(ids),
        loadMySaves(ids),
      ]);

      if (replace) {
        setLikesById(newLikes);
        setCommentsById(newComments);
        setCommentsList(commentMap);
        setLikedByMe(likedMap);
        setSavedByMe(savedMap);
      } else {
        setLikesById((prev) => ({ ...prev, ...newLikes }));
        setCommentsById((prev) => ({ ...prev, ...newComments }));
        setCommentsList((prev) => ({ ...prev, ...commentMap }));
        setLikedByMe((prev) => ({ ...prev, ...likedMap }));
        setSavedByMe((prev) => ({ ...prev, ...savedMap }));
      }
    },
    [loadComments, loadMyLikes, loadMySaves],
  );

  // ── Première page (reset complet) ──

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('catches')
        .select(FEED_SELECT)
        .eq('is_public', true)
        .eq('status', 'active')
        .order('caught_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (dbError) throw dbError;
      const rows = (data as unknown as FeedItem[]) ?? [];
      setFeed(rows);
      setOffset(rows.length);
      setHasMore(rows.length === PAGE_SIZE);

      await mergeSecondaryData(rows, true);
    } catch (e: any) {
      setError(e?.message ?? 'Flux indisponible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mergeSecondaryData]);

  // ── Page suivante (append) ──

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { data, error: dbError } = await supabase
        .from('catches')
        .select(FEED_SELECT)
        .eq('is_public', true)
        .eq('status', 'active')
        .order('caught_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (dbError) throw dbError;
      const rows = (data as unknown as FeedItem[]) ?? [];
      if (!rows.length) {
        setHasMore(false);
        return;
      }
      setFeed((prev) => [...prev, ...rows]);
      setOffset((prev) => prev + rows.length);
      setHasMore(rows.length === PAGE_SIZE);

      await mergeSecondaryData(rows, false);
    } catch (e: any) {
      console.warn('loadMore failed:', e?.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, offset, mergeSecondaryData]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed();
  }, [fetchFeed]);

  // ── Interactions ──

  const toggleSave = useCallback(
    async (catchId: string) => {
      if (!session?.user?.id) return;
      const currentlySaved = savedByMe[catchId] ?? false;
      setSavedByMe((prev) => ({ ...prev, [catchId]: !currentlySaved }));
      if (currentlySaved) {
        await supabase
          .from('catch_bookmarks')
          .delete()
          .eq('catch_id', catchId)
          .eq('user_id', session.user.id);
      } else {
        await supabase
          .from('catch_bookmarks')
          .upsert({ catch_id: catchId, user_id: session.user.id });
      }
    },
    [savedByMe, session?.user?.id],
  );

  const toggleLike = useCallback(
    async (catchId: string) => {
      if (!session?.user?.id) return;
      const currentlyLiked = likedByMe[catchId] ?? false;
      setLikedByMe((prev) => ({ ...prev, [catchId]: !currentlyLiked }));
      setLikesById((prev) => ({
        ...prev,
        [catchId]: Math.max(0, (prev[catchId] ?? 0) + (currentlyLiked ? -1 : 1)),
      }));
      if (currentlyLiked) {
        await supabase
          .from('catch_likes')
          .delete()
          .eq('catch_id', catchId)
          .eq('user_id', session.user.id);
      } else {
        await supabase
          .from('catch_likes')
          .upsert({ catch_id: catchId, user_id: session.user.id });
        awardLikeGiven(session, catchId).catch(() => {});
        const ownerId = ownerByCatch[catchId];
        if (ownerId && ownerId !== session.user.id) {
          awardLikeReceived(ownerId, catchId).catch(() => {});
        }
      }
    },
    [likedByMe, ownerByCatch, session],
  );

  const submitComment = useCallback(
    async (catchId: string) => {
      if (!session?.user?.id) return;
      const draft = (commentDrafts[catchId] || '').trim();
      if (!draft) return;
      if (draft.length > MAX_COMMENT_LENGTH) return;
      if (URL_REGEX.test(draft)) return;
      setCommentDrafts((prev) => ({ ...prev, [catchId]: '' }));
      const { data, error: insertError } = await supabase
        .from('catch_comments')
        .insert({ catch_id: catchId, user_id: session.user.id, content: draft })
        .select(
          'id,catch_id,content,created_at,profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)',
        )
        .single();
      if (!insertError && data) {
        setCommentsList((prev) => {
          const list = prev[catchId] ? [...prev[catchId]] : [];
          list.unshift(data as unknown as CommentRow);
          return { ...prev, [catchId]: list.slice(0, 3) };
        });
        setCommentsById((prev) => ({ ...prev, [catchId]: (prev[catchId] ?? 0) + 1 }));
      }
    },
    [commentDrafts, session?.user?.id],
  );

  const onPhotoRatio = useCallback((id: string, ratio: number) => {
    setPhotoRatios((prev) => (prev[id] ? prev : { ...prev, [id]: ratio }));
  }, []);

  const onToggleComments = useCallback((id: string) => {
    setCommentOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const onDraftChange = useCallback((id: string, text: string) => {
    setCommentDrafts((prev) => ({ ...prev, [id]: text }));
  }, []);

  const hidePost = useCallback((id: string) => {
    setHiddenIds((prev) => new Set([...prev, id]));
  }, []);

  const blockUser = useCallback(
    async (userId: string) => {
      if (!session?.user?.id || userId === session.user.id) return;
      setBlockedUserIds((prev) => new Set([...prev, userId]));
      await supabase
        .from('blocked_users')
        .upsert({ user_id: session.user.id, blocked_id: userId });
    },
    [session?.user?.id],
  );

  const reportComment = useCallback(
    async (commentId: string) => {
      if (!session?.user?.id) return;
      setReportedCommentIds((prev) => new Set([...prev, commentId]));
      await supabase.from('reports').insert({
        comment_id: commentId,
        reported_by: session.user.id,
        reason: 'inappropriate',
      });
    },
    [session?.user?.id],
  );

  const reportPost = useCallback(
    async (catchId: string, reason: string) => {
      if (!session?.user?.id) return;
      setReportedIds((prev) => new Set([...prev, catchId]));
      setHiddenIds((prev) => new Set([...prev, catchId]));
      await supabase.from('reports').insert({
        catch_id: catchId,
        reported_by: session.user.id,
        reason,
      });
    },
    [session?.user?.id],
  );

  return {
    feed: visibleFeed,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    photoRatios,
    likesById,
    commentsById,
    likedByMe,
    commentDrafts,
    commentOpen,
    commentsList,
    onRefresh,
    loadMore,
    toggleLike,
    submitComment,
    onPhotoRatio,
    onToggleComments,
    onDraftChange,
    hidePost,
    reportPost,
    reportedIds,
    blockUser,
    reportComment,
    reportedCommentIds,
    savedByMe,
    toggleSave,
  } as const;
}
