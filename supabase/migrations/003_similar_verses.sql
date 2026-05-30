create table if not exists public.similar_verse_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  family_title text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.similar_verse_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.similar_verse_sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  surah_number int not null,
  ayah_number int not null,
  verse_key text not null,
  page_number int,
  sort_order int not null default 0,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.similar_verse_highlights (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.similar_verse_sets(id) on delete cascade,
  item_id uuid not null references public.similar_verse_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_key text not null,
  start_word_position int not null,
  end_word_position int not null,
  type text not null check (
    type in (
      'universal_shared',
      'partial_shared',
      'identity_marker',
      'outlier',
      'ending_family',
      'ending_outlier',
      'memory_clue'
    )
  ),
  label text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.similar_verse_sets enable row level security;
alter table public.similar_verse_items enable row level security;
alter table public.similar_verse_highlights enable row level security;

alter table public.similar_verse_sets
  add column if not exists family_title text;

alter table public.similar_verse_items
  add column if not exists role text;

alter table public.similar_verse_highlights
  add column if not exists label text;

alter table public.similar_verse_highlights
  drop constraint if exists similar_verse_highlights_type_check;

update public.similar_verse_highlights
set type = case
  when type = 'same' then 'universal_shared'
  when type = 'difference' then 'identity_marker'
  when type = 'memory' then 'memory_clue'
  else type
end;

alter table public.similar_verse_highlights
  add constraint similar_verse_highlights_type_check
  check (
    type in (
      'universal_shared',
      'partial_shared',
      'identity_marker',
      'outlier',
      'ending_family',
      'ending_outlier',
      'memory_clue'
    )
  );

create policy "Users can read their own similar verse sets"
  on public.similar_verse_sets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own similar verse sets"
  on public.similar_verse_sets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own similar verse sets"
  on public.similar_verse_sets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own similar verse sets"
  on public.similar_verse_sets for delete
  using (auth.uid() = user_id);

create policy "Users can read their own similar verse items"
  on public.similar_verse_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own similar verse items"
  on public.similar_verse_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own similar verse items"
  on public.similar_verse_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own similar verse items"
  on public.similar_verse_items for delete
  using (auth.uid() = user_id);

create policy "Users can read their own similar verse highlights"
  on public.similar_verse_highlights for select
  using (auth.uid() = user_id);

create policy "Users can insert their own similar verse highlights"
  on public.similar_verse_highlights for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own similar verse highlights"
  on public.similar_verse_highlights for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own similar verse highlights"
  on public.similar_verse_highlights for delete
  using (auth.uid() = user_id);

drop trigger if exists similar_verse_sets_set_updated_at on public.similar_verse_sets;
create trigger similar_verse_sets_set_updated_at
  before update on public.similar_verse_sets
  for each row
  execute function public.set_updated_at();

create index if not exists similar_verse_sets_user_id_updated_at_idx
  on public.similar_verse_sets (user_id, updated_at desc);

create index if not exists similar_verse_items_set_id_sort_order_idx
  on public.similar_verse_items (set_id, sort_order);

create index if not exists similar_verse_items_user_id_verse_key_idx
  on public.similar_verse_items (user_id, verse_key);

create index if not exists similar_verse_items_user_id_page_number_idx
  on public.similar_verse_items (user_id, page_number);

create index if not exists similar_verse_highlights_set_id_item_id_idx
  on public.similar_verse_highlights (set_id, item_id);
