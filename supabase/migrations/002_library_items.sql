create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (
    type in (
      'ayah_insight',
      'surah_note',
      'bookmark',
      'similar_verses',
      'dua',
      'hadith',
      'khutbah',
      'seerah',
      'companion'
    )
  ),
  title text,
  body text,
  surah_number int,
  ayah_start int,
  ayah_end int,
  verse_key text,
  page_number int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.library_items enable row level security;

create policy "Users can read their own library items"
  on public.library_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own library items"
  on public.library_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own library items"
  on public.library_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own library items"
  on public.library_items for delete
  using (auth.uid() = user_id);

drop trigger if exists library_items_set_updated_at on public.library_items;
create trigger library_items_set_updated_at
  before update on public.library_items
  for each row
  execute function public.set_updated_at();

create index if not exists library_items_user_id_type_created_at_idx
  on public.library_items (user_id, type, created_at desc);

create index if not exists library_items_user_id_verse_key_type_idx
  on public.library_items (user_id, verse_key, type);
