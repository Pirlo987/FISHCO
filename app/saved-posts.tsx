import React from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePulse } from '@/hooks/usePulse';
import { Stack, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { C } from '@/constants/communityPalette';
import { CatchCard } from '@/components/community/CatchCard';
import type { FeedItem, CommentRow } from '@/components/community/types';

export default function SavedPostsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [feed, setFeed] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [savedByMe, setSavedByMe] = React.useState<Record<string, boolean>>({});
  const [likesById, setLikesById] = React.useState<Record<string, number>>({});
  const [commentsById, setCommentsById] = React.useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = React.useState<Record<string, boolean>>({});
  const [photoRatios, setPhotoRatios] = React.useState<Record<string, number>>({});
  const [commentOpen, setCommentOpen] = React.useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = React.useState<Record<string, string>>({});
  const [commentsList, setCommentsList] = React.useState<Record<string, CommentRow[]>>({});
  const [reportedCommentIds] = React.useState<Set<string>>(new Set());

  const fetchSaved = React.useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data: bookmarks } = await supabase
        .from('catch_bookmarks')
        .select('catch_id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      const catchIds = (bookmarks ?? []).map((b: any) => b.catch_id).filter(Boolean);
      if (!catchIds.length) {
        setFeed([]);
        return;
      }

      const { data, error } = await supabase
        .from('catches')
        .select(
          'id,user_id,title,species,weight_kg,length_cm,region,description,photo_path,caught_at,catch_likes(count),catch_comments(count),profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)',
        )
        .in('id', catchIds)
        .eq('is_public', true)
        .eq('status', 'active');

      if (error) throw error;
      const rows = (data as unknown as FeedItem[]) ?? [];

      // Conserver l'ordre des bookmarks
      const ordered = catchIds
        .map((id: string) => rows.find((r) => r.id === id))
        .filter(Boolean) as FeedItem[];

      setFeed(ordered);

      const nextLikes: Record<string, number> = {};
      const nextComments: Record<string, number> = {};
      const nextSaved: Record<string, boolean> = {};
      for (const row of rows) {
        nextLikes[row.id] = row.catch_likes?.[0]?.count ?? 0;
        nextComments[row.id] = row.catch_comments?.[0]?.count ?? 0;
        nextSaved[row.id] = true;
      }
      setLikesById(nextLikes);
      setCommentsById(nextComments);
      setSavedByMe(nextSaved);

      // Likes de l'utilisateur
      const { data: myLikesData } = await supabase
        .from('catch_likes')
        .select('catch_id')
        .eq('user_id', session.user.id)
        .in('catch_id', catchIds);
      const likedMap: Record<string, boolean> = {};
      for (const row of myLikesData ?? []) {
        const cid = (row as any)?.catch_id;
        if (cid) likedMap[cid] = true;
      }
      setLikedByMe(likedMap);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  React.useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchSaved();
  }, [fetchSaved]);

  const toggleLike = React.useCallback(
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
      }
    },
    [likedByMe, session?.user?.id],
  );

  const toggleSave = React.useCallback(
    async (catchId: string) => {
      if (!session?.user?.id) return;
      setSavedByMe((prev) => ({ ...prev, [catchId]: false }));
      // Retirer du feed après animation
      setTimeout(() => {
        setFeed((prev) => prev.filter((item) => item.id !== catchId));
      }, 300);
      await supabase
        .from('catch_bookmarks')
        .delete()
        .eq('catch_id', catchId)
        .eq('user_id', session.user.id);
    },
    [session?.user?.id],
  );

  const onToggleComments = React.useCallback((id: string) => {
    setCommentOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const onDraftChange = React.useCallback((id: string, text: string) => {
    setCommentDrafts((prev) => ({ ...prev, [id]: text }));
  }, []);

  const onPhotoRatio = React.useCallback((id: string, ratio: number) => {
    setPhotoRatios((prev) => (prev[id] ? prev : { ...prev, [id]: ratio }));
  }, []);

  const submitComment = React.useCallback(
    async (catchId: string) => {
      if (!session?.user?.id) return;
      const draft = (commentDrafts[catchId] || '').trim();
      if (!draft) return;
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

  const keyExtractor = React.useCallback((item: FeedItem) => item.id, []);

  const renderItem = React.useCallback(
    ({ item }: { item: FeedItem }) => (
      <CatchCard
        item={item}
        likeCount={likesById[item.id] ?? 0}
        commentCount={commentsById[item.id] ?? 0}
        liked={likedByMe[item.id] ?? false}
        saved={savedByMe[item.id] ?? true}
        photoRatio={photoRatios[item.id] ?? 4 / 5}
        comments={commentsList[item.id] ?? []}
        commentDraft={commentDrafts[item.id] ?? ''}
        commentOpen={commentOpen[item.id] ?? false}
        reportedCommentIds={reportedCommentIds}
        onToggleLike={toggleLike}
        onToggleComments={onToggleComments}
        onSubmitComment={submitComment}
        onDraftChange={onDraftChange}
        onPhotoRatio={onPhotoRatio}
        onOpenMenu={() => {}}
        onReportComment={() => {}}
        onToggleSave={toggleSave}
      />
    ),
    [
      likesById,
      commentsById,
      likedByMe,
      savedByMe,
      photoRatios,
      commentsList,
      commentDrafts,
      commentOpen,
      reportedCommentIds,
      toggleLike,
      onToggleComments,
      submitComment,
      onDraftChange,
      onPhotoRatio,
      toggleSave,
    ],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Posts enregistrés</Text>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <SavedSkeleton />
        ) : (
          <FlatList
            data={feed}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, feed.length === 0 && styles.emptyContainer]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} colors={[C.accent]} />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="bookmark-outline" size={44} color={C.accent} />
                </View>
                <Text style={styles.emptyTitle}>Aucun post enregistré</Text>
                <Text style={styles.emptySubtitle}>
                  Appuie sur l'icône bookmark dans la communauté pour sauvegarder des posts.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

function SavedSkeleton() {
  const opacity = usePulse();
  return (
    <View style={{ flex: 1 }}>
      {[1, 2].map((i) => (
        <Animated.View key={i} style={[{ backgroundColor: '#FFFFFF', marginBottom: 8, padding: 16, gap: 14 }, { opacity }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#CBD5E1' }} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ height: 12, width: '40%', borderRadius: 5, backgroundColor: '#CBD5E1' }} />
              <View style={{ height: 10, width: '60%', borderRadius: 5, backgroundColor: '#CBD5E1' }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[1, 2, 3].map((j) => (
              <View key={j} style={{ flex: 1, height: 36, borderRadius: 8, backgroundColor: '#CBD5E1' }} />
            ))}
          </View>
          <View style={{ height: 220, borderRadius: 12, backgroundColor: '#CBD5E1' }} />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ height: 20, width: 50, borderRadius: 6, backgroundColor: '#CBD5E1' }} />
            <View style={{ height: 20, width: 50, borderRadius: 6, backgroundColor: '#CBD5E1' }} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  list: { padding: 16, gap: 16 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySubtitle: { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
});
