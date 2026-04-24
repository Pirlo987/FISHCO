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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePulse } from '@/hooks/usePulse';
import Ionicons from '@expo/vector-icons/Ionicons';

import { C } from '@/constants/communityPalette';
import { useCommunityFeed } from '@/hooks/useCommunityFeed';
import { CatchCard } from '@/components/community/CatchCard';
import { PostMenu } from '@/components/community/PostMenu';
import type { FeedItem } from '@/components/community/types';
import { useLanguage } from '@/providers/LanguageProvider';
import { useRouter } from 'expo-router';

export default function CommunityScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    feed,
    loading,
    refreshing,
    error,
    photoRatios,
    likesById,
    commentsById,
    likedByMe,
    commentDrafts,
    commentOpen,
    commentsList,
    onRefresh,
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
  } = useCommunityFeed();

  const [menuCatch, setMenuCatch] = React.useState<{ id: string; userId: string } | null>(null);

  const handleOpenMenu = React.useCallback((id: string, userId: string) => {
    setMenuCatch({ id, userId });
  }, []);

  const handleCloseMenu = React.useCallback(() => {
    setMenuCatch(null);
  }, []);

  const handleHide = React.useCallback(() => {
    if (menuCatch) hidePost(menuCatch.id);
  }, [menuCatch, hidePost]);

  const handleReport = React.useCallback(
    (reason: string) => {
      if (menuCatch) reportPost(menuCatch.id, reason);
    },
    [menuCatch, reportPost],
  );

  const handleBlockUser = React.useCallback(() => {
    if (menuCatch) blockUser(menuCatch.userId);
  }, [menuCatch, blockUser]);

  const handlePressUser = React.useCallback((userId: string) => {
    router.push(`/user/${userId}`);
  }, [router]);

  const renderItem = React.useCallback(
    ({ item }: { item: FeedItem }) => (
      <CatchCard
        item={item}
        likeCount={likesById[item.id] ?? 0}
        commentCount={commentsById[item.id] ?? 0}
        liked={likedByMe[item.id] ?? false}
        saved={savedByMe[item.id] ?? false}
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
        onOpenMenu={(id) => handleOpenMenu(id, item.user_id)}
        onReportComment={reportComment}
        onToggleSave={toggleSave}
        onPressUser={handlePressUser}
      />
    ),
    [
      likesById,
      commentsById,
      likedByMe,
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
      handleOpenMenu,
      reportComment,
      savedByMe,
      toggleSave,
      handlePressUser,
    ],
  );

  const keyExtractor = React.useCallback((item: FeedItem) => item.id, []);

  const publishBanner = (
    <Pressable
      style={({ pressed }) => [styles.publishCard, { opacity: pressed ? 0.88 : 1 }]}
      onPress={() => router.push('/(tabs)/add-catch')}
    >
      <LinearGradient
        colors={['#1E3A5F', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.publishGradient}
      >
        <View style={styles.publishLeft}>
          <View style={styles.publishIconWrap}>
            <Ionicons name="camera" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.publishTexts}>
            <Text style={styles.publishTitle}>Partage ta prise</Text>
            <Text style={styles.publishSub}>Ajoute une photo et inspire la communauté</Text>
          </View>
        </View>
        <View style={styles.publishArrow}>
          <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
        </View>
      </LinearGradient>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={['#DBEAFE', '#EFF6FF', '#F5F8FC']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.35 }}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fishbook</Text>
        <Pressable style={styles.headerBtn} hitSlop={8} onPress={() => router.push('/(tabs)/add-catch')}>
          <Ionicons name="add-circle-outline" size={24} color="#2563EB" />
        </Pressable>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="wifi-outline" size={18} color={C.like} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>{t('community_error')}</Text>
          </Pressable>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <CommunitySkeleton />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, feed.length === 0 && styles.emptyContainer]}
          ListHeaderComponent={publishBanner}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563EB"
              colors={['#2563EB']}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="fish-outline" size={44} color={C.accent} />
              </View>
              <Text style={styles.emptyTitle}>{t('community_no_posts')}</Text>
              <Text style={styles.emptySubtitle}>
                Sois le premier à partager ta prise avec la communauté !
              </Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/add-catch')}>
                <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Ajouter une prise</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <PostMenu
        visible={menuCatch !== null}
        reported={menuCatch !== null && reportedIds.has(menuCatch.id)}
        onHide={handleHide}
        onReport={handleReport}
        onBlockUser={handleBlockUser}
        onClose={handleCloseMenu}
      />
    </LinearGradient>
  );
}

function CommunitySkeleton() {
  const opacity = usePulse();
  return (
    <View style={{ flex: 1 }}>
      {[1, 2, 3].map((i) => (
        <Animated.View key={i} style={[{ backgroundColor: '#FFFFFF', marginBottom: 8, padding: 16, gap: 14 }, { opacity }]}>
          {/* Header avatar + name */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#CBD5E1' }} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ height: 12, width: '40%', borderRadius: 5, backgroundColor: '#CBD5E1' }} />
              <View style={{ height: 10, width: '60%', borderRadius: 5, backgroundColor: '#CBD5E1' }} />
            </View>
          </View>
          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[1, 2, 3].map((j) => (
              <View key={j} style={{ flex: 1, height: 36, borderRadius: 8, backgroundColor: '#CBD5E1' }} />
            ))}
          </View>
          {/* Photo */}
          <View style={{ height: 220, borderRadius: 12, backgroundColor: '#CBD5E1' }} />
          {/* Actions */}
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
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.8 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  // ── Publish banner ──
  publishCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  publishLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  publishIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishTexts: { flex: 1 },
  publishTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  publishSub: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  publishArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: { padding: 16, gap: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: C.sub },

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
  emptySubtitle: {
    fontSize: 14,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: '#991B1B' },
  retryBtn: {
    backgroundColor: C.like,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 12 },
});
