import React from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { ThemedSafeArea } from "@/components/SafeArea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { awardLikeGiven, awardLikeReceived } from "@/lib/gamification";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F5F0",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  sub: "#71717A",
  muted: "#A1A1AA",
  border: "#E8E8E3",
  accent: "#2D6A4F",
  accentSoft: "#EBF5F0",
  like: "#DC2626",
  inputBg: "#F0F0EC",
};

// ── Types ────────────────────────────────────────────────────────────────────
type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  photo_url: string | null;
  photo_path: string | null;
};

type FeedItem = {
  id: string;
  user_id: string;
  title: string | null;
  species: string | null;
  weight_kg: number | null;
  length_cm: number | null;
  region: string | null;
  description: string | null;
  photo_path: string | null;
  caught_at: string;
  profiles?: Profile | null;
  catch_likes?: { count: number }[];
  catch_comments?: { count: number }[];
};

type CommentRow = {
  id: string;
  catch_id: string;
  content: string;
  created_at: string;
  profiles?: Profile | null;
};

type ActionBarProps = {
  liked: boolean;
  onToggleLike: () => void;
  onToggleComments: () => void;
};

type CommentSectionProps = {
  isOpen: boolean;
  comments: CommentRow[];
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmit: () => void;
};

type CatchCardProps = {
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

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (value: string | null | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const fixed = Math.round(value * 100) / 100;
  return Number.isInteger(fixed) ? String(fixed) : fixed.toFixed(2).replace(/\.00$/, "");
};

const displayName = (profile?: Profile | null) => {
  if (!profile) return "Pecheur anonyme";
  const parts = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return parts || profile.username || "Pecheur anonyme";
};

const avatarUrlFromProfile = (profile?: Profile | null) => {
  if (!profile) return null;
  if (profile.avatar_url) return profile.avatar_url;
  if (profile.photo_url) return profile.photo_url;
  if (profile.avatar_path) {
    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(profile.avatar_path);
    if (data.publicUrl) return data.publicUrl;
  }
  if (profile.photo_path) {
    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(profile.photo_path);
    if (data.publicUrl) return data.publicUrl;
  }
  return null;
};

const catchPhotoUrl = (path?: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from("catch-photos").getPublicUrl(path);
  return data.publicUrl ?? null;
};

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "maintenant";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}j`;
  return formatDate(date);
};

// ── UI Components ────────────────────────────────────────────────────────────
const UserAvatar: React.FC<{
  profile?: Profile | null;
  name: string;
  size?: number;
}> = ({ profile, name, size = 40 }) => {
  const avatar = avatarUrlFromProfile(profile);
  const dim = { width: size, height: size, borderRadius: size / 2 };

  if (avatar) {
    return (
      <Image
        source={{ uri: avatar }}
        style={[styles.avatar, dim]}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback, dim]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.38 }]}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
};

const SpeciesBadge: React.FC<{ species: string }> = ({ species }) => (
  <View style={styles.speciesBadge}>
    <Ionicons name="fish" size={12} color="#FFFFFF" />
    <Text style={styles.speciesBadgeText}>{species}</Text>
  </View>
);

const CatchPhoto: React.FC<{
  photoUrl: string | null;
  ratio: number;
  species?: string | null;
  onRatio: (r: number) => void;
}> = ({ photoUrl, ratio, species, onRatio }) => (
  <View style={styles.photoWrap}>
    {photoUrl ? (
      <>
        <Image
          source={{ uri: photoUrl }}
          style={[styles.photo, { aspectRatio: ratio }]}
          contentFit="cover"
          onLoad={(e) => {
            const w = e?.source?.width ?? 0;
            const h = e?.source?.height ?? 0;
            if (w > 0 && h > 0) onRatio(w / h);
          }}
        />
        {species && (
          <>
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.3)"]}
              style={styles.photoFade}
            />
            <View style={styles.photoOverlay}>
              <SpeciesBadge species={species} />
            </View>
          </>
        )}
      </>
    ) : (
      <View style={[styles.photo, styles.photoEmpty, { aspectRatio: ratio }]}>
        <Ionicons name="image-outline" size={40} color={C.muted} />
      </View>
    )}
  </View>
);

const ActionButton: React.FC<{
  icon: string;
  activeIcon?: string;
  isActive?: boolean;
  activeColor?: string;
  onPress?: () => void;
  size?: number;
}> = ({
  icon,
  activeIcon,
  isActive,
  activeColor = C.like,
  onPress,
  size = 24,
}) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={12}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={(isActive && activeIcon ? activeIcon : icon) as any}
          size={size}
          color={isActive ? activeColor : C.sub}
        />
      </Animated.View>
    </Pressable>
  );
};

const ActionBar: React.FC<
  ActionBarProps & { likeCount: number; commentCount: number }
> = ({ liked, onToggleLike, onToggleComments, likeCount, commentCount }) => (
  <View style={styles.actions}>
    <View style={styles.actionsLeft}>
      <View style={styles.actionItem}>
        <ActionButton
          icon="heart-outline"
          activeIcon="heart"
          isActive={liked}
          onPress={onToggleLike}
        />
        {likeCount > 0 && (
          <Text
            style={[styles.actionCount, liked && styles.actionCountLiked]}
          >
            {likeCount}
          </Text>
        )}
      </View>
      <View style={styles.actionItem}>
        <ActionButton icon="chatbubble-outline" onPress={onToggleComments} />
        {commentCount > 0 && (
          <Text style={styles.actionCount}>{commentCount}</Text>
        )}
      </View>
      <ActionButton icon="paper-plane-outline" />
    </View>
    <ActionButton icon="bookmark-outline" activeIcon="bookmark" />
  </View>
);

const CommentSection: React.FC<CommentSectionProps> = ({
  isOpen,
  comments,
  draft,
  onDraftChange,
  onSubmit,
}) => {
  if (!isOpen) return null;
  return (
    <View style={styles.commentBox}>
      {comments.length > 0 && (
        <View style={styles.commentList}>
          {comments.map((c) => {
            const cName = displayName(c.profiles);
            const timeAgo = formatTimeAgo(c.created_at);
            return (
              <View key={c.id} style={styles.commentRow}>
                <UserAvatar profile={c.profiles} name={cName} size={28} />
                <View style={styles.commentContent}>
                  <Text style={styles.commentLine}>
                    <Text style={styles.commentAuthor}>{cName} </Text>
                    {c.content}
                  </Text>
                  <Text style={styles.commentTime}>{timeAgo}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <View style={styles.commentInputWrap}>
        <TextInput
          placeholder="Ajouter un commentaire..."
          placeholderTextColor={C.muted}
          value={draft}
          onChangeText={onDraftChange}
          style={styles.commentInput}
          multiline
        />
        <Pressable
          style={[styles.commentSend, draft.trim() && styles.commentSendActive]}
          hitSlop={8}
          onPress={onSubmit}
          disabled={!draft.trim()}
        >
          <Ionicons
            name="arrow-up"
            size={16}
            color={draft.trim() ? "#FFFFFF" : C.muted}
          />
        </Pressable>
      </View>
    </View>
  );
};

const CatchCard: React.FC<CatchCardProps> = React.memo(
  ({
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
  }) => {
    const name = displayName(item.profiles);
    const photo = catchPhotoUrl(item.photo_path);
    const timeAgo = formatTimeAgo(item.caught_at);
    const title = item.title?.trim();
    const location = item.region?.trim() || "Lieu non precise";
    const species = item.species?.trim() || "—";
    const lengthLabel = formatNumber(item.length_cm) ? `${formatNumber(item.length_cm)} cm` : "—";
    const weightLabel = formatNumber(item.weight_kg) ? `${formatNumber(item.weight_kg)} kg` : "—";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <UserAvatar profile={item.profiles} name={name} size={42} />
          <View style={styles.cardHeaderInfo}>
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

        <View style={styles.body}>
          {title ? <Text style={styles.catchTitle}>{title}</Text> : null}
          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}

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

        <CatchPhoto
          photoUrl={photo}
          ratio={photoRatio}
          species={null}
          onRatio={(r) => onPhotoRatio(item.id, r)}
        />

        <ActionBar
          liked={liked}
          likeCount={likeCount}
          commentCount={commentCount}
          onToggleLike={() => onToggleLike(item.id)}
          onToggleComments={() => onToggleComments(item.id)}
        />

        <View style={styles.body}>
          {commentCount > 0 && !commentOpen && (
            <Pressable onPress={() => onToggleComments(item.id)}>
              <Text style={styles.viewComments}>
                Voir les {commentCount} commentaire
                {commentCount > 1 ? "s" : ""}
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
  }
);

// ── Screen ───────────────────────────────────────────────────────────────────
export default function CommunityScreen() {
  const { session } = useAuth();
  const [feed, setFeed] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [photoRatios, setPhotoRatios] = React.useState<
    Record<string, number>
  >({});
  const [likesById, setLikesById] = React.useState<Record<string, number>>(
    {}
  );
  const [commentsById, setCommentsById] = React.useState<
    Record<string, number>
  >({});
  const [likedByMe, setLikedByMe] = React.useState<Record<string, boolean>>(
    {}
  );
  const [commentDrafts, setCommentDrafts] = React.useState<
    Record<string, string>
  >({});
  const [commentOpen, setCommentOpen] = React.useState<
    Record<string, boolean>
  >({});
  const [commentsList, setCommentsList] = React.useState<
    Record<string, CommentRow[]>
  >({});

  const ownerByCatch = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of feed) {
      if (item.id && item.user_id) map[item.id] = item.user_id;
    }
    return map;
  }, [feed]);

  const loadComments = React.useCallback(async (ids: string[]) => {
    if (!ids.length) return {} as Record<string, CommentRow[]>;
    const next: Record<string, CommentRow[]> = {};
    const { data, error: cError } = await supabase
      .from("catch_comments")
      .select(
        "id,catch_id,content,created_at,profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)"
      )
      .in("catch_id", ids)
      .order("created_at", { ascending: false });
    if (cError) return {};
    for (const row of (data as CommentRow[]) ?? []) {
      const cid = row.catch_id;
      if (!cid) continue;
      const list = next[cid] ?? [];
      if (list.length < 3) list.push(row);
      next[cid] = list;
    }
    return next;
  }, []);

  const loadMyLikes = React.useCallback(
    async (ids: string[]) => {
      if (!session?.user?.id || !ids.length)
        return {} as Record<string, boolean>;
      const { data } = await supabase
        .from("catch_likes")
        .select("catch_id")
        .eq("user_id", session.user.id)
        .in("catch_id", ids);
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) {
        const cid = (row as any)?.catch_id;
        if (cid) map[cid] = true;
      }
      return map;
    },
    [session?.user?.id]
  );

  const fetchFeed = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("catches")
        .select(
          "id,user_id,title,species,weight_kg,length_cm,region,description,photo_path,caught_at,catch_likes(count),catch_comments(count),profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)"
        )
        .eq("is_public", true)
        .order("caught_at", { ascending: false })
        .limit(50);

      if (dbError) throw dbError;
      const rows = (data as FeedItem[]) ?? [];
      setFeed(rows);

      const nextLikes: Record<string, number> = {};
      const nextComments: Record<string, number> = {};
      for (const row of rows) {
        nextLikes[row.id] = row.catch_likes?.[0]?.count ?? 0;
        nextComments[row.id] = row.catch_comments?.[0]?.count ?? 0;
      }
      setLikesById(nextLikes);
      setCommentsById(nextComments);

      const ids = rows.map((r) => r.id);
      const [commentMap, likedMap] = await Promise.all([
        loadComments(ids),
        loadMyLikes(ids),
      ]);
      setCommentsList(commentMap);
      setLikedByMe(likedMap);
    } catch (e: any) {
      setError(e?.message ?? "Flux indisponible");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadComments, loadMyLikes]);

  React.useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchFeed();
  }, [fetchFeed]);

  const toggleLike = React.useCallback(
    async (catchId: string) => {
      if (!session?.user?.id) return;
      const currentlyLiked = likedByMe[catchId] ?? false;
      setLikedByMe((prev) => ({ ...prev, [catchId]: !currentlyLiked }));
      setLikesById((prev) => ({
        ...prev,
        [catchId]: Math.max(
          0,
          (prev[catchId] ?? 0) + (currentlyLiked ? -1 : 1)
        ),
      }));
      if (currentlyLiked) {
        await supabase
          .from("catch_likes")
          .delete()
          .eq("catch_id", catchId)
          .eq("user_id", session.user.id);
      } else {
        await supabase
          .from("catch_likes")
          .upsert({ catch_id: catchId, user_id: session.user.id });
        awardLikeGiven(session, catchId).catch(() => {});
        const ownerId = ownerByCatch[catchId];
        if (ownerId && ownerId !== session.user.id) {
          awardLikeReceived(ownerId, catchId).catch(() => {});
        }
      }
    },
    [likedByMe, ownerByCatch, session]
  );

  const submitComment = React.useCallback(
    async (catchId: string) => {
      if (!session?.user?.id) return;
      const draft = (commentDrafts[catchId] || "").trim();
      if (!draft) return;
      setCommentDrafts((prev) => ({ ...prev, [catchId]: "" }));
      const { data, error: insertError } = await supabase
        .from("catch_comments")
        .insert({
          catch_id: catchId,
          user_id: session.user.id,
          content: draft,
        })
        .select(
          "id,catch_id,content,created_at,profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)"
        )
        .single();
      if (!insertError && data) {
        setCommentsList((prev) => {
          const list = prev[catchId] ? [...prev[catchId]] : [];
          list.unshift(data as CommentRow);
          return { ...prev, [catchId]: list.slice(0, 3) };
        });
        setCommentsById((prev) => ({
          ...prev,
          [catchId]: (prev[catchId] ?? 0) + 1,
        }));
      }
    },
    [commentDrafts, session?.user?.id]
  );

  const onPhotoRatio = React.useCallback((id: string, ratio: number) => {
    setPhotoRatios((prev) => (prev[id] ? prev : { ...prev, [id]: ratio }));
  }, []);

  const onToggleComments = React.useCallback((id: string) => {
    setCommentOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const renderItem = React.useCallback(
    ({ item }: { item: FeedItem }) => (
      <CatchCard
        item={item}
        likeCount={likesById[item.id] ?? 0}
        commentCount={commentsById[item.id] ?? 0}
        liked={likedByMe[item.id] ?? false}
        photoRatio={photoRatios[item.id] ?? 4 / 5}
        comments={commentsList[item.id] ?? []}
        commentDraft={commentDrafts[item.id] ?? ""}
        commentOpen={commentOpen[item.id] ?? false}
        onToggleLike={toggleLike}
        onToggleComments={onToggleComments}
        onSubmitComment={submitComment}
        onDraftChange={(cid, text) =>
          setCommentDrafts((prev) => ({ ...prev, [cid]: text }))
        }
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
      onPhotoRatio,
    ]
  );

  const keyExtractor = React.useCallback((item: FeedItem) => item.id, []);

  return (
    <ThemedSafeArea edges={["top"]} style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communaute</Text>
        <View style={styles.headerIcons}>
          <Pressable style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="add-circle-outline" size={24} color={C.text} />
          </Pressable>
          <Pressable style={styles.headerBtn} hitSlop={8}>
            <View>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={C.text}
              />
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
            <Text style={styles.retryText}>Reessayer</Text>
          </Pressable>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            feed.length === 0 && styles.emptyContainer,
          ]}
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
              <Text style={styles.emptyTitle}>
                Aucune prise pour le moment
              </Text>
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

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.8,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  notifDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.like,
    borderWidth: 1.5,
    borderColor: C.surface,
  },

  // Feed
  list: {
    padding: 16,
    gap: 16,
  },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontWeight: "700",
    fontSize: 15,
    color: C.text,
    flexShrink: 1,
  },
  meta: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    marginLeft: "auto",
  },
  metaLocation: {
    fontSize: 12,
    color: C.sub,
    flexShrink: 1,
  },
  moreBtn: {
    padding: 4,
  },

  // Avatar
  avatar: {
    backgroundColor: C.border,
  },
  avatarFallback: {
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Photo
  photoWrap: {
    position: "relative",
    backgroundColor: C.inputBg,
  },
  photo: {
    width: "100%",
    minHeight: 260,
  },
  photoFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  photoOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
  },
  speciesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  speciesBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  photoEmpty: {
    backgroundColor: C.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },

  // Actions
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: "600",
    color: C.sub,
  },
  actionCountLiked: {
    color: C.like,
  },

  // Body
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  catchTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
  description: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  statItem: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  viewComments: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },

  // Comments
  commentBox: {
    marginTop: 10,
    gap: 10,
  },
  commentList: {
    gap: 8,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  commentContent: {
    flex: 1,
    gap: 2,
  },
  commentLine: {
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
  },
  commentAuthor: {
    fontWeight: "700",
  },
  commentTime: {
    fontSize: 11,
    color: C.muted,
  },
  commentInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    fontSize: 14,
    color: C.text,
    paddingRight: 8,
  },
  commentSend: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.border,
  },
  commentSendActive: {
    backgroundColor: C.accent,
  },

  // States
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: C.sub,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.sub,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#991B1B",
  },
  retryBtn: {
    backgroundColor: C.like,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
});
