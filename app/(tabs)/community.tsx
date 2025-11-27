import React from "react";
import {
  ActivityIndicator,
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
import { ThemedText } from "@/components/ThemedText";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

// Profil minimal pour afficher le nom et l'avatar
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
  species: string | null;
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
  content: string;
  created_at: string;
  catch_id?: string;
  profiles?: Profile | null;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
};

const displayName = (profile?: Profile | null) => {
  if (!profile) return "Pecheur anonyme";
  const parts = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return parts || profile.username || "Pecheur anonyme";
};

const avatarUrlFromProfile = (profile?: Profile | null) => {
  if (!profile) return null;
  if (profile.avatar_url) return profile.avatar_url;
  if (profile.photo_url) return profile.photo_url;
  if (profile.avatar_path) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_path);
    if (data.publicUrl) return data.publicUrl;
  }
  if (profile.photo_path) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(profile.photo_path);
    if (data.publicUrl) return data.publicUrl;
  }
  return null;
};

const catchPhotoUrl = (path?: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from("catch-photos").getPublicUrl(path);
  return data.publicUrl ?? null;
};

export default function CommunityScreen() {
  const { session } = useAuth();
  const [feed, setFeed] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [photoRatios, setPhotoRatios] = React.useState<Record<string, number>>({});
  const [likesById, setLikesById] = React.useState<Record<string, number>>({});
  const [commentsById, setCommentsById] = React.useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = React.useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = React.useState<Record<string, string>>({});
  const [commentOpen, setCommentOpen] = React.useState<Record<string, boolean>>({});
  const [commentsList, setCommentsList] = React.useState<Record<string, CommentRow[]>>({});

  const fetchFeed = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("catches")
        .select(
          "id,user_id,species,region,description,photo_path,caught_at,catch_likes(count),catch_comments(count),profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)"
        )
        .eq("is_public", true)
        .order("caught_at", { ascending: false })
        .limit(50);

      if (dbError) throw dbError;
      const rows = (data as FeedItem[]) ?? [];
      setFeed(rows);
      const nextLikes: Record<string, number> = {};
      const nextComments: Record<string, number> = {};
      const nextList: Record<string, CommentRow[]> = {};
      for (const row of rows) {
        nextLikes[row.id] = row.catch_likes?.[0]?.count ?? 0;
        nextComments[row.id] = row.catch_comments?.[0]?.count ?? 0;
        nextList[row.id] = [];
      }
      setLikesById(nextLikes);
      setCommentsById(nextComments);
      // Charge les derniers commentaires pour tous les posts visibles
      if (rows.length) {
        const ids = rows.map((r) => r.id);
        const { data: fetchedComments, error: commentsError } = await supabase
          .from("catch_comments")
          .select(
            "id,catch_id,content,created_at,profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)"
          )
          .in("catch_id", ids)
          .order("created_at", { ascending: false });
        if (!commentsError && fetchedComments) {
          for (const c of fetchedComments as CommentRow[]) {
            const cid = c.catch_id;
            if (!cid) continue;
            const list = nextList[cid] || [];
            if (list.length < 3) {
              list.push(c);
              nextList[cid] = list;
            }
          }
        }
      }
      setCommentsList(nextList);
      // Récupère les likes de l'utilisateur courant pour savoir quel coeur remplir
      if (session?.user?.id && rows.length) {
        const ids = rows.map((r) => r.id);
        const { data: myLikes } = await supabase
          .from("catch_likes")
          .select("catch_id")
          .eq("user_id", session.user.id)
          .in("catch_id", ids);
        const nextLiked: Record<string, boolean> = {};
        for (const row of myLikes ?? []) {
          if (row?.catch_id) nextLiked[row.catch_id as string] = true;
        }
        setLikedByMe(nextLiked);
      } else {
        setLikedByMe({});
      }
    } catch (e: any) {
      setError(e?.message ?? "Flux indisponible");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchFeed();
  }, [fetchFeed]);

  const toggleLike = React.useCallback(
    async (catchId: string) => {
      if (!session?.user?.id) {
        return;
      }
      const currentlyLiked = likedByMe[catchId] ?? false;
      setLikedByMe((prev) => ({ ...prev, [catchId]: !currentlyLiked }));
      setLikesById((prev) => ({
        ...prev,
        [catchId]: Math.max(0, (prev[catchId] ?? 0) + (currentlyLiked ? -1 : 1)),
      }));
      if (currentlyLiked) {
        await supabase.from("catch_likes").delete().eq("catch_id", catchId).eq("user_id", session.user.id);
      } else {
        await supabase.from("catch_likes").upsert({ catch_id: catchId, user_id: session.user.id });
      }
    },
    [likedByMe, session?.user?.id]
  );

  const submitComment = React.useCallback(
    async (catchId: string) => {
      if (!session?.user?.id) return;
      const draft = (commentDrafts[catchId] || "").trim();
      if (!draft) return;
      setCommentDrafts((prev) => ({ ...prev, [catchId]: "" }));
      const { data, error } = await supabase
        .from("catch_comments")
        .insert({
          catch_id: catchId,
          user_id: session.user.id,
          content: draft,
        })
        .select(
          "id,content,created_at,profiles:profiles (id,username,first_name,last_name,avatar_url,avatar_path,photo_url,photo_path)"
        )
        .single();
      if (!error && data) {
        setCommentsList((prev) => ({
          ...prev,
          [catchId]: [data as CommentRow, ...(prev[catchId] ?? [])].slice(0, 3),
        }));
      }
      setCommentsById((prev) => ({ ...prev, [catchId]: (prev[catchId] ?? 0) + 1 }));
    },
    [commentDrafts, session?.user?.id]
  );

  const renderItem = ({ item }: { item: FeedItem }) => {
    const name = displayName(item.profiles);
    const avatar = avatarUrlFromProfile(item.profiles);
    const photo = catchPhotoUrl(item.photo_path);
    const date = formatDate(item.caught_at);
    const captionPrefix = item.species ? item.species + (item.description ? " — " : "") : "";
    const ratio = photoRatios[item.id] || 4 / 5;
    const liked = likedByMe[item.id] ?? false;
    const likeCount = likesById[item.id] ?? 0;
    const commentCount = commentsById[item.id] ?? 0;
    const commentOpenForItem = commentOpen[item.id] ?? false;
    const draft = commentDrafts[item.id] ?? "";
    const commentItems = commentsList[item.id] ?? [];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.meta}>{date}</Text>
          </View>
          <Pressable hitSlop={10}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#111827" />
          </Pressable>
        </View>
        <View style={styles.photoWrapper}>
          {photo ? (
            <>
              <Image
                source={{ uri: photo }}
                style={[styles.photo, { aspectRatio: ratio }]}
                contentFit="contain"
                onLoad={(event) => {
                  const w = event?.source?.width ?? 0;
                  const h = event?.source?.height ?? 0;
                  if (w > 0 && h > 0) {
                    setPhotoRatios((prev) =>
                      prev[item.id] ? prev : { ...prev, [item.id]: w / h }
                    );
                  }
                }}
              />
              {item.species ? (
                <View style={styles.speciesBadge}>
                  <Text style={styles.speciesText}>{item.species}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={[styles.photo, styles.photoFallback, { aspectRatio: ratio }]}>
              <Text style={styles.photoFallbackText}>Photo en cours</Text>
            </View>
          )}
        </View>
        <View style={styles.actionsRow}>
          <View style={styles.actionsLeft}>
            <Pressable hitSlop={12} onPress={() => toggleLike(item.id)}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={24}
                color={liked ? "#DC2626" : "#111827"}
              />
            </Pressable>
            <Pressable
              hitSlop={12}
              onPress={() =>
                setCommentOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
              }
            >
              <Ionicons name="chatbubble-outline" size={23} color="#111827" />
            </Pressable>
            <Pressable hitSlop={12}>
              <Ionicons name="paper-plane-outline" size={23} color="#111827" />
            </Pressable>
          </View>
          <Pressable hitSlop={12}>
            <Ionicons name="bookmark-outline" size={23} color="#111827" />
          </Pressable>
        </View>
        <View style={styles.countRow}>
          <Text style={styles.countText}>{likeCount} j'aime</Text>
          <Pressable
            hitSlop={6}
            onPress={() =>
              setCommentOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
            }
          >
            <Text style={styles.countText}>{commentCount} commentaires</Text>
          </Pressable>
        </View>
        <View style={styles.body}>
          {item.region ? <Text style={styles.location}>Lieu : {item.region}</Text> : null}
          {item.description ? (
            <Text style={styles.description}>
              <Text style={styles.speciesCaption}>{captionPrefix}</Text>
              {item.description}
            </Text>
          ) : item.species ? (
            <Text style={styles.speciesCaption}>{item.species}</Text>
          ) : null}
          {commentOpenForItem ? (
            <View style={styles.commentBox}>
              <TextInput
                placeholder="Ajouter un commentaire..."
                placeholderTextColor="#9CA3AF"
                value={draft}
                onChangeText={(text) =>
                  setCommentDrafts((prev) => ({ ...prev, [item.id]: text }))
                }
                style={styles.commentInput}
                multiline
              />
              <Pressable
                style={styles.commentSend}
                hitSlop={8}
                onPress={() => submitComment(item.id)}
                disabled={!draft.trim()}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={draft.trim() ? "#2563EB" : "#9CA3AF"}
                />
              </Pressable>
              {commentItems.length ? (
                <View style={styles.commentList}>
                  {commentItems.map((c) => {
                    const cName = displayName(c.profiles);
                    return (
                      <View key={c.id} style={styles.commentRow}>
                        <Text style={styles.commentAuthor}>{cName}</Text>
                        <Text style={styles.commentText}>{c.content}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const keyExtractor = (item: FeedItem) => item.id;

  return (
    <ThemedSafeArea edges={["top"]} style={styles.safeArea}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Communaute</Text>
        <View style={styles.topBarIcons}>
          <Pressable hitSlop={10}>
            <Ionicons name="add-circle-outline" size={24} color="#111827" />
          </Pressable>
          <Pressable hitSlop={10}>
            <Ionicons name="notifications-outline" size={22} color="#111827" />
          </Pressable>
        </View>
      </View>
      <LinearGradient colors={["#FFFFFF", "#F7F9FC"]} style={styles.hero}>
        <ThemedText style={styles.heroTitle} lightColor="#0F172A" darkColor="#FFFFFF">
          Fil public
        </ThemedText>
        <ThemedText style={styles.heroSubtitle} lightColor="#4B5563" darkColor="#E5E7EB">
          Les prises visibles par la communaute, classees par date.
        </ThemedText>
      </LinearGradient>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, feed.length === 0 && styles.emptyContainer]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Rien a montrer pour le moment</Text>
              <Text style={styles.emptySubtitle}>
                Publie ta prochaine prise en la rendant publique pour alimenter le fil.
              </Text>
            </View>
          }
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Impossible de charger le fil</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null
          }
        />
      )}
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  topBarTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  topBarIcons: { flexDirection: "row", gap: 12 },
  hero: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    color: "#4B5563",
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontWeight: "700", color: "#0F172A" },
  userName: { fontWeight: "700", fontSize: 15, color: "#0F172A" },
  meta: { color: "#6B7280", fontSize: 12 },
  photoWrapper: {
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  photo: {
    width: "100%",
    minHeight: 240,
  },
  speciesBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  speciesText: { color: "#FFFFFF", fontWeight: "700" },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoFallbackText: { color: "#6B7280" },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionsLeft: { flexDirection: "row", gap: 14 },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 4,
  },
  countText: { color: "#111827", fontWeight: "600", fontSize: 13 },
  body: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  location: { color: "#1F2937", fontWeight: "600" },
  description: { color: "#374151", lineHeight: 20 },
  speciesCaption: { fontWeight: "700", color: "#111827" },
  commentBox: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },
  commentInput: {
    minHeight: 38,
    color: "#0F172A",
    paddingRight: 32,
  },
  commentSend: {
    position: "absolute",
    right: 10,
    bottom: 8,
  },
  commentList: { marginTop: 8, gap: 6 },
  commentRow: { flexDirection: "row", flexWrap: "wrap" },
  commentAuthor: { fontWeight: "700", color: "#0F172A", marginRight: 6 },
  commentText: { color: "#1F2937", flexShrink: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  emptyState: { alignItems: "center", padding: 32, gap: 8 },
  emptyTitle: { fontWeight: "700", fontSize: 16 },
  emptySubtitle: { textAlign: "center", color: "#6B7280" },
  errorBox: {
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FCA5A5",
    gap: 4,
  },
  errorTitle: { fontWeight: "700", color: "#B91C1C" },
  errorText: { color: "#B91C1C" },
});
