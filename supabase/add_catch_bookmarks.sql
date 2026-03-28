-- Migration: table catch_bookmarks (posts enregistrés)
-- À exécuter dans l'éditeur SQL Supabase

create table if not exists public.catch_bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  catch_id    uuid not null references public.catches(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, catch_id)
);

-- Index pour requêtes par user_id
create index if not exists catch_bookmarks_user_id_idx on public.catch_bookmarks(user_id);
-- Index pour requêtes par catch_id
create index if not exists catch_bookmarks_catch_id_idx on public.catch_bookmarks(catch_id);

-- RLS
alter table public.catch_bookmarks enable row level security;

-- Lecture : uniquement ses propres enregistrements
create policy "Users can view own bookmarks"
  on public.catch_bookmarks for select
  using (auth.uid() = user_id);

-- Insertion : uniquement pour soi-même
create policy "Users can insert own bookmarks"
  on public.catch_bookmarks for insert
  with check (auth.uid() = user_id);

-- Suppression : uniquement ses propres enregistrements
create policy "Users can delete own bookmarks"
  on public.catch_bookmarks for delete
  using (auth.uid() = user_id);
