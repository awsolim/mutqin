# User Library Boundary

This folder marks Mutqin's user-specific data boundary.

Supabase-backed user data lives in the existing `lib/library`, `lib/notes`, and
`lib/similar-verses` modules. Those modules store only user-authored or
user-selected data such as bookmarks, ayah insights, notes, and mutashabihat
records.

Static Qur'an, translation, tafsir, and i'rab content must stay in generated
local data modules and must not be stored in Supabase.
