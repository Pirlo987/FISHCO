import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '@/constants/communityPalette';
import { displayName, catchPhotoUrl, formatTimeAgo, formatNumber } from '@/lib/communityHelpers';
import { UserAvatar } from './UserAvatar';
import { CatchPhoto } from './CatchPhoto';
import { ActionBar } from './ActionBar';
import { CommentSection } from './CommentSection';
import type { FeedItem, CommentRow } from './types';

type Props = {
  item: FeedItem;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  photoRatio: number;
  comments: CommentRow[];
  commentDraft: string;
  commentOpen: boolean;
  onToggleLike: (id: string) => void;
  onToggleComments: (id: string) => void;
  onSubmitComment: (id: string) => void;
  onDraftChange: (id: string, text: string) => void;
  onPhotoRatio: (id: string, ratio: number) => void;
};

export const CatchCard = React.memo(function CatchCard({
  item,
  likeCount,
  commentCount,
  liked,
  photoRatio,
  comments,
  commentDraft,
  commentOpen,
  onToggleLike,
  onToggleComments,
  onSubmitComment,
  onDraftChange,
  onPhotoRatio,
}: Props) {
  const name = displayName(item.profiles);
  const photo = catchPhotoUrl(item.photo_path);
  const timeAgo = formatTimeAgo(item.caught_at);
  const title = item.title?.trim();
  const location = item.region?.trim() || 'Lieu non precise';
  const species = item.species?.trim() || '—';
  const lengthLabel = formatNumber(item.length_cm) ? `${formatNumber(item.length_cm)} cm` : '—';
  const weightLabel = formatNumber(item.weight_kg) ? `${formatNumber(item.weight_kg)} kg` : '—';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <UserAvatar profile={item.profiles} name={name} size={42} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={C.sub} />
              <Text style={styles.metaLocation} numberOfLines={1}>{location}</Text>
            </View>
          </View>
          <Text style={styles.meta}>{timeAgo}</Text>
        </View>
        <Pressable style={styles.moreBtn} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={18} color={C.muted} />
        </Pressable>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {title ? <Text style={styles.catchTitle}>{title}</Text> : null}
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Espece</Text>
            <Text style={styles.statValue} numberOfLines={1}>{species}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Taille</Text>
            <Text style={styles.statValue}>{lengthLabel}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Poids</Text>
            <Text style={styles.statValue}>{weightLabel}</Text>
          </View>
        </View>
      </View>

      {/* Photo */}
      <CatchPhoto
        photoUrl={photo}
        ratio={photoRatio}
        species={null}
        onRatio={(r) => onPhotoRatio(item.id, r)}
      />

      {/* Actions */}
      <ActionBar
        liked={liked}
        likeCount={likeCount}
        commentCount={commentCount}
        onToggleLike={() => onToggleLike(item.id)}
        onToggleComments={() => onToggleComments(item.id)}
      />

      {/* Comments */}
      <View style={styles.body}>
        {commentCount > 0 && !commentOpen && (
          <Pressable onPress={() => onToggleComments(item.id)}>
            <Text style={styles.viewComments}>
              Voir les {commentCount} commentaire{commentCount > 1 ? 's' : ''}
            </Text>
          </Pressable>
        )}
        <CommentSection
          isOpen={commentOpen}
          comments={comments}
          draft={commentDraft}
          onDraftChange={(text) => onDraftChange(item.id, text)}
          onSubmit={() => onSubmitComment(item.id)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontWeight: '700', fontSize: 15, color: C.text, flexShrink: 1 },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    marginLeft: 'auto',
  },
  metaLocation: { fontSize: 12, color: C.sub, flexShrink: 1 },
  moreBtn: { padding: 4 },
  body: { paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  catchTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  description: { fontSize: 14, color: C.text, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  statItem: { flex: 1, gap: 4 },
  statLabel: { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { fontSize: 14, fontWeight: '700', color: C.text },
  viewComments: { fontSize: 13, color: C.muted, marginTop: 2 },
});
