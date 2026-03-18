import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedSafeArea } from '@/components/SafeArea';
import { C } from '@/constants/communityPalette';
import { useCommunityFeed } from '@/hooks/useCommunityFeed';
import { CatchCard } from '@/components/community/CatchCard';
import type { FeedItem } from '@/components/community/types';
import { useLanguage } from '@/providers/LanguageProvider';

export default function CommunityScreen() {
  const { t } = useLanguage();
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
  } = useCommunityFeed();

  const renderItem = React.useCallback(
    ({ item }: { item: FeedItem }) => (
      <CatchCard
        item={item}
        likeCount={likesById[item.id] ?? 0}
        commentCount={commentsById[item.id] ?? 0}
        liked={likedByMe[item.id] ?? false}
        photoRatio={photoRatios[item.id] ?? 4 / 5}
        comments={commentsList[item.id] ?? []}
        commentDraft={commentDrafts[item.id] ?? ''}
        commentOpen={commentOpen[item.id] ?? false}
        onToggleLike={toggleLike}
        onToggleComments={onToggleComments}
        onSubmitComment={submitComment}
        onDraftChange={onDraftChange}
        onPhotoRatio={onPhotoRatio}
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
      toggleLike,
      onToggleComments,
      submitComment,
      onDraftChange,
      onPhotoRatio,
    ],
  );

  const keyExtractor = React.useCallback((item: FeedItem) => item.id, []);

  return (
    <ThemedSafeArea edges={['top']} style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communaute</Text>
        <View style={styles.headerIcons}>
          <Pressable style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="add-circle-outline" size={24} color={C.text} />
          </Pressable>
          <Pressable style={styles.headerBtn} hitSlop={8}>
            <View>
              <Ionicons name="notifications-outline" size={22} color={C.text} />
              <View style={styles.notifDot} />
            </View>
          </Pressable>
        </View>
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>{t('community_loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, feed.length === 0 && styles.emptyContainer]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.accent}
              colors={[C.accent]}
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
                Sois le premier a partager ta prise avec la communaute !
              </Text>
              <Pressable style={styles.emptyBtn}>
                <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Ajouter une prise</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBtn: { padding: 4 },
  notifDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.like,
    borderWidth: 1.5,
    borderColor: C.surface,
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
