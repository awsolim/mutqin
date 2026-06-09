alter table public.similar_verse_highlights
  drop constraint if exists similar_verse_highlights_type_check;

alter table public.similar_verse_highlights
  add constraint similar_verse_highlights_type_check
  check (length(trim(type)) > 0);
