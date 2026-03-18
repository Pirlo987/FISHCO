export type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  photo_url: string | null;
  photo_path: string | null;
};

export type FeedItem = {
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

export type CommentRow = {
  id: string;
  catch_id: string;
  content: string;
  created_at: string;
  profiles?: Profile | null;
};
